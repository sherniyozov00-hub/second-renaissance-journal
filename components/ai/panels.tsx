"use client";

import type { Editor } from "@tiptap/react";
import { ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  addReferenceAction,
  feedbackAction,
  removeReferenceAction,
  runToolAction,
  type ToolRequest,
  type ToolResponse,
} from "@/app/[locale]/kabinet/(main)/yozish/actions";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { inTextCitation } from "@/lib/ai/citations";
import type {
  AiErrorCode,
  ChatMessage,
  DraftReference,
  EditSuggestion,
  FactResult,
  FactSummary,
  ScholarItem,
} from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import {
  aiText,
  applyTracked,
  clearFacts,
  insertAfter,
  markFacts,
  paragraphLocations,
  pendingIds,
  removeFact,
  resolveTracked,
  scrollToClaim,
  selectedOrAll,
} from "./editor-ops";
import { AiErrorNote, Disclaimer, Feedback, MockNote, streamFactCheck, SummaryTiles } from "./ui";

export type ToolName =
  "plan" | "assist" | "edit" | "sources" | "facts" | "originality" | "citations" | "translate";
type Tab = "check" | "sources" | "edit" | "chat";
export type PanelView =
  | { kind: "tab"; tab: Tab }
  | { kind: "tool"; tool: "plan" | "assist" | "originality" | "citations" | "translate" };

type Ok<T extends string> = Extract<ToolResponse, { tool: T }>;
type Err = { error: AiErrorCode };

function isErr(r: ToolResponse): r is ToolResponse & Err {
  return "error" in r;
}

type TrackedItem = {
  id: string;
  reason: string;
  kind: string | null;
  original: string;
  replacement: string;
  status: "pending" | "accepted" | "rejected";
  checkId: string | null;
};

const card = "rounded-card border border-border bg-white p-4";
const label = "text-xs font-semibold tracking-[0.06em] uppercase";
const field =
  "w-full rounded-control border border-border-strong bg-white px-3 py-2 text-[15px] text-ink focus:border-blue-800 focus:outline-none";

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("ai");
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:underline"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {done ? t("copied") : t("copy")}
    </button>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-text-2">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function Panel({
  editor,
  draftId,
  title,
  view,
  setView,
  references,
  setReferences,
  initialFacts,
  initialEdits,
  mock,
}: {
  editor: Editor;
  draftId: string;
  title: string;
  view: PanelView;
  setView: (v: PanelView) => void;
  references: DraftReference[];
  setReferences: (r: DraftReference[]) => void;
  initialFacts: FactResult[];
  initialEdits: EditSuggestion[];
  mock: boolean;
}) {
  const t = useTranslations("ai");

  // Fact check
  const [facts, setFacts] = useState<FactResult[]>(initialFacts);
  const [handled, setHandled] = useState<Record<string, "fixed" | "cited" | "ignored">>({});
  const [factRun, setFactRun] = useState<{
    running: boolean;
    done: number;
    total: number;
    error: AiErrorCode | null;
    truncated: boolean;
    mock: boolean;
    finished: boolean;
  }>({
    running: false,
    done: 0,
    total: 0,
    error: null,
    truncated: false,
    mock,
    finished: initialFacts.length > 0,
  });
  const [locations, setLocations] = useState(() => paragraphLocations(editor));

  // Sources
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<ScholarItem[] | null>(null);
  const [sourcesFailed, setSourcesFailed] = useState<string[]>([]);
  const [sourcesError, setSourcesError] = useState<AiErrorCode | null>(null);
  const [searching, startSearch] = useTransition();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Tracked changes
  const [tracked, setTracked] = useState<TrackedItem[]>(() => {
    const live = pendingIds(editor);
    return initialEdits
      .filter((e) => live.has(e.id))
      .map((e) => ({
        id: e.id,
        reason: e.reason_uz,
        kind: e.kind,
        original: e.original,
        replacement: e.replacement,
        status: "pending" as const,
        checkId: null,
      }));
  });
  const [editError, setEditError] = useState<AiErrorCode | null>(null);
  const [editRan, setEditRan] = useState(false);
  const [editing, startEdit] = useTransition();

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [chatError, setChatError] = useState<AiErrorCode | null>(null);
  const [chatting, startChat] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Tools
  const [tool, setTool] = useState<Partial<Record<string, ToolResponse>>>({});
  const [toolBusy, startTool] = useTransition();
  const [planNotes, setPlanNotes] = useState("");
  const [assistQ, setAssistQ] = useState("");
  const [trTitle, setTrTitle] = useState(title);
  const [trAbstract, setTrAbstract] = useState("");
  const [citeFormat, setCiteFormat] = useState<"apa" | "gost" | "bibtex">("apa");

  const tab: Tab | null = view.kind === "tab" ? view.tab : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view]);

  const run = (req: ToolRequest, after?: (r: ToolResponse) => void) =>
    startTool(async () => {
      const r = await runToolAction(draftId, req);
      setTool((s) => ({ ...s, [req.tool]: r }));
      after?.(r);
    });

  /* ---------------- Fact check ---------------- */

  const runFacts = async () => {
    const text = aiText(editor);
    setLocations(paragraphLocations(editor));
    clearFacts(editor);
    setFacts([]);
    setHandled({});
    setFactRun({
      running: true,
      done: 0,
      total: 0,
      error: null,
      truncated: false,
      mock,
      finished: false,
    });
    const seen = new Set<number>();
    await streamFactCheck({ draftId, text }, (e) => {
      if (e.type === "start") setFactRun((s) => ({ ...s, total: e.paragraphs, mock: e.mock }));
      else if (e.type === "progress") {
        seen.add(e.paragraph);
        setFactRun((s) => ({ ...s, done: seen.size }));
      } else if (e.type === "result") {
        setFacts((f) => [...f, e.result]);
        markFacts(editor, [e.result]);
      } else if (e.type === "done") {
        setFactRun((s) => ({ ...s, running: false, truncated: e.truncated, finished: true }));
      } else if (e.type === "error") {
        setFactRun((s) => ({ ...s, running: false, error: e.code, finished: true }));
      }
    });
    setFactRun((s) => ({ ...s, running: false }));
  };

  const where = (paragraph: number) => {
    const loc = locations[paragraph];
    return loc
      ? t("location", { section: loc.section, paragraph: loc.paragraph })
      : t("paragraphOnly", { paragraph: paragraph + 1 });
  };

  const addReference = async (ref: DraftReference) => {
    const res = await addReferenceAction(draftId, ref);
    if ("references" in res) {
      setReferences(res.references);
      return res.references;
    }
    return null;
  };

  const applyFix = (f: FactResult) => {
    if (!f.correction) return;
    const id = `f-${f.id}`;
    const placed = applyTracked(editor, [
      { id, paragraph: f.paragraph, original: f.text, replacement: f.correction },
    ]);
    if (!placed.length) return;
    removeFact(editor, f.id);
    setTracked((s) => [
      ...s,
      {
        id,
        reason: t("factFixReason"),
        kind: null,
        original: f.text,
        replacement: f.correction!,
        status: "pending",
        checkId: null,
      },
    ]);
    setHandled((h) => ({ ...h, [f.id]: "fixed" }));
  };

  const citeFact = async (f: FactResult) => {
    const s = f.sources[0];
    if (!s) return;
    const ref: DraftReference = {
      id: s.url,
      title: s.title,
      authors: s.publisher ? [s.publisher] : [],
      year: s.year,
      journal: null,
      doi: null,
      url: s.url,
      verified: false,
    };
    const refs = await addReference(ref);
    if (!refs) return;
    insertAfter(editor, f.paragraph, f.text, ` ${inTextCitation(ref, "apa", refs.length)}`);
    setHandled((h) => ({ ...h, [f.id]: "cited" }));
  };

  const ignoreFact = (f: FactResult) => {
    removeFact(editor, f.id);
    setHandled((h) => ({ ...h, [f.id]: "ignored" }));
    void feedbackAction({ checkId: null, feature: "factcheck", verdict: "rejected", payload: f });
  };

  const searchSources = (q: string) => {
    setQuery(q);
    setView({ kind: "tab", tab: "sources" });
    startSearch(async () => {
      setSourcesError(null);
      const r = await runToolAction(draftId, { tool: "sources", query: q });
      if (isErr(r)) {
        setSourcesError(r.error);
        setSources(null);
      } else if (r.tool === "sources") {
        setSources(r.items);
        setSourcesFailed(r.failed);
      }
    });
  };

  const summary: FactSummary = { correct: 0, incorrect: 0, needs_source: 0 };
  for (const f of facts) summary[f.verdict]++;
  const order = { incorrect: 0, needs_source: 1, correct: 2 } as const;
  const visibleFacts = facts
    .filter((f) => handled[f.id] !== "ignored")
    .sort((a, b) => order[a.verdict] - order[b.verdict] || a.paragraph - b.paragraph);

  /* ---------------- Edits ---------------- */

  const runEdits = () =>
    startEdit(async () => {
      setEditError(null);
      const r = await runToolAction(draftId, { tool: "edit", text: aiText(editor) });
      setEditRan(true);
      if (isErr(r)) return setEditError(r.error);
      if (r.tool !== "edit") return;
      // Drop older AI edits still pending, then show the new set.
      for (const item of tracked)
        if (item.status === "pending" && !item.id.startsWith("f-"))
          resolveTracked(editor, item.id, false);
      const stamp = Date.now().toString(36);
      const edits = r.edits.map((e) => ({ ...e, id: `${stamp}-${e.id}` }));
      const placed = new Set(applyTracked(editor, edits));
      setTracked((s) => [
        ...s.filter((x) => x.id.startsWith("f-") || x.status !== "pending"),
        ...edits
          .filter((e) => placed.has(e.id))
          .map((e) => ({
            id: e.id,
            reason: e.reason_uz,
            kind: e.kind,
            original: e.original,
            replacement: e.replacement,
            status: "pending" as const,
            checkId: r.checkId,
          })),
      ]);
    });

  const resolve = (item: TrackedItem, accept: boolean) => {
    resolveTracked(editor, item.id, accept);
    setTracked((s) =>
      s.map((x) => (x.id === item.id ? { ...x, status: accept ? "accepted" : "rejected" } : x)),
    );
    void feedbackAction({
      checkId: item.checkId,
      feature: item.id.startsWith("f-") ? "factcheck" : "edit",
      verdict: accept ? "accepted" : "rejected",
      payload: {
        original: item.original,
        replacement: item.replacement,
        reason: item.reason,
        kind: item.kind,
      },
    });
  };
  const pendingTracked = tracked.filter((x) => x.status === "pending");

  /* ---------------- Chat ---------------- */

  const ask = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setView({ kind: "tab", tab: "chat" });
    setQuestion("");
    const history = messages;
    setMessages((m) => [...m, { role: "user", text }]);
    startChat(async () => {
      setChatError(null);
      const r = await runToolAction(draftId, {
        tool: "chat",
        history,
        question: text,
        text: aiText(editor),
      });
      if (isErr(r)) {
        setChatError(r.error);
        setMessages(history);
        setQuestion(text);
      } else if (r.tool === "chat")
        setMessages((m) => [...m, { role: "assistant", text: r.answer }]);
    });
  };

  /* ---------------- Render ---------------- */

  const tabs: { id: Tab; label: string }[] = [
    { id: "check", label: t("tabCheck") },
    { id: "sources", label: t("tabSources") },
    { id: "edit", label: t("tabEdit") },
    { id: "chat", label: t("tabChat") },
  ];

  const toolResult = view.kind === "tool" ? tool[view.tool] : undefined;

  return (
    <>
      <div role="tablist" className="grid grid-cols-4 border-b border-border text-[15px]">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            type="button"
            aria-selected={tab === x.id}
            onClick={() => setView({ kind: "tab", tab: x.id })}
            className={cn(
              "min-h-12 border-b-2 px-2 font-semibold",
              tab === x.id
                ? "border-blue-800 text-blue-800"
                : "border-transparent text-text-2 hover:text-ink",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" role="tabpanel">
        {/* ---------- Tekshiruv ---------- */}
        {tab === "check" ? (
          <>
            {factRun.mock ? <MockNote /> : null}
            {facts.length || factRun.running ? (
              <SummaryTiles summary={summary} />
            ) : (
              <p className="text-sm text-text-2">{t("factsIntro")}</p>
            )}
            <button
              type="button"
              onClick={() => void runFacts()}
              disabled={factRun.running}
              className={buttonClass(facts.length ? "secondary" : "primary", "md", "w-full")}
            >
              {factRun.running ? t("running") : facts.length ? t("factsRerun") : t("factsRun")}
            </button>
            {factRun.running && factRun.total ? (
              <p className="text-sm text-text-2" aria-live="polite">
                {t("factsProgress", { done: factRun.done, total: factRun.total })}
              </p>
            ) : null}
            {factRun.error ? <AiErrorNote code={factRun.error} /> : null}
            {factRun.truncated ? (
              <p className="text-sm text-warning">{t("factsTruncated", { count: 20 })}</p>
            ) : null}
            {factRun.finished && !factRun.running && !facts.length && !factRun.error ? (
              <p className="text-sm text-text-2">{t("factsNone")}</p>
            ) : null}

            {visibleFacts.map((f) => {
              const done = handled[f.id];
              const tone =
                f.verdict === "incorrect"
                  ? { border: "border-danger/30", text: "text-danger", name: t("verdictIncorrect") }
                  : f.verdict === "needs_source"
                    ? {
                        border: "border-[#f5d58a]",
                        text: "text-warning",
                        name: t("verdictNeedsSource"),
                      }
                    : {
                        border: "border-success/30",
                        text: "text-success",
                        name: t("verdictCorrect"),
                      };
              return (
                <article key={f.id} className={cn("rounded-card border bg-white p-4", tone.border)}>
                  <button
                    type="button"
                    className={cn(label, tone.text, "text-left hover:underline")}
                    onClick={() => scrollToClaim(editor, f.id)}
                  >
                    {tone.name} · {where(f.paragraph)}
                  </button>
                  <p className="mt-1.5 font-serif text-[16px] leading-snug text-ink">“{f.text}”</p>
                  {f.verdict === "correct" ? (
                    <p className="mt-1.5 text-sm text-text-2">
                      {t("confirmedBy", { count: f.sources.length })}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-sm leading-relaxed text-ink">{f.explanation}</p>
                  )}
                  {f.correction ? (
                    <p className="mt-2 rounded-control bg-success-bg/60 px-3 py-2 text-sm text-ink">
                      <span className="font-semibold">{t("correction")}:</span> {f.correction}
                    </p>
                  ) : null}
                  {f.downgraded ? (
                    <p className="mt-1.5 text-xs text-warning">
                      {f.downgraded === "no_source"
                        ? t("downgradedNoSource")
                        : t("downgradedUnverified")}
                    </p>
                  ) : null}
                  {f.sources.length && f.verdict !== "correct" ? (
                    <ul className="mt-2.5 space-y-1.5">
                      {f.sources.map((s) => (
                        <li key={s.url}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-control bg-blue-50 px-3 py-2 text-[13px] text-blue-800 hover:underline"
                          >
                            {s.title}
                            {s.publisher || s.year
                              ? ` — ${[s.publisher, s.year].filter(Boolean).join(", ")}`
                              : ""}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {f.verdict === "correct" && f.sources.length ? (
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                      {f.sources.map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-800 hover:underline"
                        >
                          {s.publisher || new URL(s.url).hostname}
                        </a>
                      ))}
                    </p>
                  ) : null}
                  {done ? (
                    <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-success">
                      <Check className="size-4" aria-hidden />{" "}
                      {done === "fixed" ? t("applyFix") : t("addCitation")}
                    </p>
                  ) : f.verdict === "incorrect" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {f.correction ? (
                        <button
                          type="button"
                          className={buttonClass("primary", "sm")}
                          onClick={() => applyFix(f)}
                        >
                          {t("applyFix")}
                        </button>
                      ) : null}
                      {f.sources.length ? (
                        <button
                          type="button"
                          className={buttonClass("secondary", "sm", "text-ink")}
                          onClick={() => void citeFact(f)}
                        >
                          {t("addCitation")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={buttonClass("secondary", "sm", "text-ink")}
                        onClick={() => ignoreFact(f)}
                      >
                        {t("ignore")}
                      </button>
                    </div>
                  ) : f.verdict === "needs_source" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={buttonClass("secondary", "sm", "text-ink")}
                        onClick={() => searchSources(f.text)}
                      >
                        {t("findSource")}
                      </button>
                      <button
                        type="button"
                        className={buttonClass("secondary", "sm", "text-ink")}
                        onClick={() => ignoreFact(f)}
                      >
                        {t("ignore")}
                      </button>
                    </div>
                  ) : f.sources.length ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-blue-800 hover:underline"
                      onClick={() => void citeFact(f)}
                    >
                      {t("addCitation")}
                    </button>
                  ) : null}
                </article>
              );
            })}
            {facts.length ? <Disclaimer /> : null}
          </>
        ) : null}

        {/* ---------- Manbalar ---------- */}
        {tab === "sources" ? (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) searchSources(query);
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("sourcesPlaceholder")}
                aria-label={t("sourcesPlaceholder")}
                className={field}
              />
              <button type="submit" className={buttonClass("primary", "md")} disabled={searching}>
                {searching ? "…" : t("search")}
              </button>
            </form>
            {!sources && !searching ? (
              <p className="text-sm text-text-2">{t("sourcesIntro")}</p>
            ) : null}
            {sourcesError ? <AiErrorNote code={sourcesError} /> : null}
            {sourcesFailed.length ? (
              <p className="text-xs text-warning">
                {t("sourcesFailed", { names: sourcesFailed.join(", ") })}
              </p>
            ) : null}
            {sources && !sources.length ? (
              <p className="text-sm text-text-2">{t("sourcesNone")}</p>
            ) : null}
            {sources?.map((s) => (
              <article key={s.id} className={card}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="leading-snug font-semibold text-blue-800 hover:underline"
                >
                  {s.title} <ExternalLink className="inline size-3.5" aria-hidden />
                </a>
                <p className="mt-1 text-[13px] text-text-2">
                  {[
                    s.authors.slice(0, 3).join(", ") + (s.authors.length > 3 ? " va boshq." : ""),
                    s.year,
                    s.journal,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                  {s.doi ? (
                    <span className={s.verified ? "text-success" : "text-warning"}>
                      DOI {s.doi} — {s.verified ? t("doiVerified") : t("unverified")}
                    </span>
                  ) : (
                    <span className="text-warning">{t("unverified")}</span>
                  )}
                  {s.citedBy ? (
                    <span className="text-text-2">{t("citedBy", { count: s.citedBy })}</span>
                  ) : null}
                </p>
                {s.abstract ? (
                  <p className="mt-2 line-clamp-3 text-sm text-text-2">{s.abstract}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className={buttonClass(addedIds.has(s.id) ? "secondary" : "outline", "sm")}
                    disabled={addedIds.has(s.id)}
                    onClick={async () => {
                      const ref: DraftReference = {
                        id: s.id,
                        title: s.title,
                        authors: s.authors,
                        year: s.year,
                        journal: s.journal,
                        doi: s.doi,
                        url: s.url,
                        verified: s.verified,
                      };
                      if (await addReference(ref)) setAddedIds((x) => new Set(x).add(s.id));
                    }}
                  >
                    {addedIds.has(s.id) ? t("added") : t("addToRefs")}
                  </button>
                </div>
              </article>
            ))}
            {sources?.length ? <Disclaimer /> : null}
            <References
              references={references}
              format={citeFormat}
              setFormat={setCiteFormat}
              onRemove={async (id) =>
                setReferences((await removeReferenceAction(draftId, id)).references)
              }
            />
          </>
        ) : null}

        {/* ---------- Tahrir ---------- */}
        {tab === "edit" ? (
          <>
            <p className="text-sm text-text-2">{t("editIntro")}</p>
            <button
              type="button"
              onClick={runEdits}
              disabled={editing}
              className={buttonClass("primary", "md", "w-full")}
            >
              {editing ? t("running") : t("editRun")}
            </button>
            {editError ? <AiErrorNote code={editError} /> : null}
            {editRan && !editing && !editError && !pendingTracked.length ? (
              <p className="text-sm text-text-2">{t("editNone")}</p>
            ) : null}
            {pendingTracked.length > 1 ? (
              <button
                type="button"
                className="text-sm font-semibold text-blue-800 hover:underline"
                onClick={() => pendingTracked.forEach((x) => resolve(x, true))}
              >
                {t("acceptAll")} ({pendingTracked.length})
              </button>
            ) : null}
            {tracked.map((x) => (
              <article key={x.id} className={cn(card, x.status !== "pending" && "opacity-60")}>
                <p className={cn(label, "text-blue-800")}>
                  {x.kind ? t(`kind_${x.kind}`) : t("factFixReason")}
                </p>
                <p className="mt-1.5 text-[15px]">
                  <del className="tc-del">{x.original}</del>{" "}
                  {x.replacement ? <ins className="tc-ins">{x.replacement}</ins> : null}
                </p>
                <p className="mt-1.5 text-sm text-text-2">{x.reason}</p>
                {x.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={buttonClass("primary", "sm")}
                      onClick={() => resolve(x, true)}
                    >
                      {t("accept")}
                    </button>
                    <button
                      type="button"
                      className={buttonClass("secondary", "sm", "text-ink")}
                      onClick={() => resolve(x, false)}
                    >
                      {t("reject")}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-text-2">
                    {x.status === "accepted" ? t("accepted") : t("rejected")}
                  </p>
                )}
              </article>
            ))}
            {tracked.length ? <Disclaimer /> : null}
          </>
        ) : null}

        {/* ---------- Chat ---------- */}
        {tab === "chat" ? (
          <>
            {!messages.length ? <p className="text-sm text-text-2">{t("chatEmpty")}</p> : null}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <p
                  key={i}
                  className="ml-8 rounded-card bg-blue-800 px-4 py-2.5 text-[15px] text-white"
                >
                  {m.text}
                </p>
              ) : (
                <div key={i} className="mr-4 rounded-card bg-blue-50 px-4 py-3">
                  <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink">
                    {m.text}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Disclaimer />
                    <Feedback
                      onSend={(v) =>
                        feedbackAction({
                          checkId: null,
                          feature: "chat",
                          verdict: v,
                          payload: { q: messages[i - 1]?.text, a: m.text },
                        })
                      }
                    />
                  </div>
                </div>
              ),
            )}
            {chatting ? (
              <p className="text-sm text-text-2" aria-live="polite">
                {t("running")}
              </p>
            ) : null}
            {chatError ? <AiErrorNote code={chatError} /> : null}
          </>
        ) : null}

        {/* ---------- Tools ---------- */}
        {view.kind === "tool" && view.tool === "plan" ? (
          <>
            <h2 className="text-lg font-semibold">{t("toolPlan")}</h2>
            <textarea
              value={planNotes}
              onChange={(e) => setPlanNotes(e.target.value)}
              rows={3}
              placeholder={t("planNotes")}
              aria-label={t("planNotes")}
              className={field}
            />
            <button
              type="button"
              className={buttonClass("primary", "md", "w-full")}
              disabled={toolBusy}
              onClick={() => run({ tool: "plan", notes: planNotes })}
            >
              {toolBusy ? t("running") : t("planRun")}
            </button>
            <ToolOutcome result={toolResult} />
            {toolResult?.tool === "plan" && !isErr(toolResult) ? (
              <PlanView
                plan={(toolResult as Ok<"plan">).plan}
                onInsert={(titles) => {
                  const existing = new Set(
                    aiText(editor)
                      .split("\n")
                      .map((l) => l.trim().toLowerCase()),
                  );
                  const missing = titles.filter((x) => !existing.has(x.toLowerCase()));
                  if (!missing.length) return;
                  const end = editor.state.doc.content.size;
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(
                      end,
                      missing.flatMap((x) => [
                        {
                          type: "heading",
                          attrs: { level: 2 },
                          content: [{ type: "text", text: x }],
                        },
                        { type: "paragraph" },
                      ]),
                    )
                    .run();
                }}
                onFeedback={(v) =>
                  feedbackAction({
                    checkId: (toolResult as Ok<"plan">).checkId,
                    feature: "plan",
                    verdict: v,
                  })
                }
              />
            ) : null}
          </>
        ) : null}

        {view.kind === "tool" && view.tool === "assist" ? (
          <>
            <h2 className="text-lg font-semibold">{t("toolAssist")}</h2>
            <p className="text-sm text-text-2">{t("assistIntro")}</p>
            <input
              value={assistQ}
              onChange={(e) => setAssistQ(e.target.value)}
              placeholder={t("assistQuestion")}
              aria-label={t("assistQuestion")}
              className={field}
            />
            <button
              type="button"
              className={buttonClass("primary", "md", "w-full")}
              disabled={toolBusy}
              onClick={() =>
                run({ tool: "assist", text: selectedOrAll(editor), question: assistQ })
              }
            >
              {toolBusy ? t("running") : t("assistRun")}
            </button>
            <ToolOutcome result={toolResult} />
            {toolResult?.tool === "assist" && !isErr(toolResult)
              ? (() => {
                  const r = toolResult as Ok<"assist">;
                  return (
                    <div className="space-y-3">
                      <p className="text-[15px] leading-relaxed">{r.assist.summary}</p>
                      <List title={t("assistStrengths")} items={r.assist.strengths} />
                      <List title={t("assistQuestions")} items={r.assist.questions} />
                      {r.assist.advice.length ? (
                        <div>
                          <p className="text-sm font-semibold">{t("assistAdvice")}</p>
                          <ul className="mt-1.5 space-y-2">
                            {r.assist.advice.map((a, i) => (
                              <li key={i} className={card}>
                                <p className="text-sm font-semibold">{a.issue}</p>
                                <p className="mt-1 text-sm text-text-2">{a.how_to_fix}</p>
                                {a.sample_sentence ? (
                                  <p className="mt-1.5 text-sm text-ink italic">
                                    {t("planSample")}: {a.sample_sentence}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between">
                        <Disclaimer />
                        <Feedback
                          onSend={(v) =>
                            feedbackAction({ checkId: r.checkId, feature: "assist", verdict: v })
                          }
                        />
                      </div>
                    </div>
                  );
                })()
              : null}
          </>
        ) : null}

        {view.kind === "tool" && view.tool === "originality" ? (
          <>
            <h2 className="text-lg font-semibold">{t("toolOriginality")}</h2>
            <p className="text-sm text-text-2">{t("originalityIntro")}</p>
            <button
              type="button"
              className={buttonClass("primary", "md", "w-full")}
              disabled={toolBusy}
              onClick={() => run({ tool: "originality", text: aiText(editor) })}
            >
              {toolBusy ? t("running") : t("originalityRun")}
            </button>
            <ToolOutcome result={toolResult} />
            {toolResult?.tool === "originality" && !isErr(toolResult)
              ? (() => {
                  const r = toolResult as Ok<"originality">;
                  return (
                    <div className="space-y-2">
                      <p
                        className={cn(
                          "rounded-card px-4 py-3 text-xl font-bold",
                          r.originality >= 80
                            ? "bg-success-bg text-success"
                            : "bg-warning-bg text-warning",
                        )}
                      >
                        {t("originalityScore", { value: r.originality })}
                      </p>
                      {r.matches.length ? (
                        <ul className="space-y-1.5">
                          {r.matches.map((m) => (
                            <li key={m.id} className="flex justify-between gap-3 text-sm">
                              {m.slug ? (
                                <Link
                                  href={`/maqola/${m.slug}`}
                                  target="_blank"
                                  className="text-blue-800 hover:underline"
                                >
                                  {m.title}
                                </Link>
                              ) : (
                                <span>{m.title}</span>
                              )}
                              <span className="shrink-0 text-text-2">
                                {t("overlap", { value: m.overlap })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-text-2">{t("originalityNone")}</p>
                      )}
                    </div>
                  );
                })()
              : null}
          </>
        ) : null}

        {view.kind === "tool" && view.tool === "citations" ? (
          <>
            <h2 className="text-lg font-semibold">{t("toolCitations")}</h2>
            <p className="text-sm text-text-2">{t("citationsIntro")}</p>
            <button
              type="button"
              className={buttonClass("primary", "md", "w-full")}
              disabled={toolBusy}
              onClick={() => run({ tool: "citations", text: aiText(editor) })}
            >
              {toolBusy ? t("running") : t("citationsRun")}
            </button>
            <ToolOutcome result={toolResult} />
            {toolResult?.tool === "citations" && !isErr(toolResult)
              ? (() => {
                  const c = (toolResult as Ok<"citations">).check;
                  return (
                    <div className="space-y-3">
                      {c.matched ? (
                        <p className="text-sm text-success">
                          {t("citationsMatched", { count: c.matched })}
                        </p>
                      ) : null}
                      <List title={t("citationsMissing")} items={c.missing} />
                      <List title={t("citationsUncited")} items={c.uncited} />
                      {!c.missing.length && !c.uncited.length ? (
                        <p className="text-sm text-success">{t("citationsOk")}</p>
                      ) : null}
                    </div>
                  );
                })()
              : null}
            <References
              references={references}
              format={citeFormat}
              setFormat={setCiteFormat}
              onRemove={async (id) =>
                setReferences((await removeReferenceAction(draftId, id)).references)
              }
            />
          </>
        ) : null}

        {view.kind === "tool" && view.tool === "translate" ? (
          <>
            <h2 className="text-lg font-semibold">{t("toolTranslate")}</h2>
            <input
              value={trTitle}
              onChange={(e) => setTrTitle(e.target.value)}
              aria-label={t("translateTitle")}
              placeholder={t("translateTitle")}
              className={field}
            />
            <textarea
              value={trAbstract}
              onChange={(e) => setTrAbstract(e.target.value)}
              rows={6}
              aria-label={t("translateAbstract")}
              placeholder={t("translateAbstract")}
              className={field}
            />
            <button
              type="button"
              className={buttonClass("primary", "md", "w-full")}
              disabled={toolBusy}
              onClick={() => run({ tool: "translate", title: trTitle, abstract: trAbstract })}
            >
              {toolBusy ? t("running") : t("translateRun")}
            </button>
            <ToolOutcome result={toolResult} />
            {toolResult?.tool === "translate" && !isErr(toolResult)
              ? (() => {
                  const r = (toolResult as Ok<"translate">).translation;
                  return (
                    <div className="space-y-3">
                      {[
                        ["EN", r.title_en, r.abstract_en],
                        ["RU", r.title_ru, r.abstract_ru],
                      ].map(([lang, tt, ab]) => (
                        <div key={lang} className={card}>
                          <div className="flex justify-between">
                            <p className={cn(label, "text-blue-800")}>{lang}</p>
                            <CopyButton text={`${tt}\n\n${ab}`} />
                          </div>
                          <p className="mt-1 font-semibold">{tt}</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-text-2">{ab}</p>
                        </div>
                      ))}
                      <List title={t("translateNote")} items={r.notes_uz} />
                      <Disclaimer />
                    </div>
                  );
                })()
              : null}
          </>
        ) : null}
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={chipClass(false, "min-h-9 text-[13px]")}
            onClick={() => searchSources(title)}
          >
            {t("quickSources")}
          </button>
          <button
            type="button"
            className={chipClass(false, "min-h-9 text-[13px]")}
            onClick={() => ask(t("quickShortenPrompt"))}
          >
            {t("quickShorten")}
          </button>
          <button
            type="button"
            className={chipClass(false, "min-h-9 text-[13px]")}
            onClick={() => setView({ kind: "tool", tool: "translate" })}
          >
            {t("quickAbstract")}
          </button>
        </div>
        <form
          className="flex items-center gap-2 rounded-card border border-border-strong p-1.5 pl-3 focus-within:border-blue-800"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("chatPlaceholder")}
            aria-label={t("chatPlaceholder")}
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t("chatSend")}
            disabled={chatting || !question.trim()}
            className="flex size-10 items-center justify-center rounded-control bg-blue-800 text-white disabled:opacity-50"
          >
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    </>
  );
}

function ToolOutcome({ result }: { result: ToolResponse | undefined }) {
  if (!result || !isErr(result)) return null;
  return <AiErrorNote code={result.error} />;
}

function PlanView({
  plan,
  onInsert,
  onFeedback,
}: {
  plan: Ok<"plan">["plan"];
  onInsert: (titles: string[]) => void;
  onFeedback: (v: "up" | "down") => void;
}) {
  const t = useTranslations("ai");
  return (
    <div className="space-y-3">
      <div className={card}>
        <p className={cn(label, "text-blue-800")}>{t("planQuestion")}</p>
        <p className="mt-1 text-[15px]">{plan.research_question}</p>
        {plan.hypothesis ? (
          <>
            <p className={cn(label, "mt-3 text-blue-800")}>{t("planHypothesis")}</p>
            <p className="mt-1 text-[15px]">{plan.hypothesis}</p>
          </>
        ) : null}
      </div>
      <ol className="space-y-2">
        {plan.sections.map((s, i) => (
          <li key={i} className={card}>
            <p className="font-semibold">{s.title}</p>
            <p className="mt-1 text-sm text-text-2">{s.purpose}</p>
            {s.points.length ? (
              <ul className="mt-1.5 list-disc pl-5 text-sm">
                {s.points.map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            ) : null}
            {s.sample_sentence ? (
              <p className="mt-1.5 text-sm italic">
                {t("planSample")}: {s.sample_sentence}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      {plan.keywords.length ? (
        <p className="text-sm">
          <span className="font-semibold">{t("keywords")}:</span> {plan.keywords.join(", ")}
        </p>
      ) : null}
      <List title={t("planNext")} items={plan.next_steps} />
      <button
        type="button"
        className={buttonClass("outline", "sm")}
        onClick={() =>
          onInsert(plan.sections.map((s, i) => `${i + 1}. ${s.title.replace(/^\d+\.\s*/, "")}`))
        }
      >
        {t("planInsert")}
      </button>
      <div className="flex items-center justify-between">
        <Disclaimer />
        <Feedback onSend={onFeedback} />
      </div>
    </div>
  );
}

function References({
  references,
  format,
  setFormat,
  onRemove,
}: {
  references: DraftReference[];
  format: "apa" | "gost" | "bibtex";
  setFormat: (f: "apa" | "gost" | "bibtex") => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("ai");
  const [formatted, setFormatted] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    void import("@/lib/ai/scholar").then(({ citationStrings }) => {
      if (live) setFormatted(references.map((r, i) => citationStrings(r, i + 1)[format]));
    });
    return () => {
      live = false;
    };
  }, [references, format]);
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">
          {t("refs")} ({references.length})
        </h3>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as "apa")}
          aria-label={t("format")}
          className="h-9 rounded-control border border-border-strong px-2 text-sm"
        >
          <option value="apa">APA 7</option>
          <option value="gost">GOST</option>
          <option value="bibtex">BibTeX</option>
        </select>
      </div>
      {!references.length ? <p className="text-sm text-text-2">{t("refsEmpty")}</p> : null}
      <ol className="space-y-2">
        {references.map((r, i) => (
          <li key={r.id} className="rounded-control bg-blue-50 p-3 text-[13px]">
            <p
              className={cn(
                "break-words text-ink",
                format === "bibtex" && "font-mono whitespace-pre-wrap",
              )}
            >
              {format === "bibtex" ? "" : `${i + 1}. `}
              {formatted[i] ?? r.title}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-3">
              <span className={r.verified ? "text-success" : "text-warning"}>
                {r.verified ? t("doiVerified") : t("unverified")}
              </span>
              <CopyButton text={formatted[i] ?? r.title} />
              <button
                type="button"
                className="text-xs font-semibold text-danger hover:underline"
                onClick={() => onRemove(r.id)}
              >
                {t("remove")}
              </button>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
