import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { StaffLocaleSwitcher } from "@/components/admin/locale-switcher";
import { LogoMark } from "@/components/brand/logo";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.common");
  return { title: t("reviewerPanel"), robots: { index: false, follow: false } };
}

/** Reviewer panel: admin style, simplified (TZ 5). Uzbek, Russian or English. */
export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const [t, locale] = await Promise.all([getTranslations("admin.common"), getLocale()]);
  return (
    <html lang={locale} className={fontVariables}>
      <body className="bg-blue-50">
        <header className="bg-blue-900">
          <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-5 text-white">
            <LogoMark variant="footer" className="size-6" />
            <Link href="/taqriz" className="font-sans text-lg font-bold">
              {t("reviewerPanel")}
            </Link>
            <div className="ml-auto">
              <StaffLocaleSwitcher />
            </div>
            <Link href="/" className="text-sm text-blue-50/80 hover:underline">
              {t("siteTitle")}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1100px] p-5 md:py-8">{children}</main>
      </body>
    </html>
  );
}
