import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Workspace } from "@/components/ai/workspace";
import { aiMode } from "@/lib/ai/client";
import { EMPTY_DOC, isDoc } from "@/lib/ai/doc";
import { getOwnDraft, lastResults, parseReferences } from "@/lib/ai/drafts";
import { requireCabinetUser } from "@/lib/auth/session";

type Props = { params: Promise<{ locale: string; draftId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ai" });
  return { title: t("name"), robots: { index: false, follow: false } };
}

export default async function WorkspacePage({ params }: Props) {
  const { locale, draftId } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, `/kabinet/yozish/${draftId}`);
  const draft = await getOwnDraft(user.id, draftId);
  if (!draft) notFound();
  const [ta, last] = await Promise.all([getTranslations("article"), lastResults(draft.id)]);

  return (
    <Workspace
      draft={{
        id: draft.id,
        title: draft.title,
        typeLabel: ta(`types.${draft.articleType}`),
        body: isDoc(draft.body) ? draft.body : EMPTY_DOC,
        references: parseReferences(draft.references),
        updatedAt: draft.updatedAt.toISOString(),
      }}
      initialFacts={last.facts}
      initialEdits={last.edits}
      mock={aiMode() === "mock"}
    />
  );
}
