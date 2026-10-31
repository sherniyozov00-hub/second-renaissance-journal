import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { StaffLocaleSwitcher } from "@/components/admin/locale-switcher";
import { ADMIN_NAV, AdminNav } from "@/components/admin/nav";
import { LogoMark } from "@/components/brand/logo";
import { requireEditor } from "@/lib/admin/auth";

/** Ekran 8: dark sidebar on the left, content on the right. Uzbek, Russian or English. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireEditor();
  const t = await getTranslations("admin.common");
  const isAdmin = user.roles.includes("ADMIN");
  const items = ADMIN_NAV.filter((i) => isAdmin || !i.adminOnly).map((i) => ({
    href: i.href,
    label: t(`nav_${i.key}`),
  }));
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-blue-900 px-4 py-6 md:sticky md:top-0 md:h-screen md:w-[240px] md:shrink-0 md:overflow-y-auto">
        <Link href="/admin" className="flex items-center gap-2.5 px-3 text-white">
          <LogoMark variant="footer" className="size-5" />
          <span className="font-sans text-lg leading-tight font-bold">{t("brand")}</span>
        </Link>
        <nav className="mt-6" aria-label="Admin">
          <AdminNav items={items} />
        </nav>
        <div className="mt-6 px-1">
          <StaffLocaleSwitcher />
        </div>
        <p className="mt-4 px-3 text-xs text-blue-50/60">
          {user.name ?? user.phone} ·{" "}
          <Link href="/" className="underline">
            {t("site")}
          </Link>
        </p>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
