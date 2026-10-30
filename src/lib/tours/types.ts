/**
 * Guided walkthroughs ("tours"): spotlight + tooltip steps that move the user
 * through a real task on the real screens.
 *
 * Steps point at elements by their `data-tour` id (see `tourAttr`) and, inside a
 * form, at a field by the text of its `<FieldLabel>` — so most dialogs need only
 * one attribute on the dialog itself.
 */

export type TourAdvance =
  /** User presses Next (default). */
  | "next"
  /** Moves on when the user clicks the highlighted element. Next clicks it for them. */
  | "click"
  /**
   * Like "click", and also moves on when the element becomes the selected one
   * (a tab or wizard step the user reached another way, e.g. with Continue).
   */
  | "selected"
  /** Moves on when the URL matches this pattern (e.g. the user opened a row). */
  | { route: string };

export type TourPlacement = "auto" | "top" | "bottom" | "left" | "right";

export type TourStep = {
  id: string;
  /**
   * Where to look: a `data-tour` id, or a built-in area —
   * "@dialog" (the open dialog / side sheet), "@main" (page content),
   * "@header" (the page title bar), "@tabs" (the page's first tab row).
   * Omit everything for a centred card with no spotlight.
   */
  target?: string;
  /** Spotlight the form field whose label starts with this text, inside `target`. */
  field?: string;
  /** Spotlight the button / link / tab whose visible text starts with this, inside `target` (or the page). */
  text?: string;
  /** CSS selector inside `target` (or the page), e.g. "table", "[role=tablist]". */
  selector?: string;
  /**
   * Narrow to the card / section whose heading starts with this text (e.g. "Customer tools"),
   * then apply `text` / `field` / `selector` inside it — or spotlight the whole section.
   */
  section?: string;
  title: string;
  body: string;
  /** Example value shown as a chip — never typed into the form for the user. */
  example?: string;
  /** Path (e.g. "/customers") the step lives on; the tour navigates there first. */
  route?: string;
  advance?: TourAdvance;
  placement?: TourPlacement;
  /** Skip silently when the target is not on screen (role, plan, mobile layout…). */
  optional?: boolean;
  /**
   * Step id to return to when the target disappears — e.g. the user closed the
   * dialog mid-tour, so we go back to "click Create customer".
   */
  backTo?: string;
};

export type TourCategory =
  | "start"
  | "customers"
  | "schemes"
  | "money"
  | "store"
  | "metals"
  | "engage"
  | "setup";

/** Optional workspaces a tenant may not have switched on. */
export type TourModule = "ecommerce" | "digitalMetals";

export type Tour = {
  id: string;
  title: string;
  /** One line shown in the Guides menu and on the Sidekick card. */
  summary: string;
  category: TourCategory;
  /** Approximate minutes, shown as "≈ 1 min". */
  minutes: number;
  /** Route used for the permission check and as the default start page. */
  startRoute: string;
  /** Words people use when asking for this ("add customer", "new member"…). */
  keywords: string[];
  /** Only offered when this workspace is on for the shop. */
  module?: TourModule;
  steps: TourStep[];
};

/** Attribute helper so call sites read `{...tourAttr("customers-create")}`. */
export function tourAttr(id: string): { "data-tour": string } {
  return { "data-tour": id };
}
