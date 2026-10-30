import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <PageShell>
      <div className="container-site section text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-section">{t("title")}</h1>
        <p className="mt-3 text-text-2">{t("text")}</p>
        <Link href="/" className={buttonClass("primary", "md", "mt-8")}>
          {t("home")}
        </Link>
      </div>
    </PageShell>
  );
}
