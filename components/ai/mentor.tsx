"use client";

import type { Editor } from "@tiptap/react";
import { ArrowRight, GraduationCap, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { feedbackAction, mentorAction } from "@/app/[locale]/kabinet/(main)/yozish/actions";
import { chipClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { AiErrorCode } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import { aiText } from "./editor-ops";
import { AiErrorNote, Disclaimer, Feedback } from "./ui";

export type MentorMessage = {
  id: string;
  role: "AUTHOR" | "MENTOR";
  text: string;
  stage: number;
  createdAt: string;
};

const STAGES = 7;

/** Xorazmiy Ustoz: a stored, stage-by-stage mentor chat (Premium). */
export function MentorPanel({
  editor,
  draftId,
  premium,
  initialMessages,
  initialStage,
}: {
  editor: Editor;
  draftId: string;
  premium: boolean;
  initialMessages: MentorMessage[];
  initialStage: number;
}) {
  const t = useTranslations("ai.mentor");
  const [messages, setMessages] = useState<MentorMessage[]>(initialMessages);
  const [stage, setStage] = useState(Math.max(initialStage, 1));
  const [input, setInput] = useState("");
  const [error, setError] = useState<AiErrorCode | null>(null);
  const [pending, start] = useTransition();
  const [waiting, setWaiting] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" });
  }, [messages, waiting]);

  if (!premium) {
    return (
      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-card border border-l-4 border-gold/60 border-l-gold bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-gold-text uppercase">
            <Lock className="size-3.5" aria-hidden /> {t("premiumOnly")}
          </p>
          <h2 className="mt-2 font-serif text-xl font-bold text-ink">{t("title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-2">{t("lockedText")}</p>
          <ol className="mt-3 space-y-1 text-sm text-ink">
            {Array.from({ length: STAGES }, (_, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-5 shrink-0 font-semibold text-blue-800">{i + 1}.</span>
                {t(`stages.${i + 1}`)}
              </li>
            ))}
          </ol>
          <Link
            href="/kabinet/ai-paket"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-blue-800 px-4 font-semibold text-white hover:bg-blue-900"
          >
            {t("getPremium")}
          </Link>
        </div>
      </div>
    );
  }

  const send = (text: string, goTo?: number) => {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setInput("");
    setWaiting(message);
    start(async () => {
      const r = await mentorAction(draftId, message, goTo, aiText(editor));
      setWaiting(null);
      if ("error" in r) {
        setError(r.error);
        setInput(message);
        return;
      }
      setMessages((m) => [...m, r.author, r.reply]);
      setStage(r.stage);
    });
  };

  return (
    <>
      <div className="border-b border-border px-4 pt-3 pb-3">
        <p className="text-xs font-semibold text-text-2">
          {t("stageOf", { stage, total: STAGES })}: {t(`stages.${stage}`)}
        </p>
        <div className="mt-2 grid grid-cols-7 gap-1" role="list" aria-label={t("stagesLabel")}>
          {Array.from({ length: STAGES }, (_, i) => i + 1).map((s) => (
            <button
              key={s}
              type="button"
              role="listitem"
              title={`${s}. ${t(`stages.${s}`)}`}
              aria-label={`${s}. ${t(`stages.${s}`)}`}
              aria-current={s === stage ? "step" : undefined}
              disabled={pending}
              onClick={() =>
                s !== stage && send(t("goToStage", { stage: s, title: t(`stages.${s}`) }), s)
              }
              className={cn(
                "h-2 rounded-full transition-colors",
                s < stage ? "bg-blue-800" : s === stage ? "bg-gold" : "bg-blue-50 hover:bg-info-bg",
              )}
            />
          ))}
        </div>
      </div>

      <div ref={scroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" role="log">
        {!messages.length ? (
          <div className="mr-4 rounded-card bg-blue-50 px-4 py-3">
            <p className="flex items-center gap-2 font-semibold text-blue-900">
              <GraduationCap className="size-5" aria-hidden /> {t("title")}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-ink">
              {t("welcome")}
            </p>
          </div>
        ) : null}
        {messages.map((m, i) =>
          m.role === "AUTHOR" ? (
            <p
              key={m.id}
              className="ml-8 rounded-card bg-blue-800 px-4 py-2.5 text-[15px] whitespace-pre-line text-white"
            >
              {m.text}
            </p>
          ) : (
            <div key={m.id} className="mr-4 rounded-card bg-blue-50 px-4 py-3">
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink">{m.text}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Disclaimer />
                <Feedback
                  onSend={(v) =>
                    feedbackAction({
                      checkId: null,
                      feature: "mentor",
                      verdict: v,
                      payload: { q: messages[i - 1]?.text, a: m.text, stage: m.stage },
                    })
                  }
                />
              </div>
            </div>
          ),
        )}
        {waiting ? (
          <>
            <p className="ml-8 rounded-card bg-blue-800/80 px-4 py-2.5 text-[15px] whitespace-pre-line text-white">
              {waiting}
            </p>
            <p className="text-sm text-text-2" aria-live="polite">
              {t("thinking")}
            </p>
          </>
        ) : null}
        {error ? <AiErrorNote code={error} /> : null}
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {(messages.length ? ["review", "next", "example"] : ["start", "topic"]).map((k) => (
            <button
              key={k}
              type="button"
              disabled={pending}
              className={chipClass(false, "min-h-9 text-[13px]")}
              onClick={() =>
                k === "next"
                  ? send(t("quick.next"), Math.min(stage + 1, STAGES))
                  : send(t(`quick.${k}`))
              }
            >
              {t(`quickLabel.${k}`)}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2 rounded-card border border-border-strong p-1.5 pl-3 focus-within:border-blue-800"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t("send")}
            disabled={pending || !input.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-control bg-blue-800 text-white disabled:opacity-50"
          >
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    </>
  );
}
