import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/admin/articles";
import { canTransition } from "@/lib/editorial/workflow";
import { renderNotification } from "@/lib/notify/templates";

describe("status transitions (TZ 7)", () => {
  it("follows the life cycle", () => {
    expect(canTransition("AWAITING_PAYMENT", "UNDER_REVIEW")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "REVISION_REQUESTED")).toBe(true);
    expect(canTransition("REVISION_REQUESTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "ACCEPTED")).toBe(true);
    expect(canTransition("ACCEPTED", "PUBLISHED")).toBe(true);
  });
  it("refuses shortcuts and changes after the end", () => {
    expect(canTransition("UNDER_REVIEW", "PUBLISHED")).toBe(false);
    expect(canTransition("DRAFT", "ACCEPTED")).toBe(false);
    expect(canTransition("PUBLISHED", "REJECTED")).toBe(false);
    expect(canTransition("REJECTED", "UNDER_REVIEW")).toBe(false);
  });
});

describe("notifications (TZ 14)", () => {
  it("renders a status change with the editor's note", () => {
    const n = renderNotification(
      {
        kind: "status",
        status: "REVISION_REQUESTED",
        title: "Paxta",
        number: 140,
        note: "3-jadvalga manba qo‘shing.",
      },
      "uz",
    );
    expect(n.subject).toBe("Maqola #0140: tuzatish kerak");
    expect(n.text).toContain("«Paxta» — tuzatish kerak.");
    expect(n.text).toContain("Izoh: 3-jadvalga manba qo‘shing.");
  });
  it("uses the user's language", () => {
    expect(
      renderNotification({ kind: "status", status: "ACCEPTED", title: "X", number: 1 }, "ru")
        .subject,
    ).toBe("Статья #0001: принята");
    expect(
      renderNotification({ kind: "published", title: "X", url: "https://x.uz/maqola/x" }, "en")
        .text,
    ).toContain("https://x.uz/maqola/x");
  });
});

describe("CSV export", () => {
  it("adds a BOM, quotes special characters and uses CRLF", () => {
    const csv = toCsv([
      ["ID", "Sarlavha"],
      [1, 'Farg‘ona, "paxta"'],
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿ID,Sarlavha\r\n1,"Farg‘ona, ""paxta"""\r\n');
  });
});
