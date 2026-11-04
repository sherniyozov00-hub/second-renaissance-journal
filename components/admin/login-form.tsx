"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { staffLoginAction, type StaffLoginState } from "@/app/admin/kirish/actions";
import { buttonClass } from "@/components/ui/styles";
import { cn } from "@/lib/utils";

const INPUT =
  "mt-1.5 h-12 w-full rounded-control border border-border-strong bg-white px-3.5 text-base text-ink outline-none focus:border-blue-800";

/** Admin panel sign-in: email + admin password; the first password is set by email code. */
export function StaffLoginForm({ next }: { next: string }) {
  const t = useTranslations("admin.login");
  const [state, action, pending] = useActionState<StaffLoginState, FormData>(staffLoginAction, {
    step: "login",
  });
  const err = state.error ? (
    <p role="alert" className="rounded-control bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
      {t.has(`err_${state.error}`) ? t(`err_${state.error}`) : t("err_generic")}
    </p>
  ) : null;
  const info = state.info ? (
    <p role="status" className="rounded-control bg-blue-50 px-3.5 py-2.5 text-sm text-ink">
      {t(`info_${state.info}`, { email: state.email ?? "" })}
    </p>
  ) : null;

  return (
    <form action={action} className="mt-6 space-y-4" key={state.step}>
      <input type="hidden" name="next" value={next} />
      {info}
      <label className="block text-sm font-semibold text-ink">
        {t("email")}
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          readOnly={state.step === "verify"}
          className={cn(INPUT, state.step === "verify" && "bg-blue-50")}
        />
      </label>

      {state.step === "login" ? (
        <>
          <label className="block text-sm font-semibold text-ink">
            {t("password")}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={INPUT}
            />
          </label>
          {err}
          <button
            name="intent"
            value="login"
            disabled={pending}
            className={buttonClass("primary", "lg", "w-full")}
          >
            {t("signIn")}
          </button>
          <button
            name="intent"
            value="toReset"
            formNoValidate
            className="w-full text-sm font-semibold text-blue-800 hover:underline"
          >
            {t("forgot")}
          </button>
        </>
      ) : null}

      {state.step === "reset" ? (
        <>
          <p className="text-sm text-text-2">{t("resetLead")}</p>
          {err}
          <button
            name="intent"
            value="sendCode"
            disabled={pending}
            className={buttonClass("primary", "lg", "w-full")}
          >
            {t("sendCode")}
          </button>
          <button
            name="intent"
            value="toLogin"
            formNoValidate
            className="w-full text-sm font-semibold text-blue-800 hover:underline"
          >
            {t("back")}
          </button>
        </>
      ) : null}

      {state.step === "verify" ? (
        <>
          <label className="block text-sm font-semibold text-ink">
            {t("code")}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              className={cn(INPUT, "text-center font-mono text-2xl tracking-[0.4em]")}
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            {t("newPassword")}
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={INPUT}
            />
            <span className="mt-1 block text-xs font-normal text-text-2">{t("passwordRule")}</span>
          </label>
          <label className="block text-sm font-semibold text-ink">
            {t("newPassword2")}
            <input
              name="password2"
              type="password"
              autoComplete="new-password"
              required
              className={INPUT}
            />
          </label>
          {err}
          <button
            name="intent"
            value="setPassword"
            disabled={pending}
            className={buttonClass("primary", "lg", "w-full")}
          >
            {t("savePassword")}
          </button>
          <button
            name="intent"
            value="toLogin"
            formNoValidate
            className="w-full text-sm font-semibold text-blue-800 hover:underline"
          >
            {t("back")}
          </button>
        </>
      ) : null}
    </form>
  );
}
