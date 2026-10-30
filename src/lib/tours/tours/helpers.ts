import type { TourStep } from "../types";

/**
 * Small builders for the steps most guides share. Plain objects are fine too —
 * these just keep 60-odd guides consistent and short.
 */

/** "Open X from the menu" — skipped automatically when the link isn't on screen or we're already there. */
export function nav(href: string, label: string, where: string): TourStep {
  return {
    id: "nav",
    target: `nav:${href}`,
    title: `Open ${label}`,
    body: `${label} is under ${where} in the menu. Click it, or press Do it for me.`,
    advance: "click",
    placement: "right",
    optional: true,
  };
}

/** Click a button (by its text) that opens a form; dialog steps return here if the form is closed. */
export function opener(
  route: string | undefined,
  text: string,
  title: string,
  body: string,
  extra: Partial<TourStep> = {},
): TourStep {
  return { id: "open", ...(route ? { route } : {}), text, title, body, advance: "click", ...extra };
}

/** A field inside the open dialog / side sheet. */
export function field(
  id: string,
  label: string,
  title: string,
  body: string,
  example?: string,
  extra: Partial<TourStep> = {},
): TourStep {
  return {
    id,
    target: "@dialog",
    field: label,
    title,
    body,
    ...(example ? { example } : {}),
    backTo: "open",
    ...extra,
  };
}

/** The save / submit button of the open dialog. Never clicked for the user. */
export function submit(text: string, title: string, body: string, extra: Partial<TourStep> = {}): TourStep {
  return { id: "save", target: "@dialog", text, title, body, backTo: "open", ...extra };
}

/** Open the first row (or a row the user picks) of the list on the page. */
export function pickRow(
  route: string | undefined,
  detailPattern: string,
  title: string,
  body: string,
  extra: Partial<TourStep> = {},
): TourStep {
  return {
    id: "pick",
    ...(route ? { route } : {}),
    selector: "table",
    title,
    body,
    advance: { route: detailPattern },
    placement: "top",
    ...extra,
  };
}

/** Switch to a tab on the page. */
export function tab(id: string, text: string, title: string, body: string, extra: Partial<TourStep> = {}): TourStep {
  return { id, text, selector: "[role='tab']", title, body, advance: "selected", ...extra };
}

/** Point at a card / section of the page by its heading. */
export function section(id: string, heading: string, title: string, body: string, extra: Partial<TourStep> = {}): TourStep {
  return { id, section: heading, title, body, ...extra };
}
