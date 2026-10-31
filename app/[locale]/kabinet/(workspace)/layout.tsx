import { setRequestLocale } from "next-intl/server";

/** Xorazmiy AI workspace (Ekran 3): full screen with its own top bar. */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  return children;
}
