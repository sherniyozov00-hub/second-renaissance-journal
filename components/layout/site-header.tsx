import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { currentUser } from "@/lib/auth/session";
import { initials } from "@/lib/l10n";
import { getSetting } from "@/lib/settings/get";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";
import { COMPACT_NAV_ITEMS, NAV_ITEMS } from "./nav-items";

/**
 * "home" — top bar + full navigation (Ekran 1).
 * "compact" — no top bar, inner-page navigation and a search button (Ekran 4).
 */
export async function SiteHeader({
  variant = "compact",
  narrow = false,
}: {
  /** "minimal" — logo and submit button only (Ekran 5); "cabinet" — Ekran 7. */
  variant?: "home" | "compact" | "minimal" | "cabinet" | "submit";
  narrow?: boolean;
}) {
  const t = await getTranslations();
  const [issnValue, user] = await Promise.all([getSetting("journal.issn"), currentUser()]);
  const issn = String(issnValue);
  const items = variant === "home" ? NAV_ITEMS : COMPACT_NAV_ITEMS;

  return (
    <>
      {variant === "home" ? (
        <div className="hidden bg-blue-900 text-[13px] text-blue-50/90 md:block">
          <div className="container-site flex h-8 items-center justify-between">
            <p>{t("common.topBar", { issn })}</p>
            <div className="flex items-center gap-4">
              <Suspense>
                <LocaleSwitcher />
              </Suspense>
              <Link
                href={user ? "/kabinet" : "/kirish"}
                className="font-semibold text-white hover:underline"
              >
                {user ? t("nav.cabinet") : t("common.login")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <header className="relative border-b border-border bg-white">
        <div
          className={cn(
            "container-site flex h-[68px] items-center justify-between gap-6 md:h-[78px]",
            narrow && "lg:max-w-[1248px]",
          )}
        >
          <Link href="/">
            <Logo subtitle={t("common.journalLabel")} subtitleClassName="hidden md:inline" />
          </Link>

          <nav
            hidden={variant === "minimal" || variant === "cabinet" || variant === "submit"}
            aria-label={t("nav.home")}
            className="hidden items-center gap-[26px] text-[15px] text-ink md:flex lg:mr-16 lg:ml-auto"
          >
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-blue-800">
                {t(item.label)}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            {variant === "compact" ? (
              <Link
                href="/maqolalar"
                aria-label={t("nav.search")}
                className="flex size-11 items-center justify-center rounded-control border border-border-strong text-ink hover:bg-blue-50"
              >
                <Search className="size-4" strokeWidth={2} />
              </Link>
            ) : null}
            {variant === "submit" && user ? (
              <Link
                href="/kabinet"
                className="flex items-center gap-3 text-[15px] text-blue-800 hover:underline"
              >
                {t("cabinet.myArticles")}
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-full bg-info-bg text-sm font-semibold text-blue-800"
                >
                  {initials(user.profile?.fullName ?? user.name ?? "") || "?"}
                </span>
              </Link>
            ) : variant === "cabinet" ? (
              <>
                <Link href="/xorazmiy-ai" className={buttonClass("secondary", "md")}>
                  {t("nav.ai")}
                </Link>
                <Link href="/kabinet/yuborish" className={buttonClass("primary", "md")}>
                  {t("cabinet.newArticle")}
                </Link>
              </>
            ) : (
              <>
                {variant !== "home" ? (
                  <Link
                    href={user ? "/kabinet" : "/kirish"}
                    className="px-2 text-[15px] font-semibold text-blue-800 hover:underline"
                  >
                    {user ? t("nav.cabinet") : t("common.login")}
                  </Link>
                ) : null}
                <Link href="/kabinet/yuborish" className={buttonClass("primary", "md")}>
                  {t("common.submit")}
                </Link>
              </>
            )}
          </div>

          <MobileMenu />
        </div>
      </header>
    </>
  );
}
