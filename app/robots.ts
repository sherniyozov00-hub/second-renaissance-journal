import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/** TZ 9.6: admin, cabinet, reviewer panel and API are closed to crawlers. */
export default function robots(): MetadataRoute.Robots {
  const closed = ["/admin", "/taqriz", "/kabinet", "/kirish", "/api/"];
  const localized = closed.filter((p) => p !== "/admin" && p !== "/taqriz" && p !== "/api/");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Article PDFs stay open: Scholar reads citation_pdf_url (TZ 9.5).
        disallow: [...closed, ...localized.flatMap((p) => [`/ru${p}`, `/en${p}`])],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
