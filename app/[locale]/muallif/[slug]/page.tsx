import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArticleList, parsePage } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import { cardClass } from "@/components/ui/styles";
import { initials } from "@/lib/l10n";
import { listArticles } from "@/lib/queries/articles";
import { getAuthorBySlug } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return {};
  return {
    title: author.fullName,
    description: [author.affiliation, author.position, author.bio]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 155),
  };
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();
  const page = parsePage((await searchParams).page);
  const t = await getTranslations("lists");
  const { items, pages, total } = await listArticles(
    { authors: { some: { authorProfileId: author.id } } },
    page,
  );

  return (
    <PageShell>
      <div className="bg-blue-50">
        <div className="container-site grid gap-8 py-8 md:py-12 lg:grid-cols-[300px_1fr]">
          <aside className={cn(cardClass, "h-fit p-6")}>
            <span
              aria-hidden
              className="flex size-16 items-center justify-center rounded-full bg-blue-50 font-serif text-2xl font-bold text-blue-800"
            >
              {initials(author.fullName)}
            </span>
            <p className="eyebrow mt-4">{t("profile")}</p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-ink">{author.fullName}</h1>
            <ul className="mt-2 space-y-0.5 text-sm text-text-2">
              {author.affiliation ? <li>{author.affiliation}</li> : null}
              {author.position ? <li>{author.position}</li> : null}
              {author.orcid ? <li>ORCID: {author.orcid}</li> : null}
            </ul>
            {author.bio ? (
              <p className="mt-4 text-sm leading-relaxed text-text-2">{author.bio}</p>
            ) : null}
          </aside>
          <section className={cn(cardClass, "p-6")}>
            <h2 className="font-serif text-2xl font-bold text-blue-900">{t("authorArticles")}</h2>
            <p className="mt-1 text-sm text-muted">{t("articleCount", { count: total })}</p>
            <div className="mt-6">
              <ArticleList items={items} page={page} pages={pages} basePath={`/muallif/${slug}`} />
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
