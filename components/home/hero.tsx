import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { getPathname, Link } from "@/i18n/navigation";
import { AiDemoCard } from "./ai-demo-card";
import { SearchInput } from "./search-input";

const POPULAR = ["agrotexnologiya", "sun’iy intellekt", "startap", "tibbiyot", "moliya"];

export function SearchForm({
  action,
  placeholder,
  placeholderShort,
  submitLabel,
  defaultValue,
  showButtonOnMobile = false,
}: {
  /** Locale-aware URL of the articles page. */
  action: string;
  placeholder: string;
  placeholderShort: string;
  submitLabel: string;
  defaultValue?: string;
  showButtonOnMobile?: boolean;
}) {
  return (
    <form action={action} method="get" role="search" className="relative">
      <div className="flex items-center rounded-card border border-border-strong bg-white p-2 pl-4 md:pl-5">
        <Search className="size-[18px] shrink-0 text-muted" strokeWidth={2} aria-hidden />
        <SearchInput
          id="site-search"
          placeholder={placeholder}
          placeholderShort={placeholderShort}
          defaultValue={defaultValue}
        />
        <button
          type="submit"
          className={buttonClass(
            "primary",
            "lg",
            showButtonOnMobile ? "" : "hidden md:inline-flex",
          )}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export async function Hero() {
  const t = await getTranslations();
  const locale = await getLocale();

  return (
    <section className="border-b border-border bg-blue-50">
      <div className="container-site grid gap-8 py-10 md:py-16 lg:grid-cols-[1fr_400px] lg:gap-16 lg:py-[64px]">
        <div>
          <p className="eyebrow">
            <span className="md:hidden">{t("home.eyebrowMobile")}</span>
            <span className="hidden md:inline">{t("home.eyebrow")}</span>
          </p>
          <h1 className="mt-4 max-w-[680px] text-hero-mobile md:text-hero">{t("home.title")}</h1>
          <p className="mt-5 max-w-[590px] text-base leading-relaxed text-text-2 md:text-lg md:leading-[1.65]">
            <span className="md:hidden">{t("home.leadMobile")}</span>
            <span className="hidden md:inline">{t("home.lead")}</span>
          </p>

          <div className="mt-8 max-w-[698px]">
            <SearchForm
              action={getPathname({ href: "/maqolalar", locale })}
              placeholder={t("common.searchPlaceholder")}
              placeholderShort={t("common.searchPlaceholderShort")}
              submitLabel={t("common.search")}
            />
          </div>

          <div className="mt-4 hidden flex-wrap items-center gap-2 text-sm text-text-2 md:flex">
            <span>{t("home.popular")}</span>
            {POPULAR.map((q) => (
              <Link
                key={q}
                href={{ pathname: "/maqolalar", query: { q } }}
                className={chipClass(false, "text-sm")}
              >
                {q}
              </Link>
            ))}
          </div>
        </div>

        <AiDemoCard className="lg:mt-4" />
      </div>
    </section>
  );
}
