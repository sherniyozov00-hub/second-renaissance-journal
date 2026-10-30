import { Logo } from "@/components/brand/logo";
import { db } from "@/lib/db";

// Stage 0 placeholder: proves the stack (tokens, fonts, logo, database, seed)
// works end to end. Replaced by the real home page (Ekran 1, 2) in stage 1.
export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

async function getStats() {
  try {
    const [categories, articles, issues] = await Promise.all([
      db.category.count(),
      db.article.count({ where: { status: "PUBLISHED" } }),
      db.issue.count(),
    ]);
    return { ok: true as const, categories, articles, issues };
  } catch {
    return { ok: false as const };
  }
}

const SWATCHES = [
  ["blue-900", "bg-blue-900"],
  ["blue-800", "bg-blue-800"],
  ["blue-50", "bg-blue-50"],
  ["border", "bg-border"],
  ["border-strong", "bg-border-strong"],
  ["ink", "bg-ink"],
  ["text-2", "bg-text-2"],
  ["muted", "bg-muted"],
  ["gold", "bg-gold"],
  ["gold-text", "bg-gold-text"],
  ["success", "bg-success"],
  ["danger", "bg-danger"],
  ["warning", "bg-warning"],
  ["info-bg", "bg-info-bg"],
] as const;

export default async function Home() {
  const stats = await getStats();

  return (
    <>
      <div className="bg-blue-900 text-[13px] text-blue-50">
        <div className="container-site py-2">Elektron ilmiy jurnal · Ochiq kirish</div>
      </div>
      <header className="border-b border-border bg-white">
        <div className="container-site flex h-[76px] items-center">
          <Logo subtitle="Ilmiy jurnal" />
        </div>
      </header>

      <main className="bg-blue-50">
        <div className="container-site section">
          <p className="eyebrow">0-bosqich · Asos</p>
          <h1 className="mt-3 max-w-3xl text-hero-mobile md:text-hero">
            Ilmiy maqolangizni yozing, tekshiring va dunyoga chiqaring.
          </h1>
          <p className="mt-4 max-w-2xl text-text-2">
            Platforma asosi tayyor. Bosh sahifa 1-bosqichda Ekran 1 va 2 bo‘yicha quriladi.
          </p>

          <section className="mt-10 grid gap-4 md:grid-cols-3" aria-label="Ma’lumotlar bazasi">
            {stats.ok ? (
              <>
                <Stat label="Yo‘nalishlar" value={stats.categories} />
                <Stat label="Nashr qilingan maqolalar" value={stats.articles} />
                <Stat label="Jurnal sonlari" value={stats.issues} />
              </>
            ) : (
              <p className="rounded-card border border-border bg-danger-bg p-5 text-danger md:col-span-3">
                Ma’lumotlar bazasiga ulanib bo‘lmadi. README’dagi ishga tushirish qadamlarini
                tekshiring.
              </p>
            )}
          </section>

          <section className="mt-10" aria-label="Ranglar">
            <h2 className="text-section">Dizayn tokenlari</h2>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {SWATCHES.map(([name, cls]) => (
                <li key={name} className="rounded-card border border-border bg-white p-3">
                  <span className={`block h-10 rounded-control border border-border ${cls}`} />
                  <span className="mt-2 block text-[13px] text-muted">{name}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="bg-blue-900 text-blue-50">
        <div className="container-site py-10">
          <Logo variant="footer" />
        </div>
      </footer>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="font-serif text-3xl font-bold text-blue-900">{value}</div>
      <div className="mt-1 text-[13px] text-muted">{label}</div>
    </div>
  );
}
