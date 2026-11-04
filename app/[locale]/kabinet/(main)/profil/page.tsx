import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { signOutAction } from "@/app/[locale]/kirish/actions";
import { ProfileForm } from "@/components/cabinet/profile-form";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { requireCabinetUser } from "@/lib/auth/session";
import { maskPhone } from "@/lib/auth/identifiers";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cabinet" });
  return { title: t("profile"), robots: { index: false, follow: false } };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, "/kabinet/profil");
  const t = await getTranslations();
  const p = user.profile;

  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("cabinet.profile")}</h1>
      <p className="mt-2 text-text-2">{t("cabinet.profileLead")}</p>
      <section className={cn(cardClass, "mt-5 p-6")}>
        <ProfileForm
          initial={{
            fullName: p?.fullName ?? user.name ?? "",
            affiliation: p?.affiliation ?? "",
            position: p?.position ?? "",
            orcid: p?.orcid && /^\d{4}-/.test(p.orcid) ? p.orcid : "",
            bio: p?.bio ?? "",
            isPublic: p?.isPublic ?? true,
            needsConsent: !user.consentAt,
          }}
        />
      </section>
      <section
        className={cn(cardClass, "mt-4 flex flex-wrap items-center justify-between gap-4 p-6")}
      >
        <div>
          <h2 className="font-sans text-base font-semibold text-ink">{t("cabinet.contact")}</h2>
          <p className="mt-1 text-sm text-text-2">
            {[user.phone ? maskPhone(user.phone) : null, user.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.email ? (
            <Link href="/kabinet/parol" className={buttonClass("secondary", "md")}>
              {user.passwordHash ? t("password.titleChange") : t("password.title")}
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button type="submit" className={buttonClass("secondary", "md", "text-danger")}>
              {t("auth.logout")}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
