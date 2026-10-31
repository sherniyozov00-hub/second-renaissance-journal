import { saveUserRolesAction } from "@/app/admin/actions";
import { PageTitle, panel, td, th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export const metadata = { title: "Foydalanuvchilar va rollar" };

const ROLES = [
  ["AUTHOR", "Muallif"],
  ["REVIEWER", "Taqrizchi"],
  ["EDITOR", "Muharrir"],
  ["ADMIN", "Admin"],
] as const;

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; natija?: string }>;
}) {
  await requireAdmin("/admin/foydalanuvchilar");
  const { q = "", natija } = await searchParams;
  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageTitle title="Foydalanuvchilar va rollar" />
      {natija === "saqlandi" ? (
        <p className="mt-4 rounded-control bg-success-bg px-4 py-3 text-sm font-semibold text-success">
          Saqlandi va AuditLog’ga yozildi.
        </p>
      ) : null}
      {natija === "xato-self" ? (
        <p className="mt-4 rounded-control bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">
          O‘zingizdan admin rolini olib yoki o‘zingizni bloklay olmaysiz.
        </p>
      ) : null}
      <form className="mt-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Ism, telefon yoki email"
          aria-label="Qidirish"
          className="h-11 w-full max-w-md rounded-control border border-border-strong px-3"
        />
      </form>
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full min-w-[860px]">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {["Foydalanuvchi", "Ro‘yxatdan o‘tgan", "Rollar va bloklash"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className={cn(
                  "border-b border-border last:border-0",
                  u.isBlocked && "bg-danger-bg/40",
                )}
              >
                <td className={td}>
                  <p className="font-semibold">{u.name ?? "—"}</p>
                  <p className="text-text-2">{[u.phone, u.email].filter(Boolean).join(" · ")}</p>
                </td>
                <td className={td}>{formatDate(u.createdAt, "uz")}</td>
                <td className={td}>
                  <form action={saveUserRolesAction} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="userId" value={u.id} />
                    {ROLES.map(([r, label]) => (
                      <label key={r} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          name={`role-${r}`}
                          defaultChecked={u.roles.includes(r)}
                          className="accent-blue-800"
                        />{" "}
                        {label}
                      </label>
                    ))}
                    <label className="flex items-center gap-1.5 text-danger">
                      <input type="checkbox" name="isBlocked" defaultChecked={u.isBlocked} />{" "}
                      bloklangan
                    </label>
                    <button className="font-semibold text-blue-800 hover:underline">Saqlash</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
