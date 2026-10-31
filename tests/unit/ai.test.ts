import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { checkCitations, findNumericCitations, inTextCitation } from "@/lib/ai/citations";
import { docToText, type DocNode } from "@/lib/ai/doc";
import { draftToDocx } from "@/lib/ai/docx-export";
import { KNOWLEDGE_DEFAULTS } from "@/lib/ai/knowledge-defaults";
import { mockClaims, mockEdits, mockVerdict } from "@/lib/ai/mock";
import { spendOf } from "@/lib/ai/pricing";
import { EditsSchema, VerdictsSchema, type DraftReference } from "@/lib/ai/schemas";
import {
  invertedToText,
  mergeResults,
  parseCrossref,
  parseOpenAlex,
  parseSemanticScholar,
} from "@/lib/ai/scholar";
import {
  enforceVerdict,
  guestKey,
  isCheckable,
  locateInParagraph,
  normalizeUrl,
  splitParagraphs,
  summarize,
} from "@/lib/ai/text";

const src = (url: string) => ({ title: "Manba", url, publisher: "FAO", year: 2020 });

describe("source rules (TZ 10.2)", () => {
  const retrieved = new Set([normalizeUrl("https://www.fao.org/aquastat/uz")!]);

  it("keeps an incorrect verdict that cites a retrieved source", () => {
    const r = enforceVerdict(
      {
        verdict: "incorrect",
        explanation: "…",
        correction: "1960-yillarda",
        sources: [src("http://fao.org/aquastat/uz/")],
      },
      retrieved,
    );
    expect(r.verdict).toBe("incorrect");
    expect(r.correction).toBe("1960-yillarda");
    expect(r.sources).toHaveLength(1);
  });

  it("turns an incorrect verdict without a source into needs_source", () => {
    const r = enforceVerdict(
      { verdict: "incorrect", explanation: "…", correction: "x", sources: [] },
      retrieved,
    );
    expect(r).toMatchObject({ verdict: "needs_source", correction: null, downgraded: "no_source" });
  });

  it("drops sources the model did not get from search (no invented links)", () => {
    const r = enforceVerdict(
      {
        verdict: "correct",
        explanation: "…",
        correction: null,
        sources: [src("https://invented.example/paper")],
      },
      retrieved,
    );
    expect(r.verdict).toBe("needs_source");
    expect(r.sources).toEqual([]);
    expect(r.downgraded).toBe("unverified_source");
  });

  it("removes duplicate sources and ignores non-http links", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    const r = enforceVerdict(
      {
        verdict: "correct",
        explanation: "…",
        correction: "ignored",
        sources: [src("https://fao.org/aquastat/uz"), src("https://www.fao.org/aquastat/uz#x")],
      },
      retrieved,
    );
    expect(r.sources).toHaveLength(1);
    expect(r.correction).toBeNull();
  });

  it("validates model answers with zod", () => {
    expect(VerdictsSchema.safeParse({ verdicts: [{ id: "a", verdict: "maybe" }] }).success).toBe(
      false,
    );
    expect(
      EditsSchema.safeParse({
        edits: [
          {
            paragraph: 0,
            original: "a",
            replacement: "b",
            alternatives: ["c"],
            kind: "meaning",
            reason: "r",
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("text helpers", () => {
  it("splits paragraphs and skips headings for the fact check", () => {
    const p = splitParagraphs(
      "1. Kirish\n\n  Paxta  O‘zbekistonning asosiy ekini hisoblanadi.  \n",
    );
    expect(p).toEqual(["1. Kirish", "Paxta O‘zbekistonning asosiy ekini hisoblanadi."]);
    expect(isCheckable(p[0]!)).toBe(false);
    expect(isCheckable(p[1]!)).toBe(true);
  });

  it("finds a quote even when apostrophes and spaces differ", () => {
    const para = "Tomchilatib sug‘orish  2010-yilda ixtiro qilingan va hokazo.";
    expect(locateInParagraph(para, "Tomchilatib sug'orish 2010-yilda ixtiro qilingan")).toBe(
      "Tomchilatib sug‘orish  2010-yilda ixtiro qilingan",
    );
    expect(locateInParagraph(para, "mavjud emas")).toBeNull();
  });

  it("hashes guests without storing the IP", () => {
    const k = guestKey("10.0.0.1", "device");
    expect(k).toMatch(/^g_[a-f0-9]{32}$/);
    expect(k).not.toContain("10.0.0.1");
    expect(guestKey("10.0.0.1", "other")).not.toBe(k);
  });

  it("summarises verdicts", () => {
    expect(
      summarize([{ verdict: "correct" }, { verdict: "needs_source" }, { verdict: "correct" }]),
    ).toEqual({
      correct: 2,
      incorrect: 0,
      needs_source: 1,
    });
  });
});

describe("cost (TZ 10.4)", () => {
  it("counts tokens, cache and web searches", () => {
    const s = spendOf("claude-opus-5-5", {
      input_tokens: 1_000_000,
      output_tokens: 100_000,
      cache_read_input_tokens: 1_000_000,
      server_tool_use: { web_search_requests: 10 },
    });
    expect(s.cost).toBeCloseTo(4 + 2 + 0.2 + 0.1, 6);
    expect(s.tokensIn).toBe(2_000_000);
    expect(s.searches).toBe(10);
  });
});

describe("citations check", () => {
  const refs: DraftReference[] = [
    {
      id: "1",
      title: "A",
      authors: ["Aziza Karimova"],
      year: 2021,
      journal: null,
      doi: null,
      url: "https://a",
      verified: false,
    },
    {
      id: "2",
      title: "B",
      authors: ["John Smith", "Ann Lee"],
      year: 2019,
      journal: null,
      doi: null,
      url: "https://b",
      verified: true,
    },
    {
      id: "3",
      title: "C",
      authors: ["Wikipedia"],
      year: null,
      journal: null,
      doi: null,
      url: "https://c",
      verified: false,
    },
  ];

  it("matches APA author–year citations and reports the rest", () => {
    const text =
      "Avvalgi ishlar (Karimova, 2021; Smith va Lee, 2019) va (Wikipedia, n.d.) hamda (Aliyev, 2018).";
    const c = checkCitations(text, refs);
    expect(c.style).toBe("apa");
    expect(c.matched).toBe(3);
    expect(c.missing).toEqual(["Aliyev, 2018"]);
    expect(c.uncited).toEqual([]);
  });

  it("finds uncited references", () => {
    const c = checkCitations("Karimova (2021) ta’kidlaganidek …", refs);
    expect(c.uncited).toEqual(["Smith (2019)", "Wikipedia (n.d.)"]);
  });

  it("understands numeric citations with ranges", () => {
    expect(findNumericCitations("[1], [2–4] va [6, 8]")).toEqual([1, 2, 3, 4, 6, 8]);
    const c = checkCitations("Ma’lumot [1] va [5].", refs);
    expect(c).toMatchObject({ style: "numeric", missing: ["[5]"] });
  });

  it("writes in-text citations", () => {
    expect(inTextCitation(refs[1]!, "apa", 2)).toBe("(Smith va Lee, 2019)");
    expect(inTextCitation(refs[2]!, "apa", 3)).toBe("(Wikipedia, n.d.)");
    expect(inTextCitation(refs[0]!, "numeric", 1)).toBe("[1]");
  });
});

describe("international sources parsers", () => {
  it("reads Crossref, OpenAlex and Semantic Scholar answers", () => {
    const cr = parseCrossref({
      message: {
        items: [
          {
            DOI: "10.1016/J.AGWAT.2020.106000",
            title: ["Drip irrigation of cotton"],
            author: [{ given: "Bakhtiyor", family: "Karimov" }],
            issued: { "date-parts": [[2020, 5]] },
            "container-title": ["Agricultural Water Management"],
            "is-referenced-by-count": 12,
          },
          { title: ["No DOI — skipped"] },
        ],
      },
    });
    expect(cr).toHaveLength(1);
    expect(cr[0]).toMatchObject({
      doi: "10.1016/j.agwat.2020.106000",
      year: 2020,
      authors: ["Bakhtiyor Karimov"],
      verified: true,
      url: "https://doi.org/10.1016/j.agwat.2020.106000",
    });

    const oa = parseOpenAlex({
      results: [
        {
          id: "https://openalex.org/W1",
          display_name: "Drip Irrigation of Cotton",
          doi: "https://doi.org/10.1016/j.agwat.2020.106000",
          publication_year: 2020,
          authorships: [{ author: { display_name: "B. Karimov" } }],
          primary_location: { source: { display_name: "AWM" } },
          abstract_inverted_index: { Water: [0], saving: [1] },
          cited_by_count: 30,
        },
      ],
    });
    expect(oa[0]!.abstract).toBe("Water saving");
    expect(oa[0]!.verified).toBe(false);

    const s2 = parseSemanticScholar({
      data: [
        {
          paperId: "p",
          title: "Cotton water productivity",
          year: 2018,
          url: "https://s2/p",
          authors: [{ name: "X" }],
        },
      ],
    });
    expect(s2[0]).toMatchObject({ doi: null, url: "https://s2/p" });

    const merged = mergeResults([cr, oa, s2]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ source: "crossref", verified: true, citedBy: 30 });
  });

  it("rebuilds an OpenAlex abstract", () => {
    expect(invertedToText({ b: [1], a: [0], c: [2, 3] })).toBe("a b c c");
    expect(invertedToText(null)).toBeNull();
  });
});

const doc: DocNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Kirish" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Paxta ", marks: [{ type: "bold" }] },
        { type: "text", text: "eski", marks: [{ type: "deletion", attrs: { sid: "e1" } }] },
        { type: "text", text: "yangi", marks: [{ type: "insertion", attrs: { sid: "e1" } }] },
        { type: "text", text: " matn." },
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Ustun" }] }],
            },
          ],
        },
      ],
    },
  ],
};

describe("workspace document", () => {
  it("gives the AI the author's text until a suggestion is accepted", () => {
    expect(docToText(doc)).toBe("1. Kirish\nPaxta eski matn.\nUstun");
  });

  it("exports a valid .docx with the title and references", async () => {
    const buf = await draftToDocx({
      title: "Sinov maqolasi",
      body: doc,
      references: [
        {
          id: "r",
          title: "Drip irrigation",
          authors: ["B. Karimov"],
          year: 2020,
          journal: "AWM",
          doi: "10.1/x",
          url: "https://doi.org/10.1/x",
          verified: true,
        },
      ],
    });
    const { value } = await mammoth.extractRawText({ buffer: buf });
    expect(value).toContain("Sinov maqolasi");
    expect(value).toContain("Paxta eski matn.");
    expect(value).not.toContain("yangi");
    expect(value).toContain("Foydalanilgan adabiyotlar");
    expect(value).toContain("Karimov, B. (2020). Drip irrigation.");
  });
});

describe("offline mock (no API key)", () => {
  it("finds the claims of Ekran 3 and never invents an incorrect verdict without a source", () => {
    const para =
      "Paxta O‘zbekistonning asosiy qishloq xo‘jaligi ekinlaridan biri hisoblanadi. Tomchilatib sug‘orish 2010-yilda ixtiro qilingan va bugun ko‘plab mamlakatlarda qo‘llaniladi. Tadqiqotlarga ko‘ra, bu usul suvni 70% gacha tejaydi.";
    const claims = mockClaims(para).map((c) => c.text);
    expect(claims).toEqual([
      "Paxta O‘zbekistonning asosiy qishloq xo‘jaligi ekinlaridan biri",
      "Tomchilatib sug‘orish 2010-yilda ixtiro qilingan",
      "bu usul suvni 70% gacha tejaydi",
    ]);
    const verdicts = claims.map((c, i) => mockVerdict(String(i), c).verdict);
    expect(verdicts).toEqual(["correct", "incorrect", "needs_source"]);
    for (const c of claims) {
      const v = mockVerdict("x", c);
      if (v.verdict !== "needs_source") expect(v.sources.length).toBeGreaterThan(0);
    }
  });

  it("finds a meaning problem and offers variants in the user's language", () => {
    const para =
      "Ushbu maqolada biz shuni ko‘rib chiqamizki tomchilatib sug‘orishning kichik xo‘jaliklar uchun qanchalik o‘zini oqlashi baholanadi.";
    const [uz] = mockEdits([para], "uz");
    expect(uz).toMatchObject({ kind: "meaning" });
    expect(uz!.alternatives).toHaveLength(2);
    expect(uz!.replacement).not.toContain("biz shuni");
    expect(new Set([uz!.replacement, ...uz!.alternatives]).size).toBe(3);
    expect(mockEdits([para], "ru")[0]!.reason).toMatch(/смысл/);
    expect(mockEdits([para], "en")[0]!.reason).toMatch(/meaning/);
  });

  it("suggests edits that quote the paragraph exactly", () => {
    const paras = [
      "Ushbu maqolada biz shuni ko‘rib chiqamizki usul  baholanadi .",
      "Tajriba xo'jalikda o'tkazildi.",
    ];
    for (const e of mockEdits(paras)) expect(paras[e.paragraph]).toContain(e.original);
  });
});

describe("knowledge base (AI training)", () => {
  it("has a guide and a checklist for every article type, plus integrity rules", () => {
    for (const type of ["RESEARCH", "REVIEW", "CASE_STUDY", "POPULAR"] as const) {
      const kinds = KNOWLEDGE_DEFAULTS.filter((k) => k.articleType === type).map((k) => k.kind);
      expect(kinds).toContain("GUIDE");
      expect(kinds).toContain("CHECKLIST");
    }
    const integrity = KNOWLEDGE_DEFAULTS.find((k) => k.key === "general.integrity")!;
    expect(integrity.body).toMatch(/yozib bermaysan/);
    expect(integrity.body).toMatch(/o‘ylab topmaysan/);
    expect(new Set(KNOWLEDGE_DEFAULTS.map((k) => k.key)).size).toBe(KNOWLEDGE_DEFAULTS.length);
  });
});
