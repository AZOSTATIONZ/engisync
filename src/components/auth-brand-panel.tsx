/**
 * Animated brand panel for the auth pages.
 *
 * Implemented as inline SVG + CSS rather than Lottie deliberately:
 * - zero new dependencies and ~2KB instead of a <200KB JSON payload
 * - no runtime player, so nothing blocks first paint (the brief's lazy-load
 *   requirement is satisfied by construction)
 * - `prefers-reduced-motion` collapses it to a clean static mark
 *
 * Motif: nodes connecting + a sync pulse — engineering teams coming into sync.
 *
 * Copy varies per auth page (log in / sign up / recover) so the panel speaks to
 * what the person is actually doing, while the artwork and gradient stay
 * identical — one brand, three moments.
 */
export type AuthPanelVariant = "login" | "register" | "forgot";

const PANEL_COPY: Record<
  AuthPanelVariant,
  { heading: string; bullets: string[] }
> = {
  login: {
    heading: "Where engineering teams stay in sync.",
    bullets: [
      "Plan projects, tasks and deadlines in one place",
      "Structured documentation your supervisor can review",
      "Fair, measurable contribution for every member",
    ],
  },
  register: {
    heading: "Start your engineering project properly.",
    bullets: [
      "Join your department and group in minutes",
      "Every contribution recorded and visible",
      "Publish your finished work to the department archive",
    ],
  },
  forgot: {
    heading: "Let's get you back to your project.",
    bullets: [
      "Reset links expire quickly for your security",
      "Your project data stays exactly where you left it",
      "Still stuck? Your group leader can help",
    ],
  },
};

/**
 * Compact brand strip for narrow screens.
 *
 * WHY THIS EXISTS
 * The panel below is `hidden md:flex`, so below 768px every trace of the
 * brand disappeared and the page became a form floating in empty space —
 * which is exactly how it felt. Phones are the majority of this product's
 * traffic, so the mobile view had the weakest identity of any screen.
 *
 * It is a STRIP, not a shrunken panel: one line of positioning copy over the
 * brand gradient, roughly 90px tall. A phone screen is mostly consumed by the
 * form and the keyboard, so brand presence has to cost almost no vertical
 * space. The bullets and the animation stay desktop-only, where there is room
 * for them to be read rather than skipped.
 */
function MobileBrandStrip({ heading }: { heading: string }) {
  return (
    <div className="relative overflow-hidden bg-[#070B14] px-6 py-5 md:hidden">
      {/* Cyan glow rather than a cyan fill — see the note on the panel below. */}
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#22D3EE]/25 blur-3xl" />
      <p className="relative text-xs font-medium uppercase tracking-wider text-[#22D3EE]">
        EngiSync
      </p>
      <p className="relative mt-1 max-w-[24ch] text-base font-semibold leading-snug text-white">
        {heading}
      </p>
    </div>
  );
}

export function AuthBrandPanel({
  variant = "login",
}: {
  variant?: AuthPanelVariant;
}) {
  const copy = PANEL_COPY[variant];
  return (
    <>
      <MobileBrandStrip heading={copy.heading} />
      <aside
        /* NOT aria-hidden any more. The artwork is decorative and marked so
           individually, but the heading and bullets are real positioning copy
           — hiding them meant a screen-reader user was the only person who
           never learned what EngiSync does. */
        aria-label="About EngiSync"
        /* MIDNIGHT SURFACE, CYAN ACCENT — not a cyan fill.
         *
         * The old panel was a hardcoded #6C5CE7→#2EA6FF purple-to-blue that
         * matched nothing else in the product. The obvious fix was to swap in
         * the brand cyan, but a cyan→violet gradient is a contrast trap: cyan
         * is a LIGHT colour and violet a dark one, so white text passes at one
         * end of the panel and fails at the other, and no single text colour
         * works across it.
         *
         * Dark surface with cyan used as an accent solves that — white text is
         * legible everywhere — and matches the Midnight Engineering palette
         * the rest of the app already uses. Literal hex rather than tokens
         * here because this panel is deliberately dark in BOTH themes: it is
         * the brand's own surface, like a product's packaging, and should not
         * invert to white when someone picks the light theme.
         */
        className="relative hidden overflow-hidden bg-[#070B14] p-8 md:flex md:w-[46%] md:flex-col md:justify-between"
      >
      {/* Cyan glow, not white haze. On a near-black surface a white blur reads
          as grey smudge; the brand colour reads as light coming off the
          artwork. Both are decorative and non-interactive. */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#22D3EE]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
      {/* Blueprint grid, barely visible — engineering identity without
          decoration competing with the form beside it. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#22D3EE 1px, transparent 1px), linear-gradient(90deg, #22D3EE 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-[#22D3EE]">
          EngiSync
        </p>
        <h2 className="mt-2 max-w-[18ch] text-2xl font-bold leading-tight text-white">
          {copy.heading}
        </h2>
      </div>

      {/* Node/sync animation */}
      <div className="relative flex flex-1 items-center justify-center py-6">
        <svg
          viewBox="0 0 220 220"
          className="h-52 w-52 text-[#22D3EE]"
          aria-hidden="true"
          focusable="false"
        >
          {/* Orbit rings */}
          <circle cx="110" cy="110" r="86" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
          <circle cx="110" cy="110" r="58" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />

          {/* Connecting edges */}
          <g stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round">
            <line x1="110" y1="110" x2="110" y2="24" className="es-edge" />
            <line x1="110" y1="110" x2="184" y2="153" className="es-edge es-d1" />
            <line x1="110" y1="110" x2="36" y2="153" className="es-edge es-d2" />
            <line x1="110" y1="110" x2="168" y2="62" className="es-edge es-d3" />
            <line x1="110" y1="110" x2="52" y2="62" className="es-edge es-d4" />
          </g>

          {/* Outer nodes */}
          <g fill="currentColor">
            <circle cx="110" cy="24" r="7" className="es-node" />
            <circle cx="184" cy="153" r="7" className="es-node es-d1" />
            <circle cx="36" cy="153" r="7" className="es-node es-d2" />
            <circle cx="168" cy="62" r="5.5" className="es-node es-d3" />
            <circle cx="52" cy="62" r="5.5" className="es-node es-d4" />
          </g>

          {/* Sync pulse */}
          <circle cx="110" cy="110" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="es-pulse" />
          <circle cx="110" cy="110" r="12" fill="currentColor" />
        </svg>
      </div>

      {/* `text-white/85` on near-black clears 4.5:1 comfortably. The marker is
          a cyan element rather than a bullet character so it carries brand
          without relying on colour to convey meaning. */}
      <ul className="relative space-y-2.5 text-sm text-white/85">
        {copy.bullets.map((b) => (
          <li key={b} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#22D3EE]"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <style>{`
        .es-edge {
          stroke-dasharray: 90;
          stroke-dashoffset: 90;
          animation: esDraw 5s ease-in-out infinite;
        }
        .es-node {
          opacity: 0.35;
          animation: esGlow 5s ease-in-out infinite;
          transform-origin: center;
        }
        .es-pulse {
          opacity: 0;
          transform-origin: 110px 110px;
          animation: esPulse 5s ease-out infinite;
        }
        .es-d1 { animation-delay: .35s }
        .es-d2 { animation-delay: .7s }
        .es-d3 { animation-delay: 1.05s }
        .es-d4 { animation-delay: 1.4s }

        @keyframes esDraw {
          0%   { stroke-dashoffset: 90 }
          35%  { stroke-dashoffset: 0 }
          80%  { stroke-dashoffset: 0; opacity: 1 }
          100% { stroke-dashoffset: 0; opacity: .35 }
        }
        @keyframes esGlow {
          0%, 20%  { opacity: .3;  }
          45%      { opacity: 1;   }
          100%     { opacity: .45; }
        }
        @keyframes esPulse {
          0%       { opacity: 0;   transform: scale(1)   }
          55%      { opacity: .55; transform: scale(1)   }
          100%     { opacity: 0;   transform: scale(3.4) }
        }
        @media (prefers-reduced-motion: reduce) {
          .es-edge, .es-node, .es-pulse {
            animation: none !important;
            stroke-dashoffset: 0 !important;
            opacity: .85 !important;
          }
        }
      `}</style>
      </aside>
    </>
  );
}
