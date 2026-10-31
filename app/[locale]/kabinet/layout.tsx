import { setRequestLocale } from "next-intl/server";
import { CabinetSidebar } from "@/components/cabinet/sidebar";
import { PageShell } from "@/components/layout/page-shell";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { getAiQuota } from "@/lib/queries/cabinet";
import { getSetting } from "@/lib/settings/get";

/** Author cabinet (Ekran 7). Every page below requires a signed-in user. */
export default async function CabinetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as AppLocale;
  const user = await requireUser(locale, getPathname({ href: "/kabinet", locale }));
  const [quota, domain] = await Promise.all([getAiQuota(user), getSetting("site.domain")]);

  return (
    <PageShell header="cabinet">
      <div className="min-h-[70vh] bg-blue-50">
        <div className="container-site grid gap-6 py-8 lg:grid-cols-[280px_1fr] lg:gap-7">
          <CabinetSidebar user={user} quota={quota} domain={String(domain)} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </PageShell>
  );
}
