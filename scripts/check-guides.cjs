/**
 * Walks every guided tour in mock mode and reports steps whose element isn't found.
 *
 *   NEXT_PUBLIC_USE_MOCKS=true pnpm dev --port 3123   (in another terminal)
 *   node scripts/check-guides.cjs [tourId…]
 *
 * Uses the preinstalled Playwright. Never clicks Save / Submit — only "Do it for me"
 * on open-the-form steps and Next everywhere else, exactly like a user following along.
 */
const { chromium } = require("playwright");
const BASE = process.env.GUIDES_BASE_URL || "http://127.0.0.1:3123";
const only = process.argv.slice(2);
const viewport = process.env.GUIDES_PHONE ? { width: 390, height: 844 } : { width: 1440, height: 900 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 180000 });
  const inputs = page.locator("form input");
  await inputs.nth(0).fill("9876543210");
  await inputs.nth(1).fill("1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 });
  await page.waitForFunction(() => window.__swarnaGuides, null, { timeout: 60000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("swarnagrow.tours")) localStorage.setItem(k, JSON.stringify({ welcomeSeen: true, completed: {} }));
  });
  const ids = only.length ? only : await page.evaluate(() => window.__swarnaGuides.ids);
  const card = page.locator("[data-tour-ui] [data-step]");
  let failures = 0;
  for (const id of ids) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    await page.waitForFunction(() => window.__swarnaGuides, null, { timeout: 60000 });
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage))
        if (k.startsWith("swarnagrow.tours")) localStorage.setItem(k, JSON.stringify({ welcomeSeen: true, completed: {} }));
    });
    await page.evaluate((tid) => window.__swarnaGuides.start(tid), id);
    const seen = [];
    const missing = [];
    let last = "";
    let same = 0;
    let lastIndex = -1;
    let total = 0;
    for (let i = 0; i < 40; i++) {
      try {
        await page.waitForFunction(
          () => {
            const c = document.querySelector("[data-tour-ui] [data-step]");
            return !c || c.getAttribute("data-phase") !== "locating";
          },
          null,
          { timeout: 11000 },
        );
      } catch {
        missing.push("TIMEOUT");
      }
      if (!(await card.count())) break;
      const step = await card.getAttribute("data-step");
      const phase = await card.getAttribute("data-phase");
      lastIndex = Number(await card.getAttribute("data-index"));
      total = Number(await card.getAttribute("data-total"));
      const key = `${step}:${phase}`;
      same = key === last ? same + 1 : 0;
      last = key;
      if (same > 3) {
        missing.push(`STUCK@${step}`);
        break;
      }
      seen.push(phase === "missing" ? `!${step}` : step);
      if (phase === "missing") {
        missing.push(`${step}@${new URL(page.url()).pathname}`);
        await card.getByRole("button", { name: "Skip step" }).click({ timeout: 4000 }).catch(() => {});
      } else {
        const btn = card.getByRole("button", { name: /^(Next|Finish|Do it for me|Open the first one|Skip this step)/ });
        if (!(await btn.count())) break;
        await btn.first().click({ timeout: 4000 }).catch(() => {});
      }
      await page.waitForTimeout(900);
    }
    if (total && lastIndex < total - 1) missing.push(`ENDED EARLY after step ${lastIndex + 1}/${total}`);
    if (missing.length) failures += 1;
    console.log(`${missing.length ? "✗" : "✓"} ${id}  [${seen.join(" → ")}]${missing.length ? "  MISSING: " + missing.join(", ") : ""}`);
  }
  if (errors.length) console.log("page errors:", [...new Set(errors)].slice(0, 10));
  console.log(`${ids.length - failures}/${ids.length} guides complete without missing steps`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
