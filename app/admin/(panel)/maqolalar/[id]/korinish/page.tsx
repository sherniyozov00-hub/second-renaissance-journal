import { notFound } from "next/navigation";
import { requireEditor } from "@/lib/admin/auth";
import { prepareArticleHtml } from "@/lib/article-html";
import { db } from "@/lib/db";

/** Pre-publication preview of the article text (TZ 13). */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEditor(`/admin/maqolalar/${id}/korinish`);
  const a = await db.article.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      authors: { orderBy: { order: "asc" }, include: { authorProfile: true } },
    },
  });
  if (!a) notFound();
  const { html } = prepareArticleHtml(a.versions[0]?.htmlBody ?? "");
  return (
    <article className="mx-auto max-w-[820px] rounded-card bg-white p-8">
      <p className="text-sm text-muted">Ko‘rinish (nashr qilinmagan)</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-ink">{a.titleUz}</h1>
      <p className="mt-2 font-semibold text-blue-800">
        {a.authors.map((x) => x.authorProfile?.fullName ?? x.name).join(", ")}
      </p>
      <p className="mt-5 font-serif leading-relaxed">{a.abstractUz}</p>
      <div className="article-body mt-6" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
