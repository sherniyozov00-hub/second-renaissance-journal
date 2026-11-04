import type { AiQuota } from "@/lib/queries/cabinet";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/styles";
import { cn } from "@/lib/utils";
import { CabinetNav } from "./nav";

type SidebarUser = {
  roles: string[];
  name: string | null;
  phone: string | null;
  email: string | null;
  profile: {
    slug: string;
    fullName: string;
    affiliation: string | null;
    position: string | null;
    orcid: string | null;
    phone: string | null;
    interests: string | null;
    avatarUrl: string | null;
    isPublic: boolean;
  } | null;
};

/** Left column of Ekran 7: profile card, menu and Xorazmiy AI limit. */
export async function CabinetSidebar({
  user,
  quota,
  domain,
}: {
  user: SidebarUser;
  quota: AiQuota;
  domain: string;
}) {
  const t = await getTranslations("cabinet");
  const name = user.profile?.fullName ?? user.name ?? user.phone ?? user.email ?? "";
  const p = user.profile;
  const steps = [
    p,
    p?.avatarUrl,
    p?.affiliation,
    p?.position,
    p?.phone || user.phone,
    p?.interests,
  ];
  const done = steps.filter(Boolean).length;
  const meta = [user.profile?.affiliation, user.profile?.position].filter(Boolean).join(" · ");
  const premium = Boolean(quota.premiumUntil);
  const percent = premium
    ? Math.round(((quota.premiumArticles - quota.premiumWorks) / quota.premiumArticles) * 100)
    : quota.limit
      ? Math.round((quota.left / quota.limit) * 100)
      : 0;

  return (
    <aside className="space-y-4">
      <section className={cn(cardClass, "p-6")}>
        <Avatar name={name} src={p?.avatarUrl} className="size-[72px] text-[28px]" />
        <h2 className="mt-3 font-sans text-xl font-semibold [overflow-wrap:anywhere] break-words text-ink">
          {name}
        </h2>
        {meta ? <p className="mt-2 text-sm text-text-2">{meta}</p> : null}
        {user.profile?.orcid ? (
          <p className="mt-0.5 text-sm text-text-2">ORCID: {user.profile.orcid}</p>
        ) : null}
        {user.profile?.isPublic ? (
          <Link
            href={`/muallif/${user.profile.slug}`}
            className="mt-3 block text-sm font-semibold break-words text-blue-800 hover:underline"
          >
            {t("publicProfile")}
            <br />
            {domain}/muallif/{user.profile.slug}
          </Link>
        ) : null}
        {done < steps.length ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[13px] text-text-2">
              {t("profileProgress", { done, total: steps.length })}
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blue-50" aria-hidden>
              <div
                className="h-full rounded-full bg-blue-800"
                style={{ width: `${Math.round((done / steps.length) * 100)}%` }}
              />
            </div>
            <Link
              href="/kabinet/profil"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:underline"
            >
              {t("completeProfile")} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <Link
            href="/kabinet/profil"
            className="mt-3 inline-block text-sm text-text-2 hover:text-blue-800 hover:underline"
          >
            {t("editProfile")}
          </Link>
        )}
      </section>

      <CabinetNav />

      {user.roles.some((r) => r === "EDITOR" || r === "ADMIN" || r === "REVIEWER") ? (
        <nav aria-label="Staff" className="rounded-card border border-border bg-white p-2 text-sm">
          {user.roles.some((r) => r === "EDITOR" || r === "ADMIN") ? (
            <NextLink
              href="/admin"
              className="flex min-h-11 items-center rounded-control px-3.5 font-semibold text-blue-800 hover:bg-blue-50"
            >
              Admin panel →
            </NextLink>
          ) : null}
          {user.roles.includes("REVIEWER") ? (
            <NextLink
              href="/taqriz"
              className="flex min-h-11 items-center rounded-control px-3.5 font-semibold text-blue-800 hover:bg-blue-50"
            >
              Taqrizchi paneli →
            </NextLink>
          ) : null}
        </nav>
      ) : null}

      <section className="rounded-card bg-blue-900 p-5 text-white">
        <p className="text-[13px] text-blue-50/80">
          {premium ? t("premiumActive", { date: quota.premiumUntil!.slice(0, 10) }) : t("aiLimit")}
        </p>
        <p className="mt-1 text-[22px] font-bold">
          {premium
            ? t("premiumWorksLeft", {
                count: Math.max(0, quota.premiumArticles - quota.premiumWorks),
              })
            : t("aiLeft", { count: quota.left })}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
        </div>
        <Link
          href="/kabinet/ai-paket"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white hover:underline"
        >
          {premium ? t("premiumManage") : t("premiumGet")}{" "}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </aside>
  );
}
