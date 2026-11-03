import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Role } from "@/generated/prisma/client";
import { normalizeEmail, normalizePhone } from "@/lib/auth/identifiers";
import { verifyOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { getSecret } from "@/lib/secrets";

declare module "next-auth" {
  interface Session {
    user: { id: string; roles: Role[] } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    roles?: Role[];
  }
}

/** Finds or creates the user for a verified phone/email; blocked users get null. */
async function upsertUser(
  where: { phone: string } | { email: string },
  opts: { name?: string | null; consent?: boolean } = {},
) {
  const existing = await db.user.findFirst({ where });
  if (existing?.isBlocked) return null;
  const user =
    existing ??
    (await db.user.create({ data: { ...where, name: opts.name ?? null, roles: ["AUTHOR"] } }));
  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      // Consent given on the login form (TZ 17); Google users confirm it in the profile.
      ...(opts.consent && !user.consentAt ? { consentAt: new Date() } : {}),
    },
  });
  return user;
}

const otpProvider =
  // Phone or email + one-time code (TZ 4: SMS login is the main path in Uzbekistan).
  Credentials({
    id: "otp",
    credentials: { channel: {}, target: {}, code: {}, consent: {} },
    async authorize(raw) {
      const channel = raw?.channel === "EMAIL" ? "EMAIL" : "PHONE";
      const target =
        channel === "PHONE"
          ? normalizePhone(String(raw?.target ?? ""))
          : normalizeEmail(String(raw?.target ?? ""));
      if (!target) return null;
      if (!(await verifyOtp(channel, target, String(raw?.code ?? "")))) return null;
      const user = await upsertUser(channel === "PHONE" ? { phone: target } : { email: target }, {
        consent: raw?.consent === "1",
      });
      return user ? { id: user.id, name: user.name, email: user.email } : null;
    },
  });

/** Google keys from the environment or the admin panel (Integratsiyalar). */
async function googleKeys() {
  const [clientId, clientSecret] = await Promise.all([
    getSecret("AUTH_GOOGLE_ID"),
    getSecret("AUTH_GOOGLE_SECRET"),
  ]);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export async function isGoogleEnabled(): Promise<boolean> {
  return (await googleKeys()) !== null;
}

// Lazy config: providers are read per request, so keys pasted in the admin
// panel work without a restart.
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const google = await googleKeys();
  return {
    providers: [otpProvider, ...(google ? [Google(google)] : [])],
    session: { strategy: "jwt", maxAge: 30 * 24 * 3600 },
    pages: { signIn: "/kirish", error: "/kirish" },
    trustHost: true,
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider !== "google") return true;
        const email = normalizeEmail(profile?.email ?? "");
        if (!email || profile?.email_verified === false) return false;
        return (await upsertUser({ email }, { name: profile?.name })) !== null;
      },
      async jwt({ token, user, account, profile }) {
        if (account?.provider === "google" && profile?.email) {
          const u = await db.user.findUnique({ where: { email: profile.email.toLowerCase() } });
          if (u) {
            token.uid = u.id;
            token.roles = u.roles;
          }
        } else if (user?.id) {
          token.uid = user.id;
          const u = await db.user.findUnique({ where: { id: user.id }, select: { roles: true } });
          token.roles = u?.roles ?? ["AUTHOR"];
        }
        return token;
      },
      async session({ session, token }) {
        if (token.uid) {
          session.user.id = token.uid;
          session.user.roles = token.roles ?? [];
        }
        return session;
      },
    },
  };
});
