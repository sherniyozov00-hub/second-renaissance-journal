import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { initials } from "@/lib/l10n";
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
  quota: { limit: number; left: number };
  domain: string;
}) {
  const t = await getTranslations("cabinet");
  const name = user.profile?.fullName ?? user.name ?? user.phone ?? user.email ?? "";
  const meta = [user.profile?.affiliation, user.profile?.position].filter(Boolean).join(" · ");
  const percent = quota.limit ? Math.round((quota.left / quota.limit) * 100) : 0;

  return (
    <aside className="space-y-4">
      <section className={cn(cardClass, "p-6")}>
        <span
          aria-hidden
          className="flex size-[72px] items-center justify-center rounded-full bg-info-bg font-serif text-[28px] font-bold text-blue-800"
        >
          {initials(name) || "?"}
        </span>
        <h2 className="mt-3 font-sans text-xl font-semibold text-ink">{name}</h2>
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
        <p className="text-[13px] text-blue-50/80">{t("aiLimit")}</p>
        <p className="mt-1 text-[22px] font-bold">{t("aiLeft", { count: quota.left })}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
        </div>
        <Link
          href="/xorazmiy-ai"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white hover:underline"
        >
          {t("aiRaise")} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </aside>
  );
}
