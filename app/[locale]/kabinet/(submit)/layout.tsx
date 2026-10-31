import { setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";

/** Submission and sandbox checkout (Ekran 6): full width, no cabinet sidebar. */
export default async function SubmitLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  return (
    <PageShell header="submit" narrow>
      <div className="min-h-[70vh] bg-blue-50">
        <div className="container-site py-8 lg:max-w-[1248px]">{children}</div>
      </div>
    </PageShell>
  );
}
