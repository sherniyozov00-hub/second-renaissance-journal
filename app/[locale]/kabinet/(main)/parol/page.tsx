import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PasswordForm } from "@/components/cabinet/password-form";
import { cardClass } from "@/components/ui/styles";
import { recentCodeSignIn, requireCabinetUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "password" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Set (after the first email-code sign-in or a reset) or change the site password. */
export default async function PasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, "/kabinet/parol");
  const { next } = await searchParams;
  const t = await getTranslations("password");
  const askCurrent = Boolean(user.passwordHash) && !(await recentCodeSignIn());
  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">
        {user.passwordHash ? t("titleChange") : t("title")}
      </h1>
      <p className="mt-2 max-w-[640px] text-text-2">
        {user.passwordHash ? t("leadChange") : t("lead", { email: user.email ?? "" })}
      </p>
      <section className={cn(cardClass, "mt-5 p-6")}>
        {user.email ? (
          <PasswordForm email={user.email} askCurrent={askCurrent} next={next ?? ""} />
        ) : (
          <p className="text-text-2">{t("noEmail")}</p>
        )}
      </section>
    </>
  );
}
