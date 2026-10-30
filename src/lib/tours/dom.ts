import type { TourStep } from "./types";

/** Attribute that marks tour UI so dialogs don't treat clicks on it as "outside". */
export const TOUR_UI_ATTR = "data-tour-ui";

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}

function normalise(text: string | null | undefined) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True when the element takes up space on screen (not display:none / collapsed). */
export function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

/** The visible element with this `data-tour` id (several can exist, e.g. desktop + mobile menus). */
export function findTourElement(id: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    `[data-tour="${cssEscape(id)}"]`,
  );
  for (const node of nodes) if (isVisible(node)) return node;
  return null;
}

/**
 * Inside `container`, the form field whose `<FieldLabel>` text starts with
 * `label`. Returns the field's wrapper (the label's parent) so the spotlight
 * covers label, input and hint together.
 */
export function findField(
  container: HTMLElement,
  label: string,
): HTMLElement | null {
  const wanted = normalise(label);
  const labels = container.querySelectorAll<HTMLElement>(
    "label, [data-field-label]",
  );
  for (const node of labels) {
    if (isForeign(node) || !normalise(node.textContent).startsWith(wanted)) continue;
    const wrapper = node.closest<HTMLElement>("[data-field-row]") ?? node.parentElement;
    if (wrapper && isVisible(wrapper)) return wrapper;
  }
  return null;
}

const SIDEKICK = 'aside[aria-label="Sidekick assistant"]';

/** Tour UI and toasts are never tour targets; the Sidekick column only when a step asks for it. */
function isForeign(el: Element, root?: Element | Document) {
  if (el.closest(`[${TOUR_UI_ATTR}], [data-sonner-toaster]`)) return true;
  const inSidekickRoot = root instanceof Element && Boolean(root.closest(SIDEKICK));
  return !inSidekickRoot && Boolean(el.closest(SIDEKICK));
}

function mainArea(): HTMLElement {
  return document.querySelector<HTMLElement>("main") ?? document.body;
}

/** The top-most open dialog or side sheet (dialogs are portaled outside <main>). */
export function topDialog(): HTMLElement | null {
  const nodes = [
    ...document.querySelectorAll<HTMLElement>("[role='dialog'], [role='alertdialog']"),
  ].filter((el) => !isForeign(el) && el.getAttribute("data-state") !== "closed" && isVisible(el));
  return nodes.at(-1) ?? null;
}

function firstVisible(root: Element | Document, selector: string): HTMLElement | null {
  for (const el of root.querySelectorAll<HTMLElement>(selector)) {
    if (!isForeign(el, root) && isVisible(el)) return el;
  }
  return null;
}

/** Resolves a step's `target` (data-tour id or built-in area). */
export function resolveBase(target: string | undefined): HTMLElement | null {
  if (!target) return mainArea();
  switch (target) {
    case "@dialog":
      return topDialog();
    case "@main":
      return mainArea();
    case "@header":
      return firstVisible(mainArea(), "header") ?? firstVisible(mainArea(), "section");
    case "@sidekick":
      return document.querySelector<HTMLElement>(SIDEKICK);
    case "@tabs":
      return firstVisible(mainArea(), "[role='tablist']");
    default:
      return findTourElement(target);
  }
}

const CLICKABLE =
  "button, a[href], [role='tab'], [role='combobox'], [role='menuitem'], [role='option'], [role='radio'], [role='checkbox'], [role='switch'], [role='button'], summary";

/** Visible button / link / tab inside `root` whose text (or aria-label) starts with `text`; exact matches win. */
export function findByText(root: Element | Document, text: string): HTMLElement | null {
  const wanted = normalise(text);
  let partial: HTMLElement | null = null;
  for (const el of root.querySelectorAll<HTMLElement>(CLICKABLE)) {
    if (isForeign(el, root) || !isVisible(el)) continue;
    const label = normalise(el.textContent) || normalise(el.getAttribute("aria-label"));
    const aria = normalise(el.getAttribute("aria-label"));
    if (label === wanted || aria === wanted) return el;
    if (!partial && (label.startsWith(wanted) || aria.startsWith(wanted))) partial = el;
  }
  return partial;
}

/** True when the step points at something on the page (vs a centred card). */
export function stepHasTarget(step: TourStep) {
  return Boolean(step.target || step.text || step.selector || step.field || step.section);
}

/** The card / section inside `root` whose heading starts with `title`. */
export function findSection(root: Element | Document, title: string): HTMLElement | null {
  const wanted = normalise(title);
  for (const h of root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, [data-slot='card-title']")) {
    if (isForeign(h) || !isVisible(h) || !normalise(h.textContent).startsWith(wanted)) continue;
    const box = h.closest<HTMLElement>("section, [data-slot='card'], [role='dialog'], form");
    // A sub-heading inside a bigger card (e.g. "KYC" inside "Customer, KYC and nominee")
    // gets its own block, not the whole card.
    const ownsBox = box && box.querySelector("h1, h2, h3, h4") === h;
    if (box && ownsBox && box !== root && isVisible(box)) return box;
    return h.parentElement ?? h;
  }
  return null;
}

/** Tabs, wizard steps and menu items mark the current one in a few different ways. */
export function isSelectedControl(el: HTMLElement): boolean {
  const current = el.getAttribute("aria-current");
  return (
    (current != null && current !== "false") ||
    el.getAttribute("aria-selected") === "true" ||
    el.getAttribute("data-state") === "active"
  );
}

export function resolveStepTarget(step: TourStep): HTMLElement | null {
  if (!stepHasTarget(step)) return null;
  let base = resolveBase(step.target);
  if (!base) return null;
  if (step.section) {
    base = findSection(base, step.section);
    if (!base) return null;
    if (!step.field && !step.selector && !step.text) return base;
  }
  if (step.field) return findField(base, step.field);
  if (step.selector) {
    if (!step.text) return firstVisible(base, step.selector);
    // Text among the elements matching the selector (or inside them), exact matches first.
    const wanted = normalise(step.text);
    let partial: HTMLElement | null = null;
    for (const el of base.querySelectorAll<HTMLElement>(step.selector)) {
      if (isForeign(el, base) || !isVisible(el)) continue;
      const own = normalise(el.textContent);
      if (own === wanted) return el;
      const inner = el.matches(CLICKABLE) ? null : findByText(el, step.text);
      if (inner && normalise(inner.textContent) === wanted) return inner;
      partial ??= own.startsWith(wanted) ? el : inner;
    }
    return partial;
  }
  if (step.text) return findByText(base, step.text);
  return isVisible(base) ? base : null;
}

export function isDisabledControl(el: HTMLElement): boolean {
  return (
    el.matches(":disabled") ||
    el.getAttribute("aria-disabled") === "true" ||
    el.hasAttribute("data-disabled")
  );
}

/**
 * "Do it for me": press the element the way a mouse would. Tabs, selects and menus
 * react to pointer-down rather than click, so a bare .click() wouldn't switch them.
 */
export function pressLikeAUser(el: HTMLElement) {
  const opts = { bubbles: true, cancelable: true, button: 0, pointerType: "mouse", isPrimary: true } as const;
  const needsPress = el.matches("[role='tab'], [role='combobox'], [aria-haspopup]");
  if (needsPress) {
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.focus({ preventScroll: true });
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
  }
  el.click();
}

/** Element to click when the user presses "Do it for me" on a click step. */
export function clickableWithin(el: HTMLElement): HTMLElement {
  if (el.matches("a, button, [role='button'], tr")) return el;
  return (
    el.querySelector<HTMLElement>("a, button, [role='button']") ?? el
  );
}

/** For "open a row" steps: the first row / link in a list. */
export function firstRowWithin(el: HTMLElement): HTMLElement | null {
  return (
    el.querySelector<HTMLElement>("tbody tr") ??
    el.querySelector<HTMLElement>("[data-tour-item], a[href]")
  );
}

export function isInsideTourUi(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(`[${TOUR_UI_ATTR}]`));
}

export function pathMatches(pathname: string, pattern: string): boolean {
  try {
    return new RegExp(pattern).test(pathname);
  } catch {
    return pathname === pattern;
  }
}

/** Route on a step is a plain path; compare without trailing slash. */
export function samePath(a: string, b: string) {
  const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  return clean(a) === clean(b);
}
