import "server-only";
import type { ArticleStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const ADMIN_PAGE_SIZE = 20;
const STATUSES: ArticleStatus[] = [
  "DRAFT",
  "AWAITING_PAYMENT",
  "UNDER_REVIEW",
  "REVISION_REQUESTED",
  "ACCEPTED",
  "PUBLISHED",
  "REJECTED",
];

export type AdminArticleFilters = {
  q: string;
  status: string;
  category: string;
  issue: string;
  page: number;
};

export function parseAdminFilters(sp: Record<string, string | undefined>): AdminArticleFilters {
  const page = Number(sp.page);
  return {
    q: (sp.q ?? "").trim().slice(0, 100),
    status: STATUSES.includes(sp.holat as ArticleStatus) ? sp.holat! : "",
    category: sp.yonalish ?? "",
    issue: sp.son ?? "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function where(f: AdminArticleFilters): Prisma.ArticleWhereInput {
  const and: Prisma.ArticleWhereInput[] = [{ status: { not: "DRAFT" } }];
  if (f.status) and.push({ status: f.status as ArticleStatus });
  if (f.category) and.push({ categoryId: f.category });
  if (f.issue) and.push({ issueId: f.issue });
  if (f.q) {
    const n = Number(f.q.replace(/^#/, ""));
    and.push({
      OR: [
        { titleUz: { contains: f.q, mode: "insensitive" } },
        { titleEn: { contains: f.q, mode: "insensitive" } },
        {
          authors: {
            some: { authorProfile: { fullName: { contains: f.q, mode: "insensitive" } } },
          },
        },
        { authors: { some: { name: { contains: f.q, mode: "insensitive" } } } },
        ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
      ],
    });
  }
  return { AND: and };
}

const listSelect = {
  id: true,
  number: true,
  titleUz: true,
  titleRu: true,
  titleEn: true,
  status: true,
  submittedAt: true,
  updatedAt: true,
  category: { select: { name: true } },
  issue: { select: { year: true, number: true } },
  authors: {
    orderBy: { order: "asc" },
    take: 1,
    select: { name: true, authorProfile: { select: { fullName: true } } },
  },
  payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, amount: true } },
} satisfies Prisma.ArticleSelect;

export async function listAdminArticles(f: AdminArticleFilters, take = ADMIN_PAGE_SIZE) {
  const w = where(f);
  const [items, total] = await Promise.all([
    db.article.findMany({
      where: w,
      orderBy: [{ number: "desc" }],
      skip: (f.page - 1) * take,
      take,
      select: listSelect,
    }),
    db.article.count({ where: w }),
  ]);
  return { items, total };
}

export type AdminArticleRow = Awaited<ReturnType<typeof listAdminArticles>>["items"][number];

/** Cards above the table (Ekran 8). */
export async function articleStats() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [fresh, awaiting, review, accepted, revenue] = await Promise.all([
    db.article.count({ where: { submittedAt: { gte: weekAgo }, status: { not: "DRAFT" } } }),
    db.article.count({ where: { status: "AWAITING_PAYMENT" } }),
    db.article.count({ where: { status: { in: ["UNDER_REVIEW", "REVISION_REQUESTED"] } } }),
    db.article.count({ where: { status: "ACCEPTED" } }),
    db.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);
  return { fresh, awaiting, review, accepted, revenue: revenue._sum.amount ?? 0 };
}

/** RFC 4180 CSV with a BOM so Excel opens Cyrillic and o‘/g‘ correctly. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}
