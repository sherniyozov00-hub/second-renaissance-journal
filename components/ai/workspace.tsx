"use client";

import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  importDocxAction,
  saveDraftAction,
  submitDraftAction,
} from "@/app/[locale]/kabinet/(main)/yozish/actions";
import { LogoMark } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { DocNode } from "@/lib/ai/doc";
import type { DraftReference, EditSuggestion, FactResult } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import { aiText } from "./editor-ops";
import { DeletionMark, FactMark, InsertionMark } from "./marks";
import { Panel, type PanelView, type ToolName } from "./panels";

export type WorkspaceDraft = {
  id: string;
  title: string;
  typeLabel: string;
  body: DocNode;
  references: DraftReference[];
  updatedAt: string;
};

const TOOLS: { id: ToolName; label: string }[] = [
  { id: "review", label: "toolReview" },
  { id: "plan", label: "toolPlan" },
  { id: "assist", label: "toolAssist" },
  { id: "edit", label: "toolEdit" },
  { id: "sources", label: "toolSources" },
  { id: "facts", label: "toolFacts" },
  { id: "originality", label: "toolOriginality" },
  { id: "citations", label: "toolCitations" },
  { id: "translate", label: "toolTranslate" },
];

function countWords(text: string) {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}‘’'ʻʼ-]*/gu)?.length ?? 0;
}

function SavedLabel({ at, saving, error }: { at: Date; saving: boolean; error: boolean }) {
  const t = useTranslations("ai");
  const [now, setNow] = useState(() => at.getTime());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (error) return <span className="text-danger">{t("saveError")}</span>;
  if (saving) return <span>{t("saving")}</span>;
  const minutes = Math.max(0, Math.floor((now - at.getTime()) / 60_000));
  return (
    <span>
      {t("saved", { time: minutes < 1 ? t("justNow") : t("minutesAgo", { count: minutes }) })}
    </span>
  );
}

function Toolbar({
  editor,
  refsCount,
  onCitations,
}: {
  editor: Editor;
  refsCount: number;
  onCitations: () => void;
}) {
  const t = useTranslations("ai");
  const btn = (active: boolean) =>
    cn(
      "inline-flex h-9 min-w-9 items-center justify-center rounded-control border px-3 text-sm",
      active
        ? "border-blue-800 bg-info-bg text-blue-800"
        : "border-border bg-white text-ink hover:bg-blue-50",
    );
  return (
    <div
      role="toolbar"
      aria-label={t("editorLabel")}
      className="flex flex-wrap gap-2 border-b border-border pb-5"
    >
      <button
        type="button"
        aria-label={t("bold")}
        className={cn(btn(editor.isActive("bold")), "font-bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>
      <button
        type="button"
        aria-label={t("italic")}
        className={cn(btn(editor.isActive("italic")), "italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </button>
      <button
        type="button"
        className={btn(editor.isActive("heading"))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        {t("heading")}
      </button>
      <button
        type="button"
        className={btn(editor.isActive("table"))}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        {t("table")}
      </button>
      <button
        type="button"
        className={btn(false)}
        onClick={() => {
          const src = window.prompt(t("imageUrl"))?.trim();
          if (src && /^https?:\/\//.test(src)) editor.chain().focus().setImage({ src }).run();
        }}
      >
        {t("image")}
      </button>
      <button type="button" className={btn(false)} onClick={onCitations}>
        {t("citation", { count: refsCount })}
      </button>
    </div>
  );
}

/** Xorazmiy AI workspace (Ekran 3): tools on the left, editor in the middle, AI panel on the right. */
export function Workspace({
  draft,
  initialFacts,
  initialEdits,
  mock,
}: {
  draft: WorkspaceDraft;
  initialFacts: FactResult[];
  initialEdits: EditSuggestion[];
  mock: boolean;
}) {
  const t = useTranslations("ai");
  const [title, setTitle] = useState(draft.title);
  const [savedAt, setSavedAt] = useState(() => new Date(draft.updatedAt));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [words, setWords] = useState(0);
  const [references, setReferences] = useState(draft.references);
  const [view, setView] = useState<PanelView>({
    kind: "tab",
    tab: initialFacts.length ? "check" : "chat",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title?: string; body?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const flush = useCallback(async () => {
    const input = pending.current;
    pending.current = {};
    if (!("title" in input) && !("body" in input)) return;
    setSaving(true);
    const res = await saveDraftAction(draft.id, input);
    setSaving(false);
    if ("error" in res) {
      setSaveError(true);
      pending.current = { ...input, ...pending.current };
    } else {
      setSaveError(false);
      setSavedAt(new Date(res.savedAt));
    }
  }, [draft.id]);

  const schedule = useCallback(
    (patch: { title?: string; body?: string }) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 1500);
    },
    [flush],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      TableKit.configure({ table: { resizable: false } }),
      Image,
      FactMark,
      InsertionMark,
      DeletionMark,
    ],
    content: draft.body,
    editorProps: {
      attributes: {
        class: "ai-editor",
        "aria-label": t("editorLabel"),
        lang: "uz",
        spellcheck: "true",
      },
    },
    onCreate: ({ editor }) => setWords(countWords(aiText(editor))),
    onUpdate: ({ editor }) => {
      setWords(countWords(aiText(editor)));
      schedule({ body: JSON.stringify(editor.getJSON()) });
    },
  });

  // Save before leaving the page.
  useEffect(() => {
    const onLeave = () => {
      if (timer.current) void flush();
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [flush]);

  const openTool = (tool: ToolName) => {
    if (tool === "facts") setView({ kind: "tab", tab: "check" });
    else if (tool === "sources") setView({ kind: "tab", tab: "sources" });
    else if (tool === "edit") setView({ kind: "tab", tab: "edit" });
    else setView({ kind: "tool", tool });
  };
  const activeTool: ToolName | null =
    view.kind === "tool"
      ? view.tool
      : view.tab === "check"
        ? "facts"
        : view.tab === "sources"
          ? "sources"
          : view.tab === "edit"
            ? "edit"
            : null;

  const importDocx = async (file: File) => {
    if (!editor || !window.confirm(t("importConfirm"))) return;
    const form = new FormData();
    form.set("file", file);
    const res = await importDocxAction(form);
    if ("error" in res) {
      window.alert(t("error_unavailable"));
      return;
    }
    editor.commands.setContent(res.html, { emitUpdate: true });
  };

  const submit = () =>
    startSubmit(async () => {
      if (timer.current) clearTimeout(timer.current);
      await flush();
      const res = await submitDraftAction(draft.id);
      if (res && "error" in res) {
        setSubmitError(
          res.error === "empty"
            ? t("submitEmpty")
            : res.error === "locked"
              ? t("submitLocked")
              : t("error_unavailable"),
        );
      }
    });

  return (
    <div className="flex min-h-dvh flex-col bg-blue-50">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-white px-4 py-3 lg:px-6">
        <Link href="/kabinet/yozish" aria-label={t("listTitle")} className="shrink-0">
          <LogoMark />
        </Link>
        <div className="min-w-0 flex-1">
          <input
            value={title}
            aria-label={t("titleLabel")}
            onChange={(e) => {
              setTitle(e.target.value);
              schedule({ title: e.target.value });
            }}
            className="w-full truncate rounded-control border border-transparent px-1 text-lg font-semibold text-ink hover:border-border focus:border-blue-800 focus:outline-none"
          />
          <p className="px-1 text-sm text-text-2">
            {t("draft")} · <SavedLabel at={savedAt} saving={saving} error={saveError} /> ·{" "}
            {t("words", { count: words })} · {draft.typeLabel}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importDocx(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("secondary", "md", "text-ink")}
            onClick={() => fileRef.current?.click()}
          >
            {t("importDocx")}
          </button>
          <a
            href={`/kabinet/yozish/${draft.id}/eksport`}
            className={buttonClass("secondary", "md", "text-ink")}
            onClick={() => void flush()}
          >
            {t("download")}
          </a>
          <button
            type="button"
            className={buttonClass("primary", "md")}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? t("running") : t("submit")}
          </button>
        </div>
        {submitError ? (
          <p role="alert" className="w-full text-right text-sm text-danger">
            {submitError}
          </p>
        ) : null}
      </header>

      <div className="grid flex-1 lg:grid-cols-[224px_minmax(0,1fr)_400px]">
        <aside className="border-b border-border bg-white px-3 py-4 lg:border-r lg:border-b-0 lg:py-6">
          <p className="px-3 text-xs font-semibold tracking-[0.08em] text-text-2 uppercase">
            {t("tools")}
          </p>
          <ul className="mt-3 flex gap-1 overflow-x-auto lg:flex-col">
            {TOOLS.map((tool) => (
              <li key={tool.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={activeTool === tool.id}
                  onClick={() => openTool(tool.id)}
                  className={cn(
                    "flex min-h-10 w-full items-center rounded-control px-3 text-left text-[15px] whitespace-nowrap",
                    activeTool === tool.id
                      ? "bg-blue-800 font-semibold text-white"
                      : "text-ink hover:bg-blue-50",
                  )}
                >
                  {t(tool.label)}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-8 hidden rounded-card bg-blue-50 p-3.5 lg:block">
            <p className="text-sm font-semibold text-blue-900">{t("integrityTitle")}</p>
            <p className="mt-1 text-[13px] leading-snug text-text-2">{t("integrityText")}</p>
          </div>
        </aside>

        <main className="min-w-0 px-3 py-5 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[760px] rounded-card border border-border bg-white px-5 py-6 lg:px-14 lg:py-12">
            {editor ? (
              <>
                <Toolbar
                  editor={editor}
                  refsCount={references.length}
                  onCitations={() => openTool("citations")}
                />
                <EditorContent editor={editor} className="pt-7" />
              </>
            ) : (
              <div className="h-[480px] animate-pulse rounded-card bg-blue-50" aria-hidden />
            )}
          </div>
        </main>

        <aside className="flex min-w-0 flex-col border-t border-border bg-white lg:sticky lg:top-[73px] lg:h-[calc(100dvh-73px)] lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-3 bg-blue-900 px-5 py-4 text-white">
            <span
              className="flex size-9 items-center justify-center rounded-control bg-gold"
              aria-hidden
            >
              <Star className="size-[18px] text-blue-900" />
            </span>
            <span className="leading-tight">
              <span className="block font-semibold">{t("name")}</span>
              <span className="block text-xs text-blue-50/75">{t("subtitle")}</span>
            </span>
          </div>
          {editor ? (
            <Panel
              editor={editor}
              draftId={draft.id}
              title={title}
              view={view}
              setView={setView}
              references={references}
              setReferences={setReferences}
              initialFacts={initialFacts}
              initialEdits={initialEdits}
              mock={mock}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
