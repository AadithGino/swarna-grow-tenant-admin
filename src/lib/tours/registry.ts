import type { Tour } from "./types";
import { START_TOURS } from "./tours/start";
import { CUSTOMER_TOURS } from "./tours/customers";
import { SCHEME_TOURS } from "./tours/schemes";
import { MONEY_TOURS } from "./tours/money";
import { STORE_TOURS } from "./tours/store";
import { METAL_TOURS } from "./tours/metals";
import { ENGAGE_TOURS } from "./tours/engage";
import { SETUP_TOURS } from "./tours/setup";

/**
 * Every guided walkthrough in the tenant admin portal, one file per area under ./tours.
 *
 * Sidekick offers these by id: the backend catalogue
 * (backend/src/services/assistant/agent/guide-catalog.json) is generated from this
 * list with `pnpm guides:export`, and registry.test.ts fails when it is stale.
 *
 * Writing a step: point at an element with `target` (a data-tour id or "@dialog",
 * "@header", "@main", "@tabs"), then narrow with `section`, `text`, `field` or
 * `selector`. Examples are shown, never typed in, so a guide never saves anything.
 */
export const TOURS: readonly Tour[] = [
  ...START_TOURS,
  ...CUSTOMER_TOURS,
  ...SCHEME_TOURS,
  ...MONEY_TOURS,
  ...STORE_TOURS,
  ...METAL_TOURS,
  ...ENGAGE_TOURS,
  ...SETUP_TOURS,
];

const BY_ID = new Map(TOURS.map((t) => [t.id, t]));

export function getTour(id: string | null | undefined): Tour | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** The walkthrough that finishes a setup-checklist task, when one exists. */
const SETUP_TASK_TOURS: Record<string, string> = {
  PROFILE: "settings-profile",
  BRANDING: "settings-branding",
  OPERATIONS: "settings-operations",
  BRANCH: "add-branch",
  STAFF: "add-staff",
  GOLD_RATE: "set-gold-rate",
  FIRST_PLAN: "create-scheme",
};

export function tourForSetupTask(key?: string): Tour | undefined {
  return key ? getTour(SETUP_TASK_TOURS[key]) : undefined;
}

export const TOUR_CATEGORY_ORDER: Tour["category"][] = [
  "start",
  "customers",
  "schemes",
  "money",
  "store",
  "metals",
  "engage",
  "setup",
];

export const TOUR_CATEGORY_LABEL: Record<Tour["category"], string> = {
  start: "Getting started",
  customers: "Customers",
  schemes: "Schemes & enrolments",
  money: "Payments & cash",
  store: "Online store",
  metals: "Digi Gold & Silver",
  engage: "Messages, reports & support",
  setup: "Staff, branches & settings",
};

function words(text: string) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
}

/** Ranked search over titles, summaries and keywords (for the Guides panel). */
export function searchTours(tours: readonly Tour[], query: string): Tour[] {
  const q = words(query);
  if (!q.length) return [...tours];
  return tours
    .map((t) => {
      const title = words(t.title);
      const hay = new Set([...title, ...words(t.summary), ...t.keywords.flatMap(words)]);
      let score = 0;
      for (const w of q) {
        if (title.some((x) => x.startsWith(w))) score += 3;
        else if ([...hay].some((x) => x.startsWith(w))) score += 1;
        else return { t, score: -1 };
      }
      if (t.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase().trim()))) score += 4;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}
