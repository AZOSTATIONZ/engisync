import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Run Auth.js authorization on protected routes (edge-safe config only).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
