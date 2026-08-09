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
import { consumeBackupCode } from "@/lib/two-factor";
import { clientIp } from "@/lib/rate-limit";
import {
  alertNewDevice,
  noteDeviceSignIn,
  recordSecurityEvent,
} from "@/lib/security-events";

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

/* WHY AUTOMATIC ACCOUNT LINKING IS OFF.
   ---------------------------------------------------------------------
   Both providers previously set `allowDangerousEmailAccountLinking: true`,
   which silently attaches an OAuth identity to any existing account sharing
   the same address. Auth.js calls the option "dangerous" literally, and with
   unverified registration it opened a pre-registration takeover:

     1. Attacker registers victim@university.ac.zw with a password of their
        choosing. Nothing verifies they own the mailbox.
     2. The real owner later signs in with Google.
     3. Auth.js links their Google identity INTO the attacker's account.
     4. Both now hold access. The attacker keeps password entry indefinitely,
        sees every project the victim joins, and no log records any of it.

   Turning this off costs nothing today: production has zero linked OAuth
   accounts, so no existing sign-in changes. A user who registered with a
   password now gets `OAuthAccountNotLinked` instead of a silent merge, and
   signs in with their password as before.

   The right long-term answer is linking initiated from Settings by an
   already-authenticated user — proving control of BOTH identities — rather
   than inferring consent from a matching string during sign-in. That is
   deliberately not bolted on here; it belongs with email verification
   enforcement, and shipping the safe default first is what matters. */
const SAFE_LINKING = false as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(socialProviders.google
      ? [
          Google({
            clientId: googleId,
            clientSecret: googleSecret,
            allowDangerousEmailAccountLinking: SAFE_LINKING,
          }),
        ]
      : []),
    ...(socialProviders.microsoft
      ? [
          MicrosoftEntraID({
            clientId: msId,
            clientSecret: msSecret,
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
            allowDangerousEmailAccountLinking: SAFE_LINKING,
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
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        /* Enforce 2FA when enabled — TOTP, OR a single-use recovery code.
           ----------------------------------------------------------------
           Before recovery codes existed, this branch was a one-way door: a
           student whose phone was lost, wiped or replaced failed `verifyTotp`
           forever, and there was no path around it. The care they took by
           turning 2FA on was the thing that destroyed their account.

           TOTP is tried first because it is what almost every successful
           login uses; the recovery path is the exception and is allowed to
           cost an extra query. A spent code is marked used inside a single
           conditional UPDATE (see `consumeBackupCode`), so it cannot be
           replayed — including by two requests racing deliberately. */
        let usedRecoveryCode = false;
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const code = typeof credentials?.code === "string" ? credentials.code : "";
          const totpOk = verifyTotp(user.twoFactorSecret, code);
          const recoveryOk = totpOk ? false : await consumeBackupCode(user.id, code);
          if (!totpOk && !recoveryOk) return null;
          usedRecoveryCode = recoveryOk;
        }

        /* THIS is where a sign-in actually completes.
           `preLogin` only pre-checks the password to decide whether to show
           the 2FA field; it runs on attempts that never finish. Recording
           success there would log a sign-in for every abandoned 2FA prompt,
           so the record is written here instead, where returning a user IS
           the sign-in.

           Everything below is best-effort and individually wrapped. An
           account whose activity log cannot be written must still be able to
           log in — otherwise the security feature becomes the outage. */
        try {
          const ip = clientIp(req?.headers ?? new Headers());
          const userAgent = req?.headers?.get("user-agent") ?? null;
          const { isNew, label } = await noteDeviceSignIn(user.id, ip, userAgent);

          await recordSecurityEvent({
            userId: user.id,
            action: "LOGIN_SUCCEEDED",
            ip,
            userAgent,
            metadata: { device: label, newDevice: isNew },
          });

          if (usedRecoveryCode) {
            // Worth its own line in the activity list: using a recovery code
            // means somebody could not produce the second factor, which is
            // either a lost phone or someone else entirely.
            await recordSecurityEvent({
              userId: user.id,
              action: "LOGIN_BACKUP_CODE_USED",
              ip,
              userAgent,
            });
          }

          if (isNew) {
            await recordSecurityEvent({
              userId: user.id,
              action: "LOGIN_NEW_DEVICE",
              ip,
              userAgent,
              metadata: { device: label },
            });
            await alertNewDevice(user.id, label, ip);
          }
        } catch (err) {
          console.error("[auth] post-sign-in recording failed", err);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          systemRole: user.systemRole,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
