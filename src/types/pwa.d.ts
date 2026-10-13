/**
 * Install-prompt globals.
 *
 * `beforeinstallprompt` is Chromium-only and absent from the DOM lib, so its
 * shape has to be declared. It lives here rather than in the components that
 * use it because TypeScript MERGES duplicate `interface Window` declarations
 * and rejects a property declared twice with structurally-identical but
 * separately-defined types. Two components each declaring their own copy
 * compiles until it suddenly does not.
 *
 * `__engisyncInstall` is set by the inline script in src/app/layout.tsx, which
 * runs before React hydrates so the event is not missed on a slow device.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface Window {
  /** Captured by the head script; cleared once prompt() has been called. */
  __engisyncInstall?: BeforeInstallPromptEvent;
}

interface WindowEventMap {
  /** Dispatched by the head script once an install event has been stashed. */
  "engisync:installable": Event;
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}
