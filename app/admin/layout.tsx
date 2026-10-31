import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: `%s — Admin · ${siteConfig.wordmark}` },
  robots: { index: false, follow: false },
};

/** Root layout of the admin panel (not localised, not indexed — TZ 5). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={fontVariables}>
      <body className="bg-blue-50">{children}</body>
    </html>
  );
}
