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

export function AuthBrandPanel({
  variant = "login",
}: {
  variant?: AuthPanelVariant;
}) {
  const copy = PANEL_COPY[variant];
  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-gradient-to-br from-[#6C5CE7] via-[#4B6FE3] to-[#2EA6FF] p-8 md:flex md:w-[46%] md:flex-col md:justify-between"
    >
      {/* Soft depth blobs */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        <p className="text-sm font-medium tracking-wide text-white/80">EngiSync</p>
        <h2 className="mt-2 max-w-[16ch] text-2xl font-bold leading-tight text-white">
          {copy.heading}
        </h2>
      </div>

      {/* Node/sync animation */}
      <div className="relative flex flex-1 items-center justify-center py-6">
        <svg
          viewBox="0 0 220 220"
          className="h-52 w-52 text-white"
          role="presentation"
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

      <ul className="relative space-y-2 text-sm text-white/85">
        {copy.bullets.map((b) => (
          <li key={b}>• {b}</li>
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
  );
}
