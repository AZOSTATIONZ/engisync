import { SystemRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      systemRole: SystemRole;
      /**
       * The session generation this token was minted at. Compared against the
       * user's current `sessionVersion` in lib/policy.ts; a mismatch means the
       * token predates a password reset, a 2FA change, or a deliberate "sign
       * out everywhere", and is refused.
       */
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    systemRole?: SystemRole;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    systemRole: SystemRole;
    sessionVersion?: number;
  }
}
