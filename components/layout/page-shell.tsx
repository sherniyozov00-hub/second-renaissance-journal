import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageShell({
  children,
  header = "compact",
  footer = "full",
  narrow = false,
}: {
  children: React.ReactNode;
  header?: "home" | "compact" | "minimal" | "cabinet" | "submit";
  footer?: "full" | "compact";
  /** 1200px content column (article page, Ekran 4) instead of 1240px. */
  narrow?: boolean;
}) {
  return (
    <>
      <SiteHeader variant={header} narrow={narrow} />
      <main id="main">{children}</main>
      <SiteFooter variant={footer} narrow={narrow} />
    </>
  );
}
