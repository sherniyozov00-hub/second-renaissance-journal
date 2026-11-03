import { getTranslations } from "next-intl/server";
import { Field, PageTitle, input, panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { PUBLIC_KEYS, secretStatuses, type SecretKey, type SecretStatus } from "@/lib/secrets";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { saveIntegrationsAction, testEmailAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.integrations"))("title") };
}

const GROUPS: { id: "email" | "google"; keys: SecretKey[] }[] = [
  { id: "email", keys: ["RESEND_API_KEY", "EMAIL_FROM"] },
  { id: "google", keys: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] },
];

const NOTICES = ["saqlandi", "yuborildi", "ulanmagan", "xato", "email_yoq"] as const;

/** Email (Resend) and Google sign-in keys, pasted here instead of the server .env. */
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ natija?: string }>;
}) {
  await requireAdmin("/admin/integratsiyalar");
  const { natija } = await searchParams;
  const statuses = new Map((await secretStatuses()).map((s) => [s.key, s]));
  const t = await getTranslations("admin.integrations");
  const tc = await getTranslations("admin.common");
  const site = siteConfig.url.replace(/\/$/, "");
  const domain = site.replace(/^https?:\/\//, "");
  const notice = NOTICES.find((n) => n === natija);

  return (
    <>
      <PageTitle title={t("title")} />
      <p className="mt-2 max-w-3xl text-sm text-text-2">{t("lead")}</p>
      {notice ? (
        <p
          role="status"
          className={cn(
            "mt-4 rounded-control px-4 py-3 text-sm font-semibold",
            notice === "saqlandi" || notice === "yuborildi"
              ? "bg-success-bg text-success"
              : "bg-warning-bg text-ink",
          )}
        >
          {notice === "saqlandi" ? tc("saved") : t(`notice_${notice}`)}
        </p>
      ) : null}

      <form action={saveIntegrationsAction} className="mt-5 space-y-5">
        {GROUPS.map((g) => (
          <section key={g.id} className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">{t(`g_${g.id}`)}</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-2">
              {(t.raw(`steps_${g.id}`) as string[]).map((step, i) => (
                <li key={i}>
                  {step
                    .replaceAll("{domain}", domain)
                    .replaceAll("{callback}", `${site}/api/auth/callback/google`)
                    .replaceAll("{site}", site)}
                </li>
              ))}
            </ol>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {g.keys.map((key) => (
                <SecretField key={key} status={statuses.get(key)!} t={t} />
              ))}
            </div>
          </section>
        ))}
        <button className={buttonClass("primary", "lg")}>{tc("save")}</button>
      </form>

      <form action={testEmailAction} className={cn(panel, "mt-5 p-5")}>
        <h2 className="font-sans text-lg font-semibold">{t("test_title")}</h2>
        <p className="mt-1 text-sm text-text-2">{t("test_lead")}</p>
        <button className={buttonClass("secondary", "md", "mt-3")}>{t("test_button")}</button>
      </form>
    </>
  );
}

function SecretField({
  status,
  t,
}: {
  status: SecretStatus;
  t: Awaited<ReturnType<typeof getTranslations<"admin.integrations">>>;
}) {
  const isPublic = PUBLIC_KEYS.includes(status.key);
  const state =
    status.source === "env"
      ? t("state_env")
      : status.source === "panel"
        ? t("state_set", { hint: status.hint })
        : t("state_none");
  return (
    <Field label={t(`k_${status.key}`)} hint={state}>
      <input
        name={status.key}
        type={isPublic ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        disabled={status.source === "env"}
        defaultValue={isPublic && status.source === "panel" ? status.hint : ""}
        placeholder={
          isPublic ? t(`ph_${status.key}`) : status.hint ? t("ph_keep") : t(`ph_${status.key}`)
        }
        className={cn(input, "w-full font-mono text-sm")}
      />
      {status.source === "panel" ? (
        <label className="mt-1.5 flex items-center gap-2 text-xs text-text-2">
          <input type="checkbox" name={`${status.key}__clear`} value="1" />
          {t("clear")}
        </label>
      ) : null}
    </Field>
  );
}
