"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveProfileAction, type ProfileState } from "@/app/[locale]/kabinet/actions";
import { buttonClass } from "@/components/ui/styles";

const INPUT =
  "mt-1.5 h-11 w-full rounded-control border border-border-strong bg-white px-3 text-[15px] text-ink outline-none focus:border-blue-800";

type Initial = {
  fullName: string;
  affiliation: string;
  position: string;
  orcid: string;
  bio: string;
  interests: string;
  phone: string;
  isPublic: boolean;
  needsConsent: boolean;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const t = useTranslations("cabinet");
  const ta = useTranslations("auth");
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold text-ink">
        {t("fullName")}
        <input
          name="fullName"
          defaultValue={initial.fullName}
          required
          minLength={3}
          className={INPUT}
        />
        {state.errors?.name ? (
          <span className="mt-1 block text-sm text-danger">{t("errors.name")}</span>
        ) : null}
      </label>
      <label className="block text-sm font-semibold text-ink">
        {t("affiliation")}
        <input
          name="affiliation"
          defaultValue={initial.affiliation}
          placeholder={t("affiliationPlaceholder")}
          className={INPUT}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          {t("position")}
          <input
            name="position"
            defaultValue={initial.position}
            placeholder={t("positionPlaceholder")}
            className={INPUT}
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          {t("phone")}
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            defaultValue={initial.phone}
            placeholder="+998 90 123 45 67"
            className={INPUT}
            aria-describedby="phone-hint"
          />
          <span id="phone-hint" className="mt-1 block text-xs font-normal text-muted">
            {t("phoneHint")}
          </span>
          {state.errors?.phone ? (
            <span className="mt-1 block text-sm text-danger">{t("errors.phone")}</span>
          ) : null}
        </label>
        <label className="block text-sm font-semibold text-ink">
          {t("orcid")}
          <input
            name="orcid"
            defaultValue={initial.orcid}
            placeholder="0000-0000-0000-0000"
            className={INPUT}
            aria-describedby="orcid-hint"
          />
          <span id="orcid-hint" className="mt-1 block text-xs font-normal text-muted">
            {t("orcidHint")}
          </span>
          {state.errors?.orcid ? (
            <span className="mt-1 block text-sm text-danger">{t("errors.orcid")}</span>
          ) : null}
        </label>
      </div>
      <label className="block text-sm font-semibold text-ink">
        {t("interests")}
        <input
          name="interests"
          defaultValue={initial.interests}
          maxLength={300}
          placeholder={t("interestsPlaceholder")}
          className={INPUT}
        />
      </label>
      <label className="block text-sm font-semibold text-ink">
        {t("bio")}
        <textarea
          name="bio"
          defaultValue={initial.bio}
          rows={4}
          maxLength={1000}
          className="mt-1.5 w-full rounded-control border border-border-strong bg-white px-3 py-2 text-[15px] text-ink outline-none focus:border-blue-800"
        />
      </label>
      <label className="flex items-center gap-3 text-[15px] text-ink">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={initial.isPublic}
          className="size-[18px] accent-blue-800"
        />
        {t("isPublic")}
      </label>
      {initial.needsConsent ? (
        <label className="flex items-start gap-3 text-sm text-text-2">
          <input
            type="checkbox"
            name="consent"
            value="1"
            required
            className="mt-0.5 size-[18px] accent-blue-800"
          />
          <span>
            {ta.rich("consent", { privacy: (c) => <span className="text-blue-800">{c}</span> })}
          </span>
        </label>
      ) : null}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
          {t("save")}
        </button>
        {state.ok ? (
          <span role="status" className="text-sm font-semibold text-success">
            {t("saved")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
