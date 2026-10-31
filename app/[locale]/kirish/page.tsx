import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { googleEnabled } from "@/auth";
import { PageShell } from "@/components/layout/page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getPathname, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { safeNext } from "@/lib/auth/identifiers";
import { currentUser } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/kirish",
    title: t("title"),
    noindex: true,
  });
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const next = safeNext(
    (await searchParams).next,
    getPathname({ href: "/kabinet", locale: locale as AppLocale }),
  );
  // `next` is already a full (locale-prefixed) path.
  if (await currentUser()) redirect({ href: next, locale: "uz" as AppLocale });
  const t = await getTranslations("auth");

  return (
    <PageShell>
      <div className="bg-blue-50">
        <div className="container-site flex justify-center py-10 md:py-16">
          <div className="w-full max-w-[440px] rounded-card border border-border bg-white p-6 md:p-8">
            <h1 className="text-[28px] leading-tight">{t("title")}</h1>
            <p className="mt-2 text-[15px] text-text-2">{t("lead")}</p>
            <LoginForm next={next} googleEnabled={googleEnabled} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
