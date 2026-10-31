"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { uploadAction, type UploadState } from "@/app/[locale]/kabinet/(submit)/yuborish/actions";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";

/** New manuscript version after "Tuzatish kerak" (TZ 7). */
export function RevisionUpload({ articleId }: { articleId: string }) {
  const t = useTranslations("submit");
  const [state, setState] = useState<UploadState | null>(null);
  const [pending, start] = useTransition();

  if (state?.ok) {
    return (
      <div className="mt-6 rounded-card border border-border bg-white p-6">
        <p role="status" className="font-semibold text-success">
          {t("revisionDone")}
        </p>
        <Link href="/kabinet" className={buttonClass("primary", "md", "mt-4")}>
          {t("myArticles")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-card border border-border bg-white p-6">
      <label className="flex cursor-pointer flex-col items-center rounded-card border-2 border-dashed border-border-strong px-4 py-10 text-center hover:border-blue-800">
        <Upload className="size-6 text-blue-800" aria-hidden />
        <span className="mt-2 font-semibold text-ink">
          {pending ? t("uploading") : t("dropTitle")}
        </span>
        <input
          type="file"
          accept=".docx"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            start(async () => {
              const data = new FormData();
              data.set("articleId", articleId);
              data.set("file", f);
              setState(await uploadAction(data));
            });
          }}
        />
      </label>
      {state && !state.ok ? (
        <p role="alert" className="mt-3 rounded-control bg-danger-bg px-3 py-2 text-sm text-danger">
          {t(`fileErrors.${state.error}`)}
        </p>
      ) : null}
    </div>
  );
}
