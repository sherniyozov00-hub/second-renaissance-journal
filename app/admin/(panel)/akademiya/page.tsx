import Link from "next/link";
import { PageTitle, panel, td, th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Akademiya darslari" };

// Lesson editing (text editor, video, exercises) arrives with stage 7.
export default async function LessonsAdminPage() {
  await requireAdmin("/admin/akademiya");
  const lessons = await db.lesson.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <PageTitle title="Akademiya darslari" />
      <p className="mt-2 text-sm text-text-2">Darslarni tahrirlash 7-bosqichda qo‘shiladi.</p>
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {["#", "Dars", "Davomiylik", "Holat"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lessons.map((l, i) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className={td}>{i + 1}</td>
                <td className={td}>
                  <Link
                    href={`/akademiya/${l.slug}`}
                    target="_blank"
                    className="text-blue-800 hover:underline"
                  >
                    {l.title}
                  </Link>
                </td>
                <td className={td}>{l.durationMin} daq.</td>
                <td className={td}>{l.isPublished ? "e’lon qilingan" : "yashirin"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
