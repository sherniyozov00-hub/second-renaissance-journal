import { getSettings } from "@/lib/settings/get";
import { PREMIUM_DEFAULT_PRICE } from "@/lib/payments/ai-package";
import {
  ArrowRight,
  Award,
  ChartNoAxesColumn,
  FileText,
  Globe,
  ListChecks,
  Pencil,
  Send,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ArticleEyebrow, AuthorLinks, authorNames } from "@/components/article/article-meta";
import { buttonClass, cardClass, chipClass } from "@/components/ui/styles";
import { LogoMark } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import { templateHref } from "@/lib/academy/template-href";
import type { AppLocale } from "@/i18n/routing";
import { articleAbstract, articleTitle, formatDate, formatNumber, pick } from "@/lib/l10n";
import type { ArticleCard, LatestSort } from "@/lib/queries/articles";
import { isPlaceholder } from "@/lib/settings/registry";
import { cn } from "@/lib/utils";

function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h2 className="text-[28px] leading-tight md:text-section">{title}</h2>
      {lead ? <p className="mt-2 max-w-[620px] text-text-2 md:text-base">{lead}</p> : null}
    </div>
  );
}

// ── Xorazmiy AI features (desktop only, Ekran 1) ─────────────────────────────

export async function AiFeatures() {
  const t = await getTranslations("home");
  const features = [
    { key: "writing", icon: Pencil },
    { key: "edit", icon: ListChecks },
    { key: "sources", icon: Globe },
    { key: "factcheck", icon: ShieldCheck },
  ] as const;

  return (
    <section className="section hidden md:block">
      <div className="container-site">
        <div className="flex items-end justify-between gap-8">
          <SectionHeading
            eyebrow={t("aiEyebrow")}
            title={t("aiTitle")}
            lead={t("aiLead")}
            className="max-w-[620px]"
          />
          <Link href="/xorazmiy-ai" className={buttonClass("outline", "lg", "shrink-0")}>
            {t("aiTry")}
          </Link>
        </div>
        <ul className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {features.map(({ key, icon: Icon }) => (
            <li key={key} className={cn(cardClass, "p-6")}>
              <Icon className="size-6 text-blue-800" strokeWidth={1.8} aria-hidden />
              <h3 className="mt-4 font-sans text-lg font-semibold text-ink">
                {t(`features.${key}.title`)}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-2">
                {t(`features.${key}.text`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Categories ───────────────────────────────────────────────────────────────

type CategoryItem = { slug: string; name: unknown; description: unknown };

export async function Categories({ categories }: { categories: CategoryItem[] }) {
  const t = await getTranslations("home");
  const locale = (await getLocale()) as AppLocale;

  return (
    <section className="md:section pt-10 pb-4 md:pt-6">
      <div className="container-site">
        <div className="flex items-end justify-between">
          <h2 className="text-[28px] leading-tight md:text-section">{t("categoriesTitle")}</h2>
          <Link
            href="/yonalishlar"
            className="hidden items-center gap-1 text-[15px] font-semibold text-blue-800 hover:underline md:inline-flex"
          >
            {t("allCategories")} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {/* Mobile: horizontally scrolling chips (Ekran 2). */}
        <ul className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
          <li>
            <Link
              href="/yonalishlar"
              className={chipClass(true, "min-h-11 px-5 text-base whitespace-nowrap")}
            >
              {t("all")}
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/yonalish/${c.slug}`}
                className={chipClass(false, "min-h-11 px-5 text-base whitespace-nowrap text-ink")}
              >
                {pick(c.name, locale)}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop: card grid (Ekran 1). */}
        <ul className="mt-6 hidden grid-cols-3 gap-3.5 md:grid lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/yonalish/${c.slug}`}
                className="block h-full rounded-card border border-border bg-blue-50/45 px-5 py-4 transition-colors hover:border-blue-800"
              >
                <span className="block font-semibold text-ink">{pick(c.name, locale)}</span>
                <span className="mt-1 block text-sm leading-snug text-text-2">
                  {pick(c.description, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Latest articles ──────────────────────────────────────────────────────────

const TABS: LatestSort[] = ["newest", "mostRead", "mostCited"];

export async function LatestArticles({
  articles,
  sort,
}: {
  articles: ArticleCard[];
  sort: LatestSort;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;
  const [featured, ...rest] = articles;

  const meta = (a: ArticleCard, withPdf: boolean) =>
    [authorNames(a)[0], formatDate(a.publishedAt, locale), withPdf ? "PDF" : null]
      .filter(Boolean)
      .join(" · ");

  return (
    <section id="songgi" className="scroll-mt-4 py-8 md:pb-[72px]">
      <div className="container-site">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[28px] leading-tight md:text-section">{t("home.latestTitle")}</h2>
          <nav aria-label={t("home.latestTitle")} className="hidden gap-2 md:flex">
            {TABS.map((tab) => (
              <Link
                key={tab}
                href={{ pathname: "/", query: tab === "newest" ? {} : { tab }, hash: "songgi" }}
                aria-current={tab === sort ? "true" : undefined}
                className={chipClass(tab === sort, "min-h-10 px-4 text-sm")}
                scroll={false}
              >
                {t(`home.tabs.${tab}`)}
              </Link>
            ))}
          </nav>
        </div>

        {!featured ? (
          <div className="mt-6 flex flex-col items-start gap-4 rounded-card border border-dashed border-border-strong bg-white p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-serif text-2xl font-bold text-ink">{t("home.emptyTitle")}</p>
              <p className="mt-1 max-w-[560px] text-text-2">{t("home.emptyText")}</p>
            </div>
            <Link href="/kabinet/yuborish" className={buttonClass("primary", "lg", "shrink-0")}>
              {t("common.submit")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-8">
            {/* Featured (desktop) */}
            <article className="hidden md:block">
              {/* Generated cover: the field's name on the journal's colours. */}
              <Link
                href={`/maqola/${featured.slug}`}
                aria-hidden
                tabIndex={-1}
                className="relative flex aspect-[848/420] flex-col justify-end overflow-hidden rounded-card bg-gradient-to-br from-blue-900 via-blue-900 to-blue-800 p-8 text-white"
              >
                <LogoMark
                  variant="footer"
                  className="absolute -top-6 -right-6 size-56 opacity-[0.12]"
                />
                <span className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                  {pick(featured.category.name, locale)}
                </span>
                {featured.keywords.length ? (
                  <span className="mt-3 flex max-w-[80%] flex-wrap gap-2">
                    {featured.keywords.slice(0, 4).map((k) => (
                      <span
                        key={k}
                        className="rounded-full border border-white/25 px-3 py-1 text-sm text-blue-50"
                      >
                        {k}
                      </span>
                    ))}
                  </span>
                ) : null}
              </Link>
              <ArticleEyebrow article={featured} withType className="mt-5" />
              <h3 className="mt-2 text-[28px] leading-[1.3]">
                <Link href={`/maqola/${featured.slug}`} className="hover:text-blue-800">
                  {articleTitle(featured, locale)}
                </Link>
              </h3>
              <p className="mt-3 line-clamp-2 text-base leading-relaxed text-text-2">
                {articleAbstract(featured, locale)}
              </p>
              <p className="mt-3 text-sm">
                <AuthorLinks article={featured} className="font-semibold text-blue-800" />
                <span className="ml-4 text-muted">
                  {featured.authors[0]?.authorProfile?.affiliation ?? ""}
                </span>
                <span className="ml-4 text-muted">{formatDate(featured.publishedAt, locale)}</span>
              </p>
            </article>

            {/* Side list (desktop) / full list (mobile) */}
            <ul>
              {[featured, ...rest].map((a, i) => (
                <li
                  key={a.id}
                  className={cn(
                    "border-b border-border py-4 first:pt-0 last:border-0",
                    i === 0 && "md:hidden",
                    i >= 3 && "hidden md:block",
                    i === 1 && "md:pt-0",
                  )}
                >
                  <ArticleEyebrow article={a} />
                  <h3 className="mt-1.5 font-serif text-xl leading-snug font-bold text-ink">
                    <Link href={`/maqola/${a.slug}`} className="hover:text-blue-800">
                      {articleTitle(a, locale)}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-sm text-text-2">
                    <span className="md:hidden">{meta(a, false)}</span>
                    <span className="hidden md:inline">{meta(a, true)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/maqolalar" className={buttonClass("secondary", "lg", "mt-4 w-full md:hidden")}>
          {t("common.allArticles")}
        </Link>
      </div>
    </section>
  );
}

// ── Akademiya (desktop) ──────────────────────────────────────────────────────

type LessonItem = {
  slug: string;
  title: string;
  summary: string | null;
  durationMin: number;
  body: string;
};

function lessonSummary(body: string) {
  const first = body.replace(/\*\*/g, "").split(/(?<=\.)\s/)[0] ?? "";
  return first.length > 70 ? `${first.slice(0, 68).replace(/\s+\S*$/, "")}…` : first;
}

export async function Academy({ lessons }: { lessons: LessonItem[] }) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);

  return (
    <section className="section hidden border-y border-border bg-blue-50 md:block">
      <div className="container-site grid items-center gap-8 lg:grid-cols-[420px_1fr] lg:gap-12">
        <div>
          <p className="eyebrow mb-3">{t("academyEyebrow")}</p>
          <h2 className="text-section">{t("academyTitle")}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-text-2">{t("academyLead")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/akademiya" className={buttonClass("primary", "md")}>
              {t("startLessons")}
            </Link>
            <a href={templateHref(locale)} className={buttonClass("outline", "md")}>
              {t("template")}
            </a>
          </div>
        </div>
        <ul className="grid gap-3.5 sm:grid-cols-2">
          {lessons.slice(0, 4).map((l, i) => (
            <li key={l.slug}>
              <Link
                href={`/akademiya/${l.slug}`}
                className={cn(
                  cardClass,
                  "block h-full px-5 py-5 transition-colors hover:border-blue-800",
                )}
              >
                <span className="block text-[13px] text-muted">
                  {t("lessonMeta", { n: i + 1, min: l.durationMin })}
                </span>
                <span className="mt-1 block font-semibold text-ink">{l.title}</span>
                <span className="mt-1.5 block text-sm text-text-2">
                  {l.summary ?? lessonSummary(l.body)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Platformada yana (desktop) ───────────────────────────────────────────────

export async function PlatformMore() {
  const t = await getTranslations("home");
  const items = [
    { key: "originality", icon: FileText, href: "/xorazmiy-ai" },
    { key: "profile", icon: Award, href: "/kabinet/profil" },
    { key: "contests", icon: Trophy, href: "/tanlovlar" },
    { key: "ranking", icon: ChartNoAxesColumn, href: "/otm-reytingi" },
    { key: "telegram", icon: Send, href: "/kabinet/sertifikatlar" },
    { key: "mentors", icon: Users, href: "/tahrir-hayati" },
  ] as const;

  return (
    <section className="section hidden md:block">
      <div className="container-site">
        <SectionHeading title={t("moreTitle")} lead={t("moreLead")} />
        <ul className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ key, icon: Icon, href }) => (
            <li key={key}>
              <Link
                href={href}
                className={cn(
                  cardClass,
                  "flex h-full gap-4 p-5 transition-colors hover:border-blue-800",
                )}
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-control bg-blue-50"
                  aria-hidden
                >
                  <Icon className="size-5 text-blue-800" strokeWidth={1.8} />
                </span>
                <span>
                  <h3 className="font-sans font-semibold text-ink">{t(`more.${key}.title`)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-2">
                    {t(`more.${key}.text`)}
                  </p>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Process + price (process desktop only; price on all sizes) ───────────────

export async function ProcessAndPrice({ price }: { price: string | number }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;
  const priceText =
    typeof price === "number"
      ? formatNumber(price, locale)
      : isPlaceholder(price)
        ? price
        : String(price);
  const steps = ["1", "2", "3", "4", "5"] as const;
  const includes = ["1", "2", "3", "4"] as const;
  const premium = formatNumber(
    Number((await getSettings())["pricing.premium"]) || PREMIUM_DEFAULT_PRICE,
    locale,
  );

  return (
    <section className="pt-6 pb-10 md:pt-6 md:pb-[72px]">
      <div className="container-site">
        <div className="hidden md:block">
          <SectionHeading title={t("home.processTitle")} lead={t("home.processLead")} />
          <ol className="mt-8 grid grid-cols-5 gap-4">
            {steps.map((s) => {
              const current = s === "3";
              return (
                <li
                  key={s}
                  className={cn("border-t-[3px] pt-4", current ? "border-gold" : "border-blue-800")}
                >
                  <span
                    className={cn(
                      "font-serif text-[28px] font-bold",
                      current ? "text-gold-text" : "text-blue-800",
                    )}
                  >
                    {`0${s}`}
                  </span>
                  <h3 className="mt-1 font-sans font-semibold text-ink">
                    {t(`home.steps.${s}.title`)}
                  </h3>
                  <p className="mt-1 text-sm text-text-2">{t(`home.steps.${s}.text`)}</p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Desktop price block */}
        <div className="mt-11 hidden overflow-hidden rounded-card border border-border md:grid md:grid-cols-[475px_1fr]">
          <div className="bg-blue-900 px-8 py-8 text-white">
            <p className="text-sm text-blue-50/80">{t("home.priceLabel")}</p>
            <p className="mt-1 font-serif text-[40px] leading-tight font-bold">
              {priceText} {t("common.som")}
            </p>
            <p className="mt-1 text-sm text-blue-50/80">{t("home.priceNote")}</p>
            <p className="mt-4 border-t border-white/15 pt-3 text-sm text-blue-50/90">
              {t("home.priceAi", { price: premium })}{" "}
              <Link href="/kabinet/ai-paket" className="font-semibold text-gold hover:underline">
                Premium →
              </Link>
            </p>
          </div>
          <div className="flex items-center justify-between gap-6 bg-white px-12 py-8">
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink">
              {includes.map((i) => (
                <li key={i}>{t(`home.priceIncludes.${i}`)}</li>
              ))}
            </ul>
            <Link
              href="/kabinet/yuborish"
              className={buttonClass("primary", "md", "mr-2 shrink-0")}
            >
              {t("common.submit")}
            </Link>
          </div>
        </div>

        {/* Mobile price card (Ekran 2) */}
        <div className="rounded-ai bg-blue-900 p-6 text-white md:hidden">
          <p className="text-sm text-blue-50/80">{t("home.priceLabel")}</p>
          <p className="mt-2 font-serif text-[32px] leading-tight font-bold">
            {priceText} {t("common.som")}
          </p>
          <p className="mt-2 text-base leading-relaxed text-blue-50/85">
            {t("home.priceNoteMobile")}
          </p>
          <p className="mt-3 text-sm text-blue-50/85">{t("home.priceAi", { price: premium })}</p>
          <Link href="/kabinet/yuborish" className={buttonClass("gold", "lg", "mt-5 w-full")}>
            {t("common.submit")}
          </Link>
        </div>
      </div>
    </section>
  );
}
