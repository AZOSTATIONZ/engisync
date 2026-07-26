import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validations";
import { verifyTotp } from "@/lib/totp";

// Accept either naming convention: AUTH_* (Auth.js default) or the
// GOOGLE_CLIENT_* / MICROSOFT_CLIENT_* names documented in .env.example.
const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
const msId =
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? process.env.MICROSOFT_CLIENT_ID;
const msSecret =
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ??
  process.env.MICROSOFT_CLIENT_SECRET;

/**
 * Which social providers are actually usable. Registering a provider without
 * credentials makes the button render but fail at Google with
 * "401 invalid_client", so we only enable what's configured — and the UI hides
 * the rest (see `socialProviders`).
 */
export const socialProviders = {
  google: Boolean(googleId && googleSecret),
  microsoft: Boolean(msId && msSecret),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(socialProviders.google
      ? [
          Google({
            clientId: googleId,
            clientSecret: googleSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(socialProviders.microsoft
      ? [
          MicrosoftEntraID({
            clientId: msId,
            clientSecret: msSecret,
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "2FA code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Enforce 2FA when enabled.
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const code = typeof credentials?.code === "string" ? credentials.code : "";
          if (!verifyTotp(user.twoFactorSecret, code)) return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          systemRole: user.systemRole,
        };
      },
    }),
  ],
});
