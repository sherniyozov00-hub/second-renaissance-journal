import type { DocNode } from "@/lib/ai/doc";
import { draftToDocx } from "@/lib/ai/docx-export";

/**
 * The journal's .docx template (TZ 15, 16): the required structure with a
 * short instruction under every heading. Numbers come from Settings.
 */
export type TemplateRequirements = {
  minWords: number;
  maxWords: number;
  minReferences: number;
};

const h = (text: string): DocNode => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});
const p = (text: string, italic = false): DocNode => ({
  type: "paragraph",
  content: [{ type: "text", text, ...(italic ? { marks: [{ type: "italic" }] } : {}) }],
});
const b = (label: string, text: string): DocNode => ({
  type: "paragraph",
  content: [
    { type: "text", text: `${label} `, marks: [{ type: "bold" }] },
    { type: "text", text },
  ],
});

export function templateDoc(r: TemplateRequirements): DocNode {
  return {
    type: "doc",
    content: [
      p("[Muallif Ismi Familiyasi¹, Hammuallif Ismi Familiyasi²]"),
      p("¹ [Muassasa (OTM) nomi, shahar, mamlakat], ORCID: 0000-0000-0000-0000, email"),
      p("² [Muassasa nomi, shahar, mamlakat]"),
      b("Annotatsiya.", "[150–250 so‘z: maqsad, usul, asosiy natija raqam bilan, xulosa.]"),
      b("Kalit so‘zlar:", "[5–7 ta so‘z, vergul bilan]"),
      b("Abstract.", "[Annotatsiyaning inglizcha tarjimasi, 150–250 so‘z.]"),
      b("Keywords:", "[5–7 words]"),
      h("1. Kirish"),
      p(
        "[Mavzuning dolzarbligi (raqam va manba bilan), ma’lum bo‘lgan tadqiqotlar, hali o‘rganilmagan jihat va tadqiqot savoli yoki gipoteza. Oxirgi xatboshida maqsad.]",
        true,
      ),
      h("2. Materiallar va usullar"),
      p(
        "[Joy, vaqt, ob’ekt, namuna hajmi, asboblar, o‘lchov va statistik tahlil usullari — boshqa tadqiqotchi takrorlay oladigan darajada.]",
        true,
      ),
      h("3. Natijalar"),
      p(
        "[Topilgan natijalar izohsiz; har bir jadval va rasmga matnda havola bering (1-jadval).]",
        true,
      ),
      b("1-jadval.", "[Jadval nomi — jadval ustida] (birliklar ustun sarlavhasida)"),
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: ["Ko‘rsatkich", "1-guruh", "2-guruh"].map((x) => ({
              type: "tableHeader",
              content: [p(x)],
            })),
          },
          {
            type: "tableRow",
            content: ["…", "…", "…"].map((x) => ({ type: "tableCell", content: [p(x)] })),
          },
        ],
      },
      p("Manba: [muallif ma’lumotlari yoki manba]", true),
      b("1-rasm.", "[Rasm nomi — rasm ostida]. Manba: [ … ]"),
      h("4. Muhokama"),
      p(
        "[Natijalar nimani anglatadi, boshqa tadqiqotlar bilan solishtirish (manba bilan), cheklovlar, amaliy ahamiyat.]",
        true,
      ),
      h("5. Xulosa"),
      p(
        "[Tadqiqot savoliga aniq javob, asosiy raqamli natija, tavsiyalar. Yangi ma’lumot kiritilmaydi.]",
        true,
      ),
      h("Foydalanilgan adabiyotlar"),
      p(
        `[Kamida ${r.minReferences} ta manba, APA 7 formatida, alifbo tartibida; iloji bo‘lsa DOI bilan, bir qismi xalqaro.]`,
        true,
      ),
      p(
        "Familiya, I. I., & Familiya, I. (Yil). Maqola nomi. Jurnal nomi, jild(son), betlar. https://doi.org/10.xxxx/xxxxx",
      ),
      p("Familiya, I. (Yil). Kitob nomi. Nashriyot."),
      p(
        `[Talablar: maqola hajmi ${r.minWords}–${r.maxWords} so‘z (adabiyotlarsiz), Times New Roman 14, 1,5 interval, .docx, 10 MB gacha. Ushbu qavsli izohlarni yuborishdan oldin o‘chiring.]`,
        true,
      ),
    ],
  };
}

export function templateDocx(r: TemplateRequirements) {
  return draftToDocx({ title: "[Maqola sarlavhasi]", body: templateDoc(r), references: [] });
}
