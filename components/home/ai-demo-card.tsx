import { Check, Star, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function VerdictIcon({ kind }: { kind: "correct" | "wrong" | "source" }) {
  const base =
    "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-white";
  if (kind === "correct")
    return (
      <span className={cn(base, "bg-success")} aria-hidden>
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (kind === "wrong")
    return (
      <span className={cn(base, "bg-danger")} aria-hidden>
        <X className="size-3.5" strokeWidth={3} />
      </span>
    );
  return (
    <span className={cn(base, "bg-gold-text text-xs font-bold")} aria-hidden>
      ?
    </span>
  );
}

/**
 * Live-looking fact-check sample in the hero (Ekran 1 right, Ekran 2).
 * The interactive guest trial is wired in stage 6; the button opens /xorazmiy-ai.
 */
export async function AiDemoCard({ className }: { className?: string }) {
  const t = await getTranslations("aiCard");

  return (
    <section
      aria-label={t("name")}
      className={cn(
        "overflow-hidden rounded-ai border border-border bg-white shadow-xl shadow-blue-900/10",
        className,
      )}
    >
      <header className="flex items-center gap-3 bg-blue-900 px-5 py-4 text-white">
        <span
          className="flex size-9 items-center justify-center rounded-control bg-gold"
          aria-hidden
        >
          <Star className="size-[18px] text-blue-900" strokeWidth={2} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">{t("name")}</span>
          <span className="hidden text-xs text-blue-50/75 md:block">{t("subtitle")}</span>
        </span>
        <span className="ml-auto rounded-full bg-white/12 px-2.5 py-0.5 text-xs text-white">
          {t("badge")}
        </span>
      </header>

      <div className="space-y-3.5 p-5">
        <p className="rounded-card border border-border bg-blue-50/50 p-3.5 font-serif text-[15px] leading-relaxed text-ink md:text-base">
          <mark className="bg-success-bg text-ink">
            <span className="md:hidden">{t("sampleCorrectShort")}</span>
            <span className="hidden md:inline">{t("sampleCorrect")}</span>
          </mark>{" "}
          <mark className="bg-danger-bg text-ink">{t("sampleWrong")}</mark>{" "}
          <mark className="hidden bg-warning-bg text-ink md:inline">{t("sampleNeedsSource")}</mark>
        </p>

        <ul className="space-y-2.5 text-sm text-ink">
          <li className="flex gap-2.5">
            <VerdictIcon kind="correct" />
            <span>
              <strong className="font-semibold">{t("correct")}</strong> {t("correctText")}
            </span>
          </li>
          <li className="flex gap-2.5">
            <VerdictIcon kind="wrong" />
            <span>
              <strong className="font-semibold">{t("wrong")}</strong>{" "}
              <span className="md:hidden">{t("wrongTextShort")}</span>
              <span className="hidden md:inline">{t("wrongText")}</span>
            </span>
          </li>
          <li className="hidden gap-2.5 md:flex">
            <VerdictIcon kind="source" />
            <span>
              <strong className="font-semibold">{t("needsSource")}</strong> {t("needsSourceText")}
            </span>
          </li>
        </ul>

        <Link href="/xorazmiy-ai" className={buttonClass("primary", "lg", "w-full")}>
          {t("button")}
        </Link>
      </div>
    </section>
  );
}
