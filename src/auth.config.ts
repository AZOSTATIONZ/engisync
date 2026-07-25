import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration (no database / Node APIs here).
 * Used by middleware for route protection.
 */
export const authConfig = {
  // Trust the deployment host (required on Vercel / behind proxies).
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // refresh the session token daily
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/workspaces") ||
        nextUrl.pathname.startsWith("/admin");

      if (isOnDashboard) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        if (user.systemRole) token.systemRole = user.systemRole;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.systemRole = token.systemRole as typeof session.user.systemRole;
      }
      return session;
    },
  },
  providers: [], // real providers are added in auth.ts (Node runtime)
} satisfies NextAuthConfig;
