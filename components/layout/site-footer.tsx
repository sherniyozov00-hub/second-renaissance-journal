import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/lib/settings/get";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const YEAR = new Date().getFullYear();

/** "full" — Ekran 1 footer with link columns; "compact" — Ekran 4 article footer. */
export async function SiteFooter({
  variant = "full",
  narrow = false,
}: {
  variant?: "full" | "compact";
  narrow?: boolean;
}) {
  const t = await getTranslations();

  if (variant === "compact") {
    return (
      <footer className="bg-blue-900 text-blue-50">
        <div
          className={cn(
            "container-site flex flex-col gap-3 py-7 md:flex-row md:items-center md:justify-between",
            narrow && "lg:max-w-[1248px]",
          )}
        >
          <p className="font-serif text-xl font-bold text-white">{siteConfig.name}</p>
          <p className="text-sm text-blue-50/85">
            © {YEAR} {siteConfig.name} · {t("article.license")}
          </p>
        </div>
      </footer>
    );
  }

  const s = await getSettings();
  const columns = [
    {
      title: t("footer.journal"),
      links: [
        { href: "/biz-haqimizda", label: t("footer.about") },
        { href: "/tahrir-hayati", label: t("footer.board") },
        { href: "/nashr-siyosati", label: t("footer.policy") },
        { href: "/oferta", label: t("footer.offer") },
      ],
    },
    {
      title: t("footer.forAuthors"),
      links: [
        { href: "/mualliflarga", label: t("footer.requirements") },
        { href: "/xorazmiy-ai", label: t("footer.ai") },
        { href: "/narxlar", label: t("footer.prices") },
        { href: "/savollar", label: t("footer.faq") },
      ],
    },
  ];

  return (
    <footer className="bg-blue-900 text-blue-50">
      <div className="container-site flex flex-col gap-10 pt-14 pb-10 md:flex-row md:justify-between">
        <div>
          <Logo variant="footer" />
          <p className="mt-4 text-sm text-blue-50/90">{t("common.tagline")}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 text-sm sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="font-sans text-sm font-semibold text-white">{col.title}</h2>
              <ul className="mt-2 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-blue-50/90 hover:text-white hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="font-sans text-sm font-semibold text-white">{t("footer.contact")}</h2>
            <ul className="mt-2 space-y-1.5 text-blue-50/90">
              <li>{String(s["contacts.email"])}</li>
              <li>{String(s["contacts.phone"])}</li>
              <li>{t("footer.telegram", { channel: String(s["contacts.telegramChannel"]) })}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="container-site">
        <div className="flex flex-col gap-2 border-t border-white/10 py-5 text-[13px] text-blue-50/85 sm:flex-row sm:justify-between">
          <p>
            © {YEAR} {siteConfig.name}
          </p>
          <Link href="/maxfiylik" className="hover:text-white hover:underline">
            {t("footer.privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
