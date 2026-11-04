"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { setPasswordAction, type PasswordState } from "@/app/[locale]/kabinet/(main)/parol/actions";
import { buttonClass } from "@/components/ui/styles";

const INPUT =
  "mt-1.5 h-12 w-full rounded-control border border-border-strong bg-white px-3.5 text-base text-ink outline-none focus:border-blue-800";

export function PasswordForm({
  email,
  askCurrent,
  next,
}: {
  email: string;
  askCurrent: boolean;
  next: string;
}) {
  const t = useTranslations("password");
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPasswordAction, {});
  return (
    <form action={action} className="mt-5 max-w-[440px] space-y-4">
      <input type="hidden" name="next" value={next} />
      {/* Lets the browser's password manager save the pair. */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      {askCurrent ? (
        <label className="block text-sm font-semibold text-ink">
          {t("current")}
          <input
            name="current"
            type="password"
            autoComplete="current-password"
            required
            className={INPUT}
          />
        </label>
      ) : null}
      <label className="block text-sm font-semibold text-ink">
        {t("new")}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={INPUT}
        />
        <span className="mt-1 block text-xs font-normal text-text-2">{t("rule")}</span>
      </label>
      <label className="block text-sm font-semibold text-ink">
        {t("repeat")}
        <input
          name="password2"
          type="password"
          autoComplete="new-password"
          required
          className={INPUT}
        />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-control bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {t.has(`err_${state.error}`) ? t(`err_${state.error}`) : t("err_generic")}
        </p>
      ) : null}
      {state.ok ? (
        <p
          role="status"
          className="rounded-control bg-success-bg px-3.5 py-2.5 text-sm text-success"
        >
          {t("saved")}
        </p>
      ) : null}
      <button disabled={pending} className={buttonClass("primary", "lg")}>
        {t("save")}
      </button>
    </form>
  );
}
