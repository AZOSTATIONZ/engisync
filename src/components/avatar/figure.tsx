import type { AvatarPresentation } from "@prisma/client";

/**
 * THE engineer. One figure, drawn once, reused by every discipline scene.
 *
 * WHY ONE FIGURE AND NOT EIGHTEEN
 * The brief describes nine disciplines times two presentations as eighteen
 * scenes. Built literally that is eighteen drawings to keep in visual step,
 * and they drift the moment anyone edits one. It is really nine ENVIRONMENTS
 * and one figure wearing different protective equipment: the civil engineer
 * and the mining engineer are the same person in a different hat, standing
 * somewhere else. Composing it that way is what makes graduation gowns,
 * seasonal themes and achievement accessories later additions rather than
 * eighteen more drawings.
 *
 * HOW PRESENTATION IS EXPRESSED
 * Through silhouette — hair shape and shoulder line — and nothing else. The
 * posture, the proportions, the competence and the protective equipment are
 * identical across all three. A feminine figure that stood differently, or
 * held the clipboard more tentatively, would be saying something this product
 * has no business saying. NEUTRAL is a real drawing rather than a fallback:
 * it is the default everybody gets, so it has to look deliberate.
 *
 * COLOUR COMES FROM THE THEME
 * Every fill is a CSS variable or `currentColor`, so the figure inherits all
 * nine theme personalities for free. This is the property a video or a glTF
 * character cannot have — a baked-in skin tone and a baked-in hi-vis orange
 * would look wrong in eight of the nine themes.
 */

export function Figure({
  presentation,
  /** Hard hat, welding mask, none — chosen by the scene. */
  headgear = "hardhat",
  /** Hi-vis vest for site disciplines, lab coat for chemical, neither for desk work. */
  torso = "vest",
  /** What they are holding. */
  holding = "clipboard",
}: {
  presentation: AvatarPresentation;
  headgear?: "hardhat" | "safety-glasses" | "none";
  torso?: "vest" | "labcoat" | "plain";
  holding?: "clipboard" | "tablet" | "probe" | "none";
}) {
  return (
    <g className="es-figure">
      {/* Legs — identical across presentations. */}
      <path
        d="M46 118 L44 156 L50 156 L54 122 L58 156 L64 156 L62 118 Z"
        fill="var(--avatar-trouser, #33415580)"
      />
      <path d="M42 156 h10 v4 h-12 z" fill="var(--avatar-boot, #1e293b)" />
      <path d="M62 156 h10 v4 h-12 z" fill="var(--avatar-boot, #1e293b)" />

      {/* Torso */}
      {torso === "labcoat" ? (
        <path
          d="M42 66 q12 -8 24 0 l4 40 q-16 6 -32 0 Z M44 70 l-2 44 h6 l1 -44 Z"
          fill="var(--avatar-coat, #e2e8f0)"
          opacity="0.92"
        />
      ) : (
        <path
          d="M42 66 q12 -8 24 0 l3 52 q-15 5 -30 0 Z"
          fill="var(--avatar-shirt, #64748b)"
        />
      )}

      {torso === "vest" && (
        <>
          {/* Hi-vis vest — the single most recognisable "this is site work" cue. */}
          <path
            d="M44 68 q10 -6 20 0 l3 48 q-13 4 -26 0 Z"
            fill="var(--avatar-hivis, #f59e0b)"
            opacity="0.95"
          />
          {/* Reflective bands. Animated sheen lives in CSS, not here. */}
          <rect x="45" y="88" width="18" height="4" rx="1" fill="#f8fafc" opacity="0.85" />
          <rect x="45" y="98" width="18" height="4" rx="1" fill="#f8fafc" opacity="0.6" />
        </>
      )}

      {/* Arms. The near arm is grouped so a scene can animate it alone. */}
      <path
        d="M42 70 l-8 26 q-1 4 3 5 l4 1 l6 -28 Z"
        fill="var(--avatar-shirt, #64748b)"
      />
      <g className="es-figure__arm">
        <path
          d="M66 70 l9 24 q1 4 -3 5 l-4 1 l-6 -27 Z"
          fill="var(--avatar-shirt, #64748b)"
        />
        <circle cx="70" cy="100" r="4" fill="var(--avatar-skin, #d6a37e)" />
      </g>
      <circle cx="37" cy="100" r="4" fill="var(--avatar-skin, #d6a37e)" />

      {/* Neck and head */}
      <rect x="51" y="56" width="6" height="10" fill="var(--avatar-skin, #d6a37e)" />
      <ellipse cx="54" cy="46" rx="12" ry="13" fill="var(--avatar-skin, #d6a37e)" />

      {/* Hair — the silhouette that carries presentation, and the only thing
          that differs between the three figures. */}
      {presentation === "FEMININE" && (
        <path
          d="M42 44 q0 -16 12 -16 q12 0 12 16 q0 6 -2 8 q2 12 -2 20 l4 0 q6 -14 3 -30 q-3 -16 -15 -16 q-12 0 -15 16 q-3 16 3 30 l4 0 q-4 -8 -2 -20 q-2 -2 -2 -8 Z"
          fill="var(--avatar-hair, #3f2a1d)"
        />
      )}
      {presentation === "MASCULINE" && (
        <path
          d="M42 44 q0 -16 12 -16 q12 0 12 16 q-4 -6 -12 -6 q-8 0 -12 6 Z"
          fill="var(--avatar-hair, #3f2a1d)"
        />
      )}
      {presentation === "NEUTRAL" && (
        <path
          d="M42 45 q0 -17 12 -17 q12 0 12 17 q-3 -7 -12 -7 q-9 0 -12 7 Z M42 45 q-1 8 1 12 l3 0 q-2 -6 -1 -12 Z"
          fill="var(--avatar-hair, #3f2a1d)"
        />
      )}

      {/* Face: two eyes and nothing else. A drawn mouth reads as an emotion,
          and an emoted avatar on a dashboard becomes tiring within a week. */}
      <circle cx="49" cy="46" r="1.6" fill="#1e293b" />
      <circle cx="59" cy="46" r="1.6" fill="#1e293b" />

      {/* Headgear last, so it sits over the hair. */}
      {headgear === "hardhat" && (
        <>
          <path
            d="M40 40 q0 -16 14 -16 q14 0 14 16 Z"
            fill="var(--avatar-hat, #facc15)"
          />
          <rect x="37" y="39" width="34" height="4" rx="2" fill="var(--avatar-hat, #facc15)" />
          <path d="M52 24 q2 -1 4 0 l0 16 l-4 0 Z" fill="#00000022" />
        </>
      )}
      {headgear === "safety-glasses" && (
        <path
          d="M43 44 h22 v5 q-11 3 -22 0 Z"
          fill="var(--avatar-glass, #38bdf8)"
          opacity="0.55"
        />
      )}

      {/* What they are holding, in the animated near hand. */}
      {holding === "clipboard" && (
        <g className="es-figure__held">
          <rect x="62" y="92" width="18" height="24" rx="2" fill="#f8fafc" />
          <rect x="66" y="90" width="10" height="4" rx="1" fill="#94a3b8" />
          <rect x="65" y="99" width="12" height="1.6" fill="#94a3b8" />
          <rect x="65" y="104" width="12" height="1.6" fill="#94a3b8" />
          <rect x="65" y="109" width="8" height="1.6" fill="#94a3b8" />
        </g>
      )}
      {holding === "tablet" && (
        <g className="es-figure__held">
          <rect x="62" y="94" width="20" height="14" rx="2" fill="#0f172a" />
          <rect x="64" y="96" width="16" height="10" rx="1" fill="var(--avatar-screen, #22d3ee)" opacity="0.7" />
        </g>
      )}
      {holding === "probe" && (
        <g className="es-figure__held">
          <rect x="70" y="86" width="2" height="18" rx="1" fill="#ef4444" />
          <circle cx="71" cy="85" r="2" fill="#f8fafc" />
        </g>
      )}
    </g>
  );
}
