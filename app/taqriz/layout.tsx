import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Taqrizchi paneli",
  robots: { index: false, follow: false },
};

/** Reviewer panel: admin style, simplified (TZ 5). */
export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={fontVariables}>
      <body className="bg-blue-50">
        <header className="bg-blue-900">
          <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-5 text-white">
            <LogoMark variant="footer" className="size-6" />
            <Link href="/taqriz" className="font-sans text-lg font-bold">
              Taqrizchi paneli
            </Link>
            <Link href="/" className="ml-auto text-sm text-blue-50/80 hover:underline">
              Sayt
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1100px] p-5 md:py-8">{children}</main>
      </body>
    </html>
  );
}
