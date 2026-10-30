// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canAccessRoute } from "@/src/lib/permissions";
import { findField } from "./dom";
import { buildGuideCatalog } from "./catalog";
import { getTour, searchTours, tourForSetupTask, TOURS } from "./registry";

describe("tour registry", () => {
  it("has unique tour ids and unique step ids per tour", () => {
    const ids = TOURS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tour of TOURS) {
      const stepIds = tour.steps.map((s) => s.id);
      expect(new Set(stepIds).size, tour.id).toBe(stepIds.length);
    }
  });

  it("points backTo at a step that exists earlier in the same tour", () => {
    for (const tour of TOURS) {
      tour.steps.forEach((step, i) => {
        if (!step.backTo) return;
        const target = tour.steps.findIndex((s) => s.id === step.backTo);
        expect(target, `${tour.id}:${step.id}`).toBeGreaterThanOrEqual(0);
        expect(target, `${tour.id}:${step.id}`).toBeLessThan(i);
      });
    }
  });

  it("uses valid route patterns", () => {
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        const advance = step.advance;
        if (typeof advance === "object") expect(() => new RegExp(advance.route)).not.toThrow();
        if (step.route) expect(step.route.startsWith("/")).toBe(true);
      }
    }
  });

  it("starts every task tour on a route an owner can open", () => {
    const owner = { id: "u", name: "Owner", role: "TENANT_OWNER", permissions: ["*"] } as never;
    for (const tour of TOURS) expect(canAccessRoute(tour.startRoute, owner), tour.id).toBe(true);
  });

  it("maps setup checklist tasks to guides", () => {
    expect(tourForSetupTask("GOLD_RATE")?.id).toBe("set-gold-rate");
    expect(tourForSetupTask("BRANCH")?.id).toBe("add-branch");
    expect(tourForSetupTask("NOPE")).toBeUndefined();
    expect(getTour("nope")).toBeUndefined();
  });

  it("Sidekick's guide catalogue is up to date (run `pnpm guides:export`)", () => {
    const file = resolve(__dirname, "../../../../backend/src/services/assistant/agent/guide-catalog.js");
    if (!existsSync(file)) return; // admin checked out on its own
    const text = readFileSync(file, "utf8");
    const json = text.slice(text.indexOf("Object.freeze(") + "Object.freeze(".length, text.lastIndexOf(");"));
    expect(JSON.parse(json)).toEqual(buildGuideCatalog());
  });

  it("finds guides by everyday wording", () => {
    expect(searchTours(TOURS, "cod").slice(0, 3).map((t) => t.id)).toContain("cod-orders");
    expect(searchTours(TOURS, "add product")[0]?.id).toBe("add-product");
    expect(searchTours(TOURS, "gold rate").map((t) => t.id)).toContain("set-gold-rate");
    expect(searchTours(TOURS, "zzzz")).toEqual([]);
  });
});

describe("findField", () => {
  it("finds a field wrapper by the start of its label", () => {
    document.body.innerHTML = `
      <div id="dlg">
        <div id="name"><label data-field-label>Full name</label><input /></div>
        <div id="branch"><label data-field-label>Primary branch (optional)</label><select></select></div>
      </div>`;
    const dlg = document.getElementById("dlg")!;
    // happy-dom reports zero-size boxes, so stub layout for the visibility check.
    for (const el of dlg.querySelectorAll<HTMLElement>("div")) {
      el.getBoundingClientRect = () => ({ width: 100, height: 40, top: 0, left: 0, right: 100, bottom: 40, x: 0, y: 0, toJSON() {} }) as DOMRect;
    }
    expect(findField(dlg, "full name")?.id).toBe("name");
    expect(findField(dlg, "Primary branch")?.id).toBe("branch");
    expect(findField(dlg, "Address")).toBeNull();
  });
});
