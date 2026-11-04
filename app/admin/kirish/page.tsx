import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { StaffLoginForm } from "@/components/admin/login-form";
import { LogoMark } from "@/components/brand/logo";
import { adminUser } from "@/lib/admin/session";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.login"))("title") };
}

/** /admin/kirish — the admin panel's own sign-in (separate from the site's). */
export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next?.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  if (await adminUser()) redirect(target);
  const t = await getTranslations("admin.login");
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-900 p-4">
      <div className="w-full max-w-[420px] rounded-card bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <div>
            <p className="font-serif text-lg font-bold text-ink">{t("brand")}</p>
            <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
              {t("panel")}
            </p>
          </div>
        </div>
        <h1 className="mt-6 font-serif text-[26px] text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-2">{t("lead")}</p>
        <NextIntlClientProvider>
          <StaffLoginForm next={target} />
        </NextIntlClientProvider>
      </div>
    </main>
  );
}
