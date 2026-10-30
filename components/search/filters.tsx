import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { pick } from "@/lib/l10n";
import { LANGUAGES, TYPES, type SearchFilters } from "@/lib/search/query";
import { cn } from "@/lib/utils";
import { MoreToggle } from "./client";

export const SEARCH_FORM_ID = "search-form";

const LABEL =
  "mb-2 block font-sans text-[13px] font-semibold tracking-[0.08em] text-text-2 uppercase";
const SELECT =
  "h-11 w-full rounded-control border border-border-strong bg-blue-50/60 px-3 text-[15px] text-ink";

type Category = { slug: string; name: unknown };
type Issue = { year: number; number: number };

export async function SearchFiltersForm({
  filters,
  categories,
  categoryCounts,
  issues,
  years,
  basePath,
}: {
  filters: SearchFilters;
  categories: Category[];
  categoryCounts: Record<string, number>;
  issues: Issue[];
  years: number[];
  basePath: string;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;
  const f = SEARCH_FORM_ID;

  // Selected and populated categories first; the rest behind "Yana N ta".
  const sorted = [...categories].sort(
    (a, b) =>
      Number(filters.categories.includes(b.slug)) - Number(filters.categories.includes(a.slug)) ||
      (categoryCounts[b.slug] ?? 0) - (categoryCounts[a.slug] ?? 0),
  );
  const visible = sorted.slice(0, 5);
  const hidden = sorted.slice(5);

  const categoryRow = (c: Category) => (
    <label
      key={c.slug}
      className="flex min-h-9 cursor-pointer items-center gap-3 text-[15px] text-ink"
    >
      <input
        type="checkbox"
        name="yonalish"
        value={c.slug}
        form={f}
        defaultChecked={filters.categories.includes(c.slug)}
        data-autosubmit
        className="size-[18px] accent-blue-800"
      />
      <span className="flex-1">{pick(c.name, locale)}</span>
      <span className="text-sm text-muted">{categoryCounts[c.slug] ?? 0}</span>
    </label>
  );

  return (
    <div className="space-y-7">
      <div className="hidden items-center justify-between md:flex">
        <h2 className="font-sans text-lg font-semibold text-ink">{t("search.filters")}</h2>
        <Link
          href={{ pathname: basePath, query: filters.q ? { q: filters.q } : {} }}
          className="text-sm text-blue-800 hover:underline"
        >
          {t("search.clear")}
        </Link>
      </div>

      <fieldset>
        <legend className={LABEL}>{t("search.category")}</legend>
        <MoreToggle
          more={hidden.map(categoryRow)}
          showLabel={t("search.moreCategories", { count: hidden.length })}
          hideLabel={t("search.fewerCategories")}
        >
          {visible.map(categoryRow)}
        </MoreToggle>
      </fieldset>

      <fieldset>
        <legend className={LABEL}>{t("search.type")}</legend>
        {TYPES.map((type) => (
          <label
            key={type}
            className="flex min-h-9 cursor-pointer items-center gap-3 text-[15px] text-ink"
          >
            <input
              type="checkbox"
              name="tur"
              value={type}
              form={f}
              defaultChecked={filters.types.includes(type)}
              data-autosubmit
              className="size-[18px] accent-blue-800"
            />
            {t(`article.types.${type}`)}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className={LABEL}>{t("search.year")}</legend>
        <div className="flex items-center gap-2">
          <select
            name="yildan"
            form={f}
            defaultValue={filters.yearFrom ?? ""}
            data-autosubmit
            aria-label={t("search.yearFrom")}
            className={SELECT}
          >
            <option value="">{t("search.any")}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span aria-hidden className="text-muted">
            —
          </span>
          <select
            name="yilgacha"
            form={f}
            defaultValue={filters.yearTo ?? ""}
            data-autosubmit
            aria-label={t("search.yearTo")}
            className={SELECT}
          >
            <option value="">{t("search.any")}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend className={LABEL}>{t("search.language")}</legend>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <label key={l} className="cursor-pointer">
              <input
                type="checkbox"
                name="til"
                value={l}
                form={f}
                defaultChecked={filters.languages.includes(l)}
                data-autosubmit
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full border px-4 text-sm",
                  "border-border-strong bg-white text-ink peer-checked:border-blue-800 peer-checked:bg-blue-800 peer-checked:text-white",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-800",
                )}
              >
                {t(`search.languages.${l}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="filter-issue" className={LABEL}>
          {t("search.issue")}
        </label>
        <select
          id="filter-issue"
          name="son"
          form={f}
          defaultValue={filters.issue ?? ""}
          data-autosubmit
          className={SELECT}
        >
          <option value="">{t("search.allIssues")}</option>
          {issues.map((i) => (
            <option key={`${i.year}-${i.number}`} value={`${i.year}-${i.number}`}>
              {t("lists.issueTitle", { year: i.year, number: i.number })}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-institution" className={LABEL}>
          {t("search.institution")}
        </label>
        <input
          id="filter-institution"
          name="muassasa"
          form={f}
          defaultValue={filters.institution}
          placeholder={t("search.institutionPlaceholder")}
          data-autosubmit
          className="h-11 w-full rounded-control border border-border-strong bg-white px-3 text-[15px] text-ink placeholder:text-muted"
        />
      </div>
    </div>
  );
}
