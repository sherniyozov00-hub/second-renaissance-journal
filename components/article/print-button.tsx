"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/styles";

export function PrintButton() {
  const t = useTranslations("article");
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary", "md")}>
      <Download className="size-4" aria-hidden /> {t("downloadPdf")}
    </button>
  );
}
