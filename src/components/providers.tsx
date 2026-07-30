"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemePersonalityProvider } from "@/components/theme-personality";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {/* Personality composes WITH light/dark rather than competing for the
            same attribute — next-themes owns `class="dark"`, which every
            Tailwind `dark:` utility in the codebase depends on. */}
        <ThemePersonalityProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ThemePersonalityProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
