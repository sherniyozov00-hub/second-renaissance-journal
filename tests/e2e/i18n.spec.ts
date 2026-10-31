import { expect, test } from "@playwright/test";

test.describe("three languages (uz / ru / en)", () => {
  test("Akademiya lessons and the template follow the site language", async ({ page, request }) => {
    await page.goto("/ru/akademiya");
    await expect(page.getByRole("link", { name: /Структура статьи: IMRAD/ })).toBeVisible();
    await page.goto("/en/akademiya/maqola-tuzilmasi-imrad");
    await expect(page.locator("h1")).toHaveText("Article structure: IMRAD");
    await expect(page.getByRole("heading", { name: "What each section does" })).toBeVisible();
    const ru = await request.get("/shablon/maqola-shabloni.docx?til=ru");
    expect(ru.headers()["content-disposition"]).toContain("shablon-stati");
  });

  test.describe("staff panel", () => {
    test.use({ storageState: "tests/e2e/.auth/admin.json" });

    test("switches between Uzbek, Russian and English", async ({ page }) => {
      await page.goto("/admin");
      await page.getByRole("button", { name: "Рус" }).click();
      await expect(page.getByRole("heading", { name: "Панель управления" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Статьи" })).toBeVisible();
      await page.goto("/admin/maqolalar");
      await expect(page.getByRole("button", { name: "Фильтровать" })).toBeVisible();
      await page.getByRole("button", { name: "Eng" }).click();
      await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
      await page.getByRole("button", { name: "O‘zb" }).click();
      await expect(page.getByRole("heading", { name: "Maqolalar" })).toBeVisible();
    });
  });
});
