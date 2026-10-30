import { TOURS } from "./registry";

/** What Sidekick (backend) needs to know about each guide. Shared by the exporter and its test. */
export function buildGuideCatalog() {
  return TOURS.map((t) => ({
    id: t.id,
    title: t.title,
    summary: t.summary,
    category: t.category,
    ...(t.module ? { module: t.module } : {}),
    keywords: t.keywords,
    // Text version of the walkthrough for Sidekick's answer: the main steps, in order.
    steps: t.steps
      .filter((s) => !s.optional || s.id === "nav")
      .map((s) => s.title)
      .slice(0, 8),
  }));
}
