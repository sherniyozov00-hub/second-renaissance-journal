import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test.describe("public site (Ekran 1, 2, 4, 5)", () => {
  test("home page shows the hero, Xorazmiy AI card and latest articles", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Xorazmiy AI" }).first()).toBeVisible();
    await expect(page.locator('a[href^="/maqola/"]:visible').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("article page has Scholar meta, JSON-LD and a citation box", async ({ page }) => {
    await page.goto("/maqolalar");
    const first = page.locator('a[href^="/maqola/"]').first();
    const href = await first.getAttribute("href");
    await page.goto(href!);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('meta[name="citation_title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="citation_pdf_url"]')).toHaveCount(1);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join("")).toContain("ScholarlyArticle");
    await expectNoHorizontalScroll(page);
  });

  for (const q of ["agrotexnologiya", "агротехнология", "agrotexnologya"]) {
    test(`search finds articles for “${q}” (TZ 8)`, async ({ page }) => {
      await page.goto(`/maqolalar?q=${encodeURIComponent(q)}`);
      await expect(page.locator('a[href^="/maqola/"]:visible').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }

  test("Akademiya, ranking and the template are available", async ({ page, request }) => {
    await page.goto("/akademiya");
    await expect(page.locator('a[href^="/akademiya/"]')).toHaveCount(6);
    await page.goto("/otm-reytingi");
    await expect(page.locator("h1")).toHaveText("OTMlar reytingi");
    const docx = await request.get("/shablon/maqola-shabloni.docx");
    expect(docx.status()).toBe(200);
    expect(docx.headers()["content-type"]).toContain("wordprocessingml");
  });

  test("unknown pages return 404", async ({ page }) => {
    const res = await page.goto("/bunday-sahifa-yoq-123");
    expect(res?.status()).toBe(404);
  });
});
