import { expect, test } from "@playwright/test";

test.describe("Xorazmiy AI (Ekran 3)", () => {
  test("a guest checks a paragraph once a day", async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/xorazmiy-ai#sinov");
    const box = page.getByRole("textbox", { name: "Bepul sinab ko‘ring" });
    await box.fill(
      "O‘zbekiston 1991-yilda mustaqillikka erishgan. Tomchilatib sug‘orish 2010-yilda ixtiro qilingan.",
    );
    await page.getByRole("button", { name: "Faktlarni tekshirish" }).click();
    const wrong = page.locator("li").filter({ hasText: "Noto‘g‘ri" }).first();
    await expect(wrong).toBeVisible();
    // TZ 10.2: every "incorrect" verdict carries a real source link.
    await expect(wrong.locator('a[href^="https://"]')).not.toHaveCount(0);
    await box.fill("Ikkinchi sinov 2020-yilda.");
    await page.getByRole("button", { name: "Faktlarni tekshirish" }).click();
    await expect(page.getByText("Bepul sinov tugadi", { exact: false })).toBeVisible();
  });

  test.describe("workspace", () => {
    test.use({ storageState: "tests/e2e/.auth/author.json" });

    test("fact check marks the text and edits are tracked changes", async ({ page }) => {
      await page.goto("/kabinet/yozish");
      await page.getByLabel("Maqola mavzusi").fill("E2E: tomchilatib sug‘orish");
      await page.getByRole("button", { name: "Yaratish" }).click();
      await page.waitForURL(/\/kabinet\/yozish\/.+/);
      const editor = page.locator(".ai-editor");
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.type(
        "Tomchilatib sug‘orish 2010-yilda ixtiro qilingan va bugun keng qo‘llaniladi. Ushbu maqolada biz shuni ko‘rib chiqamizki tomchilatib sug‘orishning kichik xo‘jaliklar uchun qanchalik o‘zini oqlashi baholanadi.",
      );
      await page.getByRole("button", { name: "Fakt tekshiruvi" }).click();
      await page.getByRole("button", { name: "Faktlarni tekshirish" }).click();
      await expect(page.locator(".fact-incorrect")).toHaveText(
        "Tomchilatib sug‘orish 2010-yilda ixtiro qilingan",
      );
      const card = page.locator("article").filter({ hasText: "Noto‘g‘ri" }).first();
      await expect(card.locator('a[href^="https://"]')).not.toHaveCount(0);

      await page.getByRole("tab", { name: "Tahrir" }).click();
      await page.getByRole("button", { name: "Matnni tekshirish va variantlar olish" }).click();
      const edit = page.locator("article").filter({ hasText: "Ortiqcha kirish" }).first();
      await expect(edit).toBeVisible();
      await expect(editor.locator("del")).not.toHaveCount(0);
      // A meaning problem comes with variants; picking one swaps the tracked change.
      const variants = edit.getByRole("radio");
      await expect(variants).toHaveCount(3);
      const second = (await variants.nth(1).innerText()).replace(/^2\.\s*/, "");
      await variants.nth(1).click();
      await expect(editor.locator("ins")).toContainText(second);
      await edit.getByRole("button", { name: "Qabul qilish" }).click();
      await expect(editor).not.toContainText("biz shuni ko‘rib chiqamizki");
    });

    test("Xorazmiy Ustoz is offered with a Premium button to an author without Premium", async ({
      page,
    }) => {
      await page.goto("/kabinet/yozish");
      await page.getByLabel("Maqola mavzusi").fill("E2E: ustoz");
      await page.getByRole("button", { name: "Yaratish" }).click();
      await page.waitForURL(/\/kabinet\/yozish\/.+/);
      await page.getByRole("tab", { name: "Ustoz" }).click();
      await expect(page.getByText("Ustoz maqolangizni boshidan oxirigacha")).toBeVisible();
      const cta = page.getByRole("link", { name: "Premium olish — oyiga 39 990 so‘m" });
      await expect(cta).toHaveAttribute("href", "/kabinet/ai-paket");
    });

    test("“Tekshirib ber” finds a percentage that the sample cannot give", async ({ page }) => {
      await page.goto("/kabinet/yozish");
      await page.getByLabel("Maqola mavzusi").fill("E2E: so‘rovnoma tekshiruvi");
      await page.getByRole("button", { name: "Yaratish" }).click();
      await page.waitForURL(/\/kabinet\/yozish\/.+/);
      const editor = page.locator(".ai-editor");
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.type(
        "So‘rovnomada 35 talaba qatnashdi. Ularning 37,3 % i ijodkorlikni muhim, 31,4 % i juda muhim deb hisoblaydi.",
      );
      await page.getByRole("button", { name: "Tekshirib ber" }).click();
      await page.getByRole("button", { name: "Butun maqolani tekshirish" }).click();
      await expect(
        page.getByText("37,3 % qiymati n = 35 kishidan chiqishi mumkin emas."),
      ).toBeVisible();
      await expect(page.getByText("37,1 % (13 kishi)", { exact: false })).toBeVisible();
    });
  });
});
