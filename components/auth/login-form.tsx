"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { googleSignInAction, loginAction, type LoginState } from "@/app/[locale]/kirish/actions";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { maskPhone } from "@/lib/auth/identifiers";
import { cn } from "@/lib/utils";

const INPUT =
  "mt-1.5 h-12 w-full rounded-control border border-border-strong bg-white px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-blue-800";

export function LoginForm({
  next,
  googleEnabled,
  phoneEnabled,
}: {
  next: string;
  googleEnabled: boolean;
  phoneEnabled: boolean;
}) {
  const t = useTranslations("auth");
  const [channel, setChannel] = useState<"PHONE" | "EMAIL">("EMAIL");
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {
    step: "identify",
  });
  const error = state.error ?? null;

  if (state.step === "verify") {
    const shown = state.channel === "PHONE" ? maskPhone(state.target) : state.target;
    return (
      <form action={action} className="mt-6 space-y-4" key="verify">
        <input type="hidden" name="next" value={next} />
        <p className="rounded-control bg-blue-50 px-3.5 py-3 text-sm text-ink" role="status">
          {state.channel === "PHONE"
            ? t("codeSentPhone", { target: shown })
            : t("codeSentEmail", { target: shown })}
        </p>
        <label className="block text-sm font-semibold text-ink">
          {t("codeLabel")}
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            className={cn(INPUT, "text-center font-mono text-2xl tracking-[0.4em]")}
          />
        </label>
        {error ? <ErrorText code={error} /> : null}
        <button
          type="submit"
          name="intent"
          value="verify"
          disabled={pending}
          className={buttonClass("primary", "lg", "w-full")}
        >
          {t("verify")}
        </button>
        <button
          type="submit"
          name="intent"
          value="restart"
          formNoValidate
          className="w-full text-sm font-semibold text-blue-800 hover:underline"
        >
          {t("change")}
        </button>
      </form>
    );
  }

  return (
    <div className="mt-6">
      {googleEnabled ? (
        <>
          <form action={googleSignInAction}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={buttonClass("secondary", "lg", "w-full gap-3")}>
              <GoogleIcon />
              {t("google")}
            </button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" /> {t("orEmail")}{" "}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      {phoneEnabled ? (
        <div
          role="tablist"
          className="grid grid-cols-2 rounded-control border border-border-strong p-1"
        >
          {(["EMAIL", "PHONE"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={channel === c}
              onClick={() => setChannel(c)}
              className={cn(
                "min-h-10 rounded-[4px] text-sm font-semibold",
                channel === c ? "bg-blue-800 text-white" : "text-text-2",
              )}
            >
              {c === "PHONE" ? t("phone") : t("email")}
            </button>
          ))}
        </div>
      ) : null}

      <form
        action={action}
        className={cn("space-y-4", phoneEnabled && "mt-5")}
        key={`identify-${channel}`}
      >
        <input type="hidden" name="channel" value={channel} />
        {channel === "PHONE" ? (
          <label className="block text-sm font-semibold text-ink">
            {t("phoneLabel")}
            <span className="mt-1.5 flex items-center rounded-control border border-border-strong focus-within:border-blue-800">
              <span className="pl-3.5 text-base text-text-2">+998</span>
              <input
                name="target"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t("phonePlaceholder")}
                required
                className="h-12 min-w-0 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-muted"
              />
            </span>
          </label>
        ) : (
          <label className="block text-sm font-semibold text-ink">
            {t("emailLabel")}
            <input
              name="target"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              required
              className={INPUT}
            />
          </label>
        )}

        <label className="flex items-start gap-3 text-sm text-text-2">
          <input
            type="checkbox"
            name="consent"
            value="1"
            required
            className="mt-0.5 size-[18px] accent-blue-800"
          />
          <span>
            {t.rich("consent", {
              privacy: (chunks) => (
                <Link href="/maxfiylik" className="text-blue-800 underline" target="_blank">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>

        {error ? <ErrorText code={error} /> : null}
        <button
          type="submit"
          name="intent"
          value="request"
          disabled={pending}
          className={buttonClass("primary", "lg", "w-full")}
        >
          {t("sendCode")}
        </button>
      </form>
    </div>
  );
}

function ErrorText({ code }: { code: string }) {
  const t = useTranslations("auth.errors");
  return (
    <p role="alert" className="rounded-control bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
      {t.has(code) ? t(code, { sec: 60 }) : t("send_failed")}
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
