"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { signOutAction } from "@/app/[locale]/kirish/actions";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/styles";
import { LocaleSwitcher } from "./locale-switcher";
import { NAV_ITEMS } from "./nav-items";

export function MobileMenu({ signedIn = false }: { signedIn?: boolean }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("common.closeMenu") : t("common.openMenu")}
        className="flex size-11 items-center justify-center rounded-card border border-border-strong text-ink"
      >
        {open ? (
          <X className="size-5" strokeWidth={2} />
        ) : (
          <Menu className="size-5" strokeWidth={2} />
        )}
      </button>

      {open ? (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-40 border-b border-border bg-white shadow-lg"
        >
          <nav className="container-site flex flex-col py-3" onClick={close}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center border-b border-border py-2 text-base text-ink last:border-0"
              >
                {t(item.label)}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-3 pb-2">
              <Link href="/kabinet/yuborish" className={buttonClass("primary", "lg")}>
                {t("common.submit")}
              </Link>
              {signedIn ? (
                <>
                  <Link href="/kabinet" className={buttonClass("secondary", "lg")}>
                    {t("nav.cabinet")}
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className={buttonClass("secondary", "lg", "w-full text-danger")}
                    >
                      {t("auth.logout")}
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/kirish" className={buttonClass("secondary", "lg")}>
                  {t("common.login")}
                </Link>
              )}
              <Suspense>
                <LocaleSwitcher tone="light" className="justify-center pt-2 text-sm" />
              </Suspense>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
