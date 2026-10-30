"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { canAccessRoute } from "@/src/lib/permissions";
import { env } from "@/src/config/env";
import { getTour, TOURS } from "@/src/lib/tours/registry";
import {
  readTourProgress,
  writeTourProgress,
  type TourProgress,
  type TourStorageScope,
} from "@/src/lib/tours/storage";
import {
  clickableWithin,
  firstRowWithin,
  isDisabledControl,
  pressLikeAUser,
  isInsideTourUi,
  isSelectedControl,
  isVisible,
  pathMatches,
  resolveBase,
  resolveStepTarget,
  samePath,
  stepHasTarget,
  topDialog,
} from "@/src/lib/tours/dom";
import type { Tour, TourStep } from "@/src/lib/tours/types";
import { useAppSelector } from "@/src/store/hooks";
import { useEcommerceWorkspaceNavVisible } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { useDigitalMetalsWorkspaceNavVisible } from "@/src/features/digital-metals/digital-metals-admin-shared";
import { TourOverlay, type TourPhase } from "./tour-overlay";

/** How long to wait for a step's element before giving up (ms). */
const LOCATE_TIMEOUT_MS = 9000;
const OPTIONAL_LOCATE_TIMEOUT_MS = 1600;
/** Menu links render with the shell, so a missing one (collapsed group, phone menu) is skipped fast. */
const NAV_LOCATE_TIMEOUT_MS = 450;
/** A target that vanishes this long (dialog closed, page changed) counts as gone. */
const LOST_GRACE_MS = 700;

export type TourStartSource = "sidekick" | "menu" | "welcome" | "checklist";

type TourContextValue = {
  /** Tours this user can run (permission-filtered). */
  tours: Tour[];
  activeTourId: string | null;
  progress: TourProgress;
  start: (id: string, source?: TourStartSource) => boolean;
  stop: () => void;
  canRun: (id: string) => boolean;
  markWelcomeSeen: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

/** Tour controls; safe to call outside the provider (returns inert stubs). */
export function useTours(): TourContextValue {
  return (
    useContext(TourContext) ?? {
      tours: [],
      activeTourId: null,
      progress: { welcomeSeen: true, completed: {} },
      start: () => false,
      stop: () => undefined,
      canRun: () => false,
      markWelcomeSeen: () => undefined,
    }
  );
}

type Run = { tourId: string; index: number; source: TourStartSource };

function isNavStep(step: TourStep) {
  return Boolean(step.target?.startsWith("nav:"));
}

/**
 * First step to show from `index`: "click this menu item" steps are skipped when
 * the user is already on the page they would open.
 */
function resolveIndex(tour: Tour, index: number, pathname: string) {
  // Already on the page a "pick a row" step leads to (e.g. a customer is open)?
  // Start right after it instead of sending the user back to the list.
  const pick = tour.steps.findIndex((s, j) => j >= index && typeof s.advance === "object");
  if (pick >= 0) {
    const pickStep = tour.steps[pick]!;
    const before = tour.steps.slice(index, pick);
    const onlyGettingThere = before.every((s) => isNavStep(s) || (s.route && !s.target?.startsWith("@dialog")));
    if (
      onlyGettingThere &&
      typeof pickStep.advance === "object" &&
      pathMatches(pathname, pickStep.advance.route) &&
      pick < tour.steps.length - 1
    ) {
      return pick + 1;
    }
  }
  let i = index;
  while (i < tour.steps.length - 1) {
    const step = tour.steps[i]!;
    if (!isNavStep(step)) break;
    const href = step.target!.slice(4);
    const nextRoute = tour.steps.slice(i + 1).find((s) => s.route)?.route;
    if (!samePath(pathname, href) && !(nextRoute && samePath(pathname, nextRoute))) break;
    i += 1;
  }
  return i;
}

function isActionStep(step: TourStep | undefined) {
  return Boolean(step && step.advance && step.advance !== "next");
}

export function TourProvider({
  children,
  onTourStart,
}: {
  children: React.ReactNode;
  /** Lets the shell make room (e.g. close the full-screen Sidekick on phones). */
  onTourStart?: (tour: Tour, source: TourStartSource) => void;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const session = useAppSelector((s) => s.session.session);
  const user = session?.user;
  const scope = useMemo<TourStorageScope | null>(
    () => (session ? { tenantId: session.tenant.id, userId: session.user.id } : null),
    [session],
  );

  // Progress belongs to one tenant + user; switching accounts re-reads it.
  const scopeKey = scope ? `${scope.tenantId}:${scope.userId}` : "";
  const [stored, setStored] = useState(() => ({ key: scopeKey, value: readTourProgress(scope) }));
  const progress = stored.key === scopeKey ? stored.value : readTourProgress(scope);

  const updateProgress = useCallback(
    (fn: (prev: TourProgress) => TourProgress) => {
      setStored((prev) => {
        const base = prev.key === scopeKey ? prev.value : readTourProgress(scope);
        const next = fn(base);
        writeTourProgress(scope, next);
        return { key: scopeKey, value: next };
      });
    },
    [scope, scopeKey],
  );

  // Store and Digi Gold guides only for shops that have those workspaces.
  const { showEcommerceNav } = useEcommerceWorkspaceNavVisible();
  const { showDigitalMetalsNav } = useDigitalMetalsWorkspaceNavVisible();
  const allowed = useCallback(
    (tour: Tour) =>
      canAccessRoute(tour.startRoute, user) &&
      (tour.module !== "ecommerce" || showEcommerceNav) &&
      (tour.module !== "digitalMetals" || showDigitalMetalsNav),
    [user, showEcommerceNav, showDigitalMetalsNav],
  );
  const canRun = useCallback(
    (id: string) => {
      const tour = getTour(id);
      return Boolean(tour && allowed(tour));
    },
    [allowed],
  );
  const tours = useMemo(() => TOURS.filter(allowed), [allowed]);

  /* ------------------------------- run state ------------------------------- */

  const [run, setRun] = useState<Run | null>(null);
  const [phase, setPhase] = useState<TourPhase>("locating");
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const tour = run ? getTour(run.tourId) ?? null : null;
  const step = tour && run ? tour.steps[run.index] ?? null : null;

  // Remember whether the latest pointer-down was on tour UI, so dialogs it points
  // into don't treat a click on Next as "clicked outside" (see components/ui/dialog).
  useEffect(() => {
    const root = document.documentElement;
    const mark = (event: PointerEvent) => {
      root.dataset.tourPointer = isInsideTourUi(event.target) ? "1" : "0";
    };
    document.addEventListener("pointerdown", mark, true);
    return () => {
      document.removeEventListener("pointerdown", mark, true);
      delete root.dataset.tourPointer;
    };
  }, []);

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const onTourStartRef = useRef(onTourStart);
  useEffect(() => {
    onTourStartRef.current = onTourStart;
  }, [onTourStart]);

  const stop = useCallback(() => {
    setRun(null);
    setTarget(null);
  }, []);

  const finish = useCallback(() => {
    if (!tour) return stop();
    updateProgress((prev) => ({
      welcomeSeen: prev.welcomeSeen || tour.id === "welcome",
      completed: { ...prev.completed, [tour.id]: new Date().toISOString() },
    }));
    if (tour.id !== "welcome") {
      toast.success("Guide finished", {
        description: `${tour.title} — ask Sidekick any time you need it again.`,
      });
    }
    stop();
  }, [tour, stop, updateProgress]);

  const goTo = useCallback(
    (index: number) => {
      setRun((prev) => {
        if (!prev) return prev;
        const t = getTour(prev.tourId);
        if (!t) return null;
        if (index >= t.steps.length) return prev; // finish() handles the end
        return { ...prev, index: resolveIndex(t, Math.max(0, index), pathnameRef.current) };
      });
      setTarget(null);
      setPhase("locating");
    },
    [],
  );

  const next = useCallback(() => {
    if (!tour || !run) return;
    if (run.index >= tour.steps.length - 1) finish();
    else goTo(run.index + 1);
  }, [tour, run, finish, goTo]);

  // "Go back to open the form" — but if we keep bouncing there (the form won't open,
  // or the user skipped it) show the can't-find card instead of looping.
  const bounce = useRef<{ id: string; times: number[] }>({ id: "", times: [] });
  const goToStepId = useCallback(
    (id: string) => {
      if (!tour) return;
      const idx = tour.steps.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const now = Date.now();
      const b = bounce.current;
      b.times = (b.id === id ? b.times : []).filter((t) => now - t < 20_000);
      b.id = id;
      b.times.push(now);
      if (b.times.length > 2) {
        setPhase("missing");
        return;
      }
      goTo(idx);
    },
    [tour, goTo],
  );

  const retry = useCallback(() => {
    setTarget(null);
    setPhase("locating");
    setRetryNonce((n) => n + 1);
  }, []);

  const start = useCallback(
    (id: string, source: TourStartSource = "menu") => {
      const t = getTour(id);
      if (!t || !allowed(t)) return false;
      if (id === "welcome") updateProgress((prev) => ({ ...prev, welcomeSeen: true }));
      onTourStartRef.current?.(t, source);
      setTarget(null);
      setPhase("locating");
      setRun({ tourId: id, index: resolveIndex(t, 0, pathnameRef.current), source });
      return true;
    },
    [allowed, updateProgress],
  );

  const markWelcomeSeen = useCallback(() => {
    updateProgress((prev) => ({ ...prev, welcomeSeen: true }));
  }, [updateProgress]);

  /* ------------------------- step entry: route + locate ------------------------- */

  const navigatedFor = useRef<string | null>(null);
  const stepKey = run ? `${run.tourId}:${run.index}:${retryNonce}` : null;

  useEffect(() => {
    if (!run || !tour || !step) return;
    const key = `${run.tourId}:${run.index}:${retryNonce}`;

    // The user just did what this step asked (e.g. opened a customer) — the
    // advance effect moves on; don't navigate back to the step's page.
    if (typeof step.advance === "object" && pathMatches(pathname, step.advance.route)) return;

    if (step.route && !samePath(pathname, step.route)) {
      if (navigatedFor.current !== key) {
        navigatedFor.current = key;
        router.push(step.route);
      }
      return; // re-runs when pathname changes
    }

    // Centred steps (no target) are shown straight away — see `effectivePhase`.
    if (!stepHasTarget(step)) return;

    const startedAt = Date.now();
    const timeout = isNavStep(step)
      ? NAV_LOCATE_TIMEOUT_MS
      : step.optional
        ? OPTIONAL_LOCATE_TIMEOUT_MS
        : LOCATE_TIMEOUT_MS;
    let cancelled = false;
    let scrolled = false;
    const timer = window.setInterval(() => {
      if (cancelled) return;
      const el = resolveStepTarget(step);
      if (el) {
        window.clearInterval(timer);
        if (!scrolled) {
          scrolled = true;
          const r = el.getBoundingClientRect();
          const offscreen = r.top < 90 || r.bottom > window.innerHeight - 40;
          if (offscreen) el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        setTarget(el);
        setPhase("showing");
        return;
      }
      if (Date.now() - startedAt > timeout) {
        window.clearInterval(timer);
        if (step.optional) next(); // finishes the guide when it was the last step
        else if (step.backTo && resolveBase(step.target) == null) goToStepId(step.backTo);
        else setPhase("missing");
      }
    }, 120);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by step + pathname
  }, [stepKey, pathname]);

  /* ---------------- keep the target alive (re-render, dialog closed) ---------------- */

  useEffect(() => {
    if (phase !== "showing" || !target || !step || !run) return;
    let lostSince: number | null = null;
    const timer = window.setInterval(() => {
      if (target.isConnected && isVisible(target)) {
        lostSince = null;
        return;
      }
      const again = resolveStepTarget(step);
      if (again) {
        lostSince = null;
        setTarget(again);
        return;
      }
      lostSince ??= Date.now();
      if (Date.now() - lostSince < LOST_GRACE_MS) return;
      window.clearInterval(timer);
      // Click steps whose element vanished usually mean the click worked (page changed).
      if (step.advance === "click" || step.advance === "selected") next();
      else if (step.backTo) goToStepId(step.backTo);
      else retry();
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase, target, step, run, next, goToStepId, retry]);

  /* ----------------------------- advance triggers ----------------------------- */

  useEffect(() => {
    if (phase !== "showing" || !target || (step?.advance !== "click" && step?.advance !== "selected")) return;
    let timer: number | undefined;
    const advance = () => {
      if (timer) return;
      timer = window.setTimeout(() => next(), 280);
    };
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Node && target.contains(event.target)) advance();
    };
    document.addEventListener("click", onClick, true);
    // "selected": the user reached this tab / step another way (e.g. Continue).
    let poll: number | undefined;
    if (step.advance === "selected") {
      let wasSelected = isSelectedControl(target);
      poll = window.setInterval(() => {
        const now = isSelectedControl(target);
        if (now && !wasSelected) advance();
        wasSelected = now;
      }, 150);
    }
    return () => {
      document.removeEventListener("click", onClick, true);
      if (poll) window.clearInterval(poll);
      if (timer) window.clearTimeout(timer);
    };
  }, [phase, target, step, next]);

  useEffect(() => {
    if (!step || typeof step.advance !== "object") return;
    if (!pathMatches(pathname, step.advance.route)) return;
    const timer = window.setTimeout(next, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, step, next]);

  // Leaving the admin area (sign-out, login redirect) ends the tour.
  useEffect(() => {
    if (!run || !pathname.startsWith("/login")) return;
    const timer = window.setTimeout(stop, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, run, stop]);

  /* ------------------------------- button actions ------------------------------- */

  const primary = useCallback(() => {
    if (!step) return;
    if ((step.advance === "click" || step.advance === "selected") && target) {
      const el = clickableWithin(target);
      if (!isDisabledControl(el)) {
        pressLikeAUser(el);
        return; // the click listener advances
      }
      next();
      return;
    }
    if (typeof step.advance === "object" && target) {
      const row = target.matches("a[href], button") ? target : firstRowWithin(target);
      if (row) {
        pressLikeAUser(row);
        return;
      }
    }
    next();
  }, [step, target, next]);

  const back = useCallback(() => {
    if (!run || !tour) return;
    let i = run.index - 1;
    // Skip auto-skipped menu steps when walking back.
    while (i > 0 && isNavStep(tour.steps[i]!) && tour.steps[i]!.optional) i -= 1;
    goTo(i);
  }, [run, tour, goTo]);

  const canGoBack = Boolean(
    run && tour && run.index > 0 && !isActionStep(tour.steps[run.index - 1]),
  );

  const primaryRef = useRef(primary);
  const canGoBackRef = useRef(canGoBack);
  useEffect(() => {
    primaryRef.current = primary;
    canGoBackRef.current = canGoBack;
  }, [primary, canGoBack]);

  // Keyboard: → next, ← back, Esc ends the guide (when no dialog would catch it).
  useEffect(() => {
    if (!run) return;
    const onKey = (event: KeyboardEvent) => {
      const el = event.target;
      if (el instanceof HTMLElement && el.closest("input, textarea, select, [contenteditable='true'], [role='listbox'], [role='menu'], [role='tablist'], [role='radiogroup'], [role='slider'], [role='grid']")) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowRight" && phase === "showing") {
        event.preventDefault();
        primaryRef.current();
      } else if (event.key === "ArrowLeft" && canGoBackRef.current) {
        event.preventDefault();
        back();
      } else if (event.key === "Escape" && !topDialog()) {
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, phase, back, stop]);


  // Demo / mock mode only: lets automated checks start any guide (see scripts/check-guides.cjs).
  useEffect(() => {
    if (!env.useMocks) return;
    const w = window as Window & { __swarnaGuides?: unknown };
    w.__swarnaGuides = { ids: TOURS.map((t) => t.id), start: (id: string) => start(id, "menu"), stop };
    return () => {
      delete w.__swarnaGuides;
    };
  }, [start, stop]);

  const value = useMemo<TourContextValue>(
    () => ({
      tours,
      activeTourId: run?.tourId ?? null,
      progress,
      start,
      stop,
      canRun,
      markWelcomeSeen,
    }),
    [tours, run?.tourId, progress, start, stop, canRun, markWelcomeSeen],
  );

  const visibleSteps = tour?.steps.length ?? 0;

  return (
    <TourContext.Provider value={value}>
      {children}
      {tour && step && run ? (
        <TourOverlay
          key={tour.id}
          tour={tour}
          step={step}
          index={run.index}
          total={visibleSteps}
          phase={stepHasTarget(step) ? phase : "showing"}
          target={target}
          canGoBack={canGoBack}
          onPrimary={primary}
          onBack={back}
          onSkipStep={() => next()}
          onRetry={retry}
          onClose={stop}
        />
      ) : null}
    </TourContext.Provider>
  );
}
