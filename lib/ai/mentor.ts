import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  AiError,
  aiMode,
  aiModel,
  anthropic,
  FALLBACK_BETA,
  systemBlocks,
  toAiError,
} from "./client";
import { record, type FeatureContext } from "./features";
import { examplesBlock, pickExamples } from "./examples";
import { auditNote } from "./number-audit";
import { lintNote } from "./uz-lint";
import { NO_SPEND, spendOf, type Spend } from "./pricing";
import { languageLine, systemPrompt, wrapText } from "./prompts";

/**
 * Xorazmiy Ustoz — a mentor that teaches the author to write the article
 * stage by stage in a chat. The chat is stored (MentorMessage) and the mentor
 * keeps its own notes on the author's decisions (Draft.mentorNotes), so it
 * remembers the work even after the recent messages leave its window.
 */

export const MENTOR_STAGES = 7;

const STAGES: { title: string; goal: string }[] = [
  {
    title: "Mavzu va tadqiqot savoli",
    goal: "Muallif bilan mavzuni toraytirish, kim/qayerda/nima o‘rganilishini aniqlash va bitta aniq, o‘lchab bo‘ladigan tadqiqot savolini (kerak bo‘lsa gipoteza) birga tuzish. Sarlavha savolni aks ettirsin.",
  },
  {
    title: "Adabiyotlar sharhi",
    goal: "Manbalarni qanday topish (Google Scholar, ochiq bazalar, “Xalqaro manbalar” asbobi), ularni mavzular bo‘yicha guruhlab solishtirish va bo‘shliqni ko‘rsatishni o‘rgatish. Muallif yozgan sharhni sintez qoidasi bo‘yicha baholash.",
  },
  {
    title: "Usul va so‘rovnoma",
    goal: "Tadqiqot usulini tanlash; so‘rovnoma bo‘lsa — savollarni qoidalar bo‘yicha tuzish va tekshirish (qo‘sh savol, yo‘naltiruvchi savol, Likert), namuna hajmi va tanlov usuli, rozilik va anonimlik, pilot. Usullar bo‘limida nima yozilishini o‘rgatish.",
  },
  {
    title: "Ma’lumot va natijalar",
    goal: "Yig‘ilgan ma’lumotni qanday tahlil qilish va Natijalar bo‘limini talqinsiz yozish; har foiz yonida son; rasm va jadvallar. Muallif raqamlarini tekshirish (foiz ↔ n).",
  },
  {
    title: "Muhokama va cheklovlar",
    goal: "Natijalarni adabiyotdagi tadqiqotlar bilan solishtirish, kutilmagan natijalarni tushuntirish, statistik dalilsiz da’volardan qochish, cheklovlarni ochiq yozish.",
  },
  {
    title: "Xulosa, annotatsiya va sarlavha",
    goal: "Xulosa tadqiqot savoliga javob berishi va natijaga zid bo‘lmasligi; tavsiyalar; 150–250 so‘zli annotatsiya (maqsad, usul, asosiy natija raqam bilan, xulosa); kalit so‘zlar; sarlavhani yakunlash.",
  },
  {
    title: "Yakuniy tekshiruv va topshirish",
    goal: "Jurnal talablari (hajm, APA 7, havolalar), “Tekshirib ber” va “Fakt tekshiruvi” asboblaridan foydalanish, AI’dan foydalanishni ochiq yozish, topshirishga tayyorlash.",
  },
];

export const MENTOR_STAGE_TITLES = STAGES.map((s) => s.title);

const MENTOR_RULES = `Sen hozir “Xorazmiy Ustoz” rejimidasan — muallifning shaxsiy ilmiy rahbari. Maqsading — muallif maqolani O‘ZI yozishni o‘rganishi.
Bosqichlar:
${STAGES.map((s, i) => `${i + 1}. ${s.title} — ${s.goal}`).join("\n")}
Ishlash usuli:
- Har javobda bitta qadamga e’tibor qarat: qisqa tushuntir (2–5 jumla), kerak bo‘lsa bitta kichik namuna yoki misol ber, so‘ng muallifga 1–3 ta aniq savol yoki vazifa ber. Uzun ma’ruza o‘qima.
- Muallif matn yozib yuborsa yoki maqolasidagi bo‘limni ko‘rib chiqishni so‘rasa — avval kuchli tomonini ayt, keyin eng muhim 1–3 kamchilikni va qanday tuzatishni.
- Bo‘limni muallif o‘rniga yozib berma. So‘rasa ham: reja, tuzilma, savollar va bitta namuna jumla ber, “endi o‘zingiz yozib ko‘ring, men tekshiraman” de.
- Bosqich vazifasi bajarilgach, muallifni maqtab, keyingi bosqichga o‘tishni taklif qil; muallif boshqa bosqichga o‘tmoqchi bo‘lsa — o‘t.
- Har xabarda bosqichga mos real jurnal namunalari (<jurnal_namunalari>) beriladi. Foydali bo‘lsa, ulardan birini ko‘rsat: nimasi yaxshi yoki nimasi kuchsizligini tushuntir va manbasini (muallif, jurnal, yil) ayt. Har xabarda namuna ko‘rsatish shart emas.
- O‘zbek tili me’yorlariga (imlo, tinish belgilari, kelishiklar, uslub) e’tibor ber, lekin “Til xatolarini qanday o‘rgatish kerak” qoidasiga amal qil: avval ma’no, keyin grammatika, mexanik xatolar uchun “Imlo va tinish belgilari” asbobi.
- O‘z ilmiy bilimingdan erkin foydalan; raqam, statistika yoki manbani xotiradan aytma — “Fakt tekshiruvi” yoki “Xalqaro manbalar” asbobini tavsiya qil.
- Samimiy, rag‘batlantiruvchi, lekin talabchan bo‘l — yaxshi ustoz kabi.
- notes — sening xotira daftaring: muallifning mavzusi, tadqiqot savoli, namunasi, qabul qilingan qarorlar, bajarilgan va qolgan vazifalar. Har safar uni to‘liq yangilab qaytar (eski muhim narsalarni o‘chirma), 1500 belgidan oshmasin.`;

const ReplySchema = z.object({
  reply: z.string().max(4000),
  stage: z.number().int().min(1).max(MENTOR_STAGES),
  notes: z.string().max(2000),
});

export type MentorMessageView = {
  id: string;
  role: "AUTHOR" | "MENTOR";
  text: string;
  stage: number;
  createdAt: string;
};

/** The whole stored chat of a draft, oldest first. */
export async function mentorHistory(draftId: string): Promise<MentorMessageView[]> {
  const rows = await db.mentorMessage.findMany({
    where: { draftId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, text: true, stage: true, createdAt: true },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Messages the author sent to the mentor today, over all drafts (a cost guard). */
export async function mentorMessagesToday(userId: string) {
  return db.mentorMessage.count({
    where: {
      role: "AUTHOR",
      createdAt: { gt: new Date(Date.now() - 864e5) },
      draft: { userId },
    },
  });
}

const HISTORY = 24;

function alternate(rows: { role: "AUTHOR" | "MENTOR"; text: string }[]) {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const r of rows) {
    const role = r.role === "AUTHOR" ? ("user" as const) : ("assistant" as const);
    const text = r.text.slice(0, 4000);
    const last = out.at(-1);
    if (last && last.role === role) last.content = `${String(last.content)}\n\n${text}`;
    else out.push({ role, content: text });
  }
  while (out[0]?.role === "assistant") out.shift();
  return out;
}

/** Appends the new author turn, merging it into a trailing author message if there is one. */
function withTurn(history: Anthropic.Beta.BetaMessageParam[], content: string) {
  const last = history.at(-1);
  if (last?.role === "user")
    return [
      ...history.slice(0, -1),
      { role: "user" as const, content: `${String(last.content)}\n\n${content}` },
    ];
  return [...history, { role: "user" as const, content }];
}

function mockReply(stage: number, message: string) {
  const s = Math.min(Math.max(stage, 1), MENTOR_STAGES);
  return {
    reply: `Sinov rejimi (AI kaliti ulanmagan). Hozirgi bosqich: ${s}. ${STAGES[s - 1]!.title}.\nSiz yozdingiz: “${message.slice(0, 120)}”. To‘liq ustoz javobi AI kaliti ulanganda ishlaydi.`,
    stage: s,
    notes: "",
  };
}

export type MentorReply = z.infer<typeof ReplySchema>;

/**
 * The model call alone: no database. Used by every mentor turn and by the
 * admin's mentor evaluation (lib/ai/mentor-eval.ts), so both test the same prompt.
 */
export async function mentorReply(
  ctx: FeatureContext,
  draft: { id: string; title: string; text: string; mentorNotes: string },
  history: { role: "AUTHOR" | "MENTOR"; text: string }[],
  message: string,
  stage: number,
): Promise<{ out: MentorReply; spend: Spend; model: string }> {
  if ((await aiMode()) === "mock")
    return { out: mockReply(stage, message), spend: NO_SPEND, model: "mock" };
  const model = await aiModel();
  const audit = auditNote(draft.text);
  const context = `<ustoz_holati>
Hozirgi bosqich: ${stage}. ${STAGES[stage - 1]!.title}
Xotira daftaring (notes): ${draft.mentorNotes || "— (hali bo‘sh: suhbat yangi boshlandi)"}
</ustoz_holati>
${wrapText(`Sarlavha: ${draft.title}\n\n${draft.text.slice(0, 24000) || "(maqola hali bo‘sh)"}`, "maqola_hozirgi_holati")}
${audit.misfits.length ? `Kod hisobi: n = ${audit.n} ga mos kelmaydigan foizlar: ${audit.misfits.map((m) => m.text).join(", ")}.` : ""}
${draft.text.trim() ? lintNote(draft.text, 2) : ""}
${examplesBlock(pickExamples(stage, `${draft.title} ${draft.mentorNotes}`, draft.id))}
${languageLine(ctx.lang)}

Muallifning xabari:
${message}`;
  try {
    const res = await (
      await anthropic()
    ).beta.messages.parse({
      model,
      max_tokens: 6000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: systemBlocks(
        `${await systemPrompt(ctx.articleType, ctx.categoryId)}\n\n${MENTOR_RULES}`,
      ),
      output_config: { effort: "low", format: betaZodOutputFormat(ReplySchema) },
      messages: withTurn(alternate(history.slice(-HISTORY)), context),
    });
    const spend = spendOf(model, res.usage);
    if (res.stop_reason === "refusal") throw new AiError("refused");
    const parsed = ReplySchema.safeParse(res.parsed_output);
    if (!parsed.success) throw new AiError("unavailable");
    return { out: parsed.data, spend, model: res.model ?? model };
  } catch (e) {
    throw toAiError(e);
  }
}

/** One mentor turn: stores the author's message, asks the model, stores and returns the reply. */
export async function mentorTurn(
  ctx: FeatureContext,
  draft: { id: string; title: string; text: string; mentorStage: number; mentorNotes: string },
  message: string,
  /** The author picked a stage in the stepper. */
  goTo?: number,
): Promise<{ reply: MentorMessageView; author: MentorMessageView; stage: number }> {
  const stage = Math.min(Math.max(goTo || draft.mentorStage || 1, 1), MENTOR_STAGES);
  const recent = (
    await db.mentorMessage.findMany({
      where: { draftId: draft.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY,
      select: { role: true, text: true },
    })
  ).reverse();
  const { out, spend, model } = await mentorReply(ctx, draft, recent, message, stage);

  const nextStage = out.stage;
  // Explicit times: both rows are written in one transaction, where now() is equal.
  const at = Date.now();
  const [author, reply] = await db.$transaction([
    db.mentorMessage.create({
      data: { draftId: draft.id, role: "AUTHOR", text: message, stage, createdAt: new Date(at) },
    }),
    db.mentorMessage.create({
      data: {
        draftId: draft.id,
        role: "MENTOR",
        text: out.reply,
        stage: nextStage,
        createdAt: new Date(at + 1),
      },
    }),
    db.draft.update({
      where: { id: draft.id },
      data: {
        mentorStage: nextStage,
        ...(out.notes.trim() ? { mentorNotes: out.notes.trim().slice(0, 2000) } : {}),
      },
    }),
  ]);
  await record(ctx, "mentor", "MENTOR", message, { stage: nextStage }, spend, model);
  const view = (m: typeof author): MentorMessageView => ({
    id: m.id,
    role: m.role,
    text: m.text,
    stage: m.stage,
    createdAt: m.createdAt.toISOString(),
  });
  return { author: view(author), reply: view(reply), stage: nextStage };
}
