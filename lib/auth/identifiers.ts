/** Uzbekistan mobile numbers: +998 followed by 9 digits. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("998") ? digits.slice(3) : digits;
  return /^\d{9}$/.test(local) ? `+998${local}` : null;
}

/** "+998901234567" → "+998 90 *** ** 67" for display in UI and logs. */
export function maskPhone(phone: string): string {
  const m = /^\+998(\d{2})\d{5}(\d{2})$/.exec(phone);
  return m ? `+998 ${m[1]} *** ** ${m[2]}` : phone;
}

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254 ? email : null;
}

/** Only same-site relative paths are allowed as post-login redirects (no open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/kabinet"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return fallback;
  return next;
}
