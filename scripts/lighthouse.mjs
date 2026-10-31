/**
 * Lighthouse check (TZ 17, 18 — stage 8): Performance, Accessibility and SEO
 * must be ≥ 90 on the main pages, on Lighthouse's default mobile profile
 * (Moto G Power, slow 4G). Runs against a production server:
 *
 *   npm run build && npm run start   # then, in another shell:
 *   LH_BASE_URL=http://localhost:3000 npm run lighthouse
 *
 * Uses Playwright's Chromium, so no separate Chrome install is needed.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { chromium } from "playwright-core";

const base = (process.env.LH_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MIN = Number(process.env.LH_MIN ?? 90);
const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"];
const REQUIRED = ["performance", "accessibility", "seo"];

async function articlePath() {
  const html = await (await fetch(`${base}/maqolalar`)).text();
  return html.match(/href="(\/maqola\/[^"]+)"/)?.[1] ?? "/maqolalar";
}

// Search result pages are noindex on purpose, so the list page is measured instead.
const pages = ["/", await articlePath(), "/maqolalar", "/akademiya", "/xorazmiy-ai"];

const chrome = await launch({
  chromePath: process.env.CHROME_PATH || chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});
mkdirSync("lighthouse-report", { recursive: true });
let failed = false;
try {
  for (const path of pages) {
    // Warm up: the first request compiles caches on a cold server.
    await fetch(`${base}${path}`);
    const result = await lighthouse(`${base}${path}`, {
      port: chrome.port,
      output: "html",
      onlyCategories: CATEGORIES,
      logLevel: "error",
    });
    const scores = Object.fromEntries(
      CATEGORIES.map((c) => [c, Math.round((result.lhr.categories[c]?.score ?? 0) * 100)]),
    );
    const bad = REQUIRED.filter((c) => scores[c] < MIN);
    if (bad.length) failed = true;
    console.log(
      `${bad.length ? "✗" : "✓"} ${path.padEnd(48)} ${CATEGORIES.map((c) => `${c}: ${scores[c]}`).join("  ")}`,
    );
    if (bad.length) {
      for (const audit of Object.values(result.lhr.audits)) {
        if (
          audit.score !== null &&
          audit.score < 0.9 &&
          audit.scoreDisplayMode !== "informative" &&
          audit.scoreDisplayMode !== "manual"
        ) {
          console.log(
            `    · ${audit.id}: ${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ""}`,
          );
        }
      }
    }
    const name = path === "/" ? "home" : path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    writeFileSync(`lighthouse-report/${name}.html`, result.report);
  }
} finally {
  await chrome.kill();
}
process.exitCode = failed ? 1 : 0;
