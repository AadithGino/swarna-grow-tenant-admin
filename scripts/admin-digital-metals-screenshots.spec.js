/**
 * Capture admin Digital Metals pages at common widths (requires portal dev + mock or live API).
 * FRONTEND_BASE=http://127.0.0.1:5173 npx playwright test scripts/admin-digital-metals-screenshots.spec.js
 */
import { test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const base = process.env.FRONTEND_BASE ?? "http://127.0.0.1:5173";
const outDir = path.join(process.cwd(), "docs", "screenshots", "admin-digital-metals-2026-10-21");

const routes = [
  { name: "overview", path: "/digital-metals" },
  { name: "purchases", path: "/digital-metals/purchases" },
  { name: "sells", path: "/digital-metals/sells" },
  { name: "payouts", path: "/digital-metals/payouts" },
  { name: "settings", path: "/digital-metals/settings" },
  { name: "redemption-catalogue", path: "/digital-metals/redemption/catalogue" },
  { name: "hedge", path: "/digital-metals/hedge" },
];

const widths = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 900 },
];

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

for (const route of routes) {
  for (const vp of widths) {
    test(`${route.name} @ ${vp.label}px`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto(`${base}${route.path}`, { waitUntil: "networkidle", timeout: 60_000 });
      if (!res || res.status() >= 400) {
        test.skip(true, `Route unavailable: ${route.path} (${res?.status()})`);
      }
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(outDir, `${route.name}-${vp.label}.png`),
        fullPage: true,
      });
    });
  }
}
