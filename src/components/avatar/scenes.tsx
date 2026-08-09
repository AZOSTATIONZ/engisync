import type { AvatarPresentation } from "@prisma/client";
import type { Discipline } from "@/lib/project-hub";
import { Figure } from "./figure";

/**
 * Nine environments, one figure.
 *
 * Each scene draws its world BEHIND the shared figure and gives that figure
 * the protective equipment its discipline actually wears. That composition is
 * the whole architecture: a new discipline is one environment, and a
 * graduation gown or a seasonal theme is one more layer — never a new drawing
 * of a person.
 *
 * ANIMATION RULES, enforced by review rather than by a linter:
 *   1. `transform` and `opacity` ONLY. Anything that animates geometry
 *      (`x`, `cy`, `width`, `d`) repaints, and I measured what repainting a
 *      full-height layer does to this dashboard: 60fps to 31fps.
 *   2. Slow. Nothing under four seconds. This sits beside a student's work
 *      for hours; a fast loop in peripheral vision is an irritation, and
 *      irritation is how a signature feature becomes the thing people ask you
 *      to turn off.
 *   3. Every moving part carries an `es-anim-*` class. One media query in
 *      globals.css stops all of them for `prefers-reduced-motion`.
 *
 * Everything is decorative: the wrapper marks the whole SVG `aria-hidden` and
 * supplies a real text alternative beside it.
 */

type SceneProps = { presentation: AvatarPresentation };

/* Shared ground line, so the figure never floats. */
function Ground() {
  return (
    <path
      d="M0 160 H240"
      stroke="var(--avatar-ground, currentColor)"
      strokeOpacity="0.18"
      strokeWidth="2"
    />
  );
}

function Civil({ presentation }: SceneProps) {
  return (
    <>
      {/* Building frame under construction */}
      <g opacity="0.28" stroke="currentColor" strokeWidth="2" fill="none">
        <rect x="140" y="60" width="72" height="100" />
        <path d="M140 88 H212 M140 116 H212 M164 60 V160 M188 60 V160" />
      </g>
      {/* Tower crane. The jib sways; the hook bobs on a slower cycle, which is
          what stops the two reading as one mechanical tick. */}
      <g opacity="0.42" stroke="currentColor" strokeWidth="2.5" fill="none">
        <path d="M120 160 V34" />
        <g className="es-anim-sway" style={{ transformOrigin: "120px 34px" }}>
          <path d="M96 34 H196" />
          <path d="M120 34 L136 22 L172 34" />
          <g className="es-anim-bob" style={{ transformOrigin: "172px 34px" }}>
            <path d="M172 34 V70" />
            <rect x="167" y="70" width="10" height="7" fill="currentColor" opacity="0.5" />
          </g>
        </g>
      </g>
      <Ground />
      <Figure presentation={presentation} headgear="hardhat" torso="vest" holding="clipboard" />
    </>
  );
}

function Mechanical({ presentation }: SceneProps) {
  return (
    <>
      {/* Two meshed gears turning in opposite directions — the cheapest way to
          say "mechanical" without a caption. */}
      <g opacity="0.34" fill="none" stroke="currentColor" strokeWidth="2.5">
        <g className="es-anim-spin" style={{ transformOrigin: "168px 74px" }}>
          <circle cx="168" cy="74" r="26" />
          <circle cx="168" cy="74" r="8" />
          <path d="M168 44 V52 M168 96 V104 M138 74 H146 M190 74 H198 M147 53 l6 6 M183 89 l6 6 M189 53 l-6 6 M153 89 l-6 6" />
        </g>
        <g className="es-anim-spin-reverse" style={{ transformOrigin: "206px 108px" }}>
          <circle cx="206" cy="108" r="16" />
          <circle cx="206" cy="108" r="5" />
          <path d="M206 88 V96 M206 120 V128 M186 108 H194 M218 108 H226" />
        </g>
      </g>
      {/* Piston, offset so it is never in phase with the gears. */}
      <g opacity="0.3" stroke="currentColor" strokeWidth="2.5" fill="none">
        <rect x="118" y="118" width="34" height="20" rx="2" />
        <g className="es-anim-piston">
          <path d="M152 128 H176" />
          <rect x="176" y="122" width="8" height="12" fill="currentColor" opacity="0.4" />
        </g>
      </g>
      <Ground />
      <Figure presentation={presentation} headgear="hardhat" torso="vest" holding="clipboard" />
    </>
  );
}

function Electronic({ presentation }: SceneProps) {
  return (
    <>
      {/* Oscilloscope: the trace sweeps by translating a wide path, so nothing
          re-renders the waveform itself. */}
      <g opacity="0.4">
        <rect
          x="126" y="44" width="94" height="58" rx="4"
          fill="none" stroke="currentColor" strokeWidth="2"
        />
        <clipPath id="es-scope-clip">
          <rect x="130" y="48" width="86" height="50" />
        </clipPath>
        <g clipPath="url(#es-scope-clip)">
          <path
            className="es-anim-sweep"
            d="M110 74 q10 -18 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0"
            fill="none"
            stroke="var(--avatar-screen, #22d3ee)"
            strokeWidth="2"
          />
        </g>
      </g>
      {/* Board with traces and a chip whose LEDs breathe out of phase. */}
      <g opacity="0.32" stroke="currentColor" strokeWidth="1.6" fill="none">
        <rect x="132" y="116" width="84" height="34" rx="3" />
        <path d="M140 124 h18 v10 h14 M158 144 h30 M176 124 v20" />
        <rect x="186" y="120" width="18" height="16" rx="2" fill="currentColor" opacity="0.35" />
      </g>
      <circle className="es-anim-blink" cx="142" cy="146" r="2.5" fill="var(--avatar-screen, #22d3ee)" />
      <circle className="es-anim-blink-late" cx="152" cy="146" r="2.5" fill="var(--avatar-screen, #22d3ee)" />
      <Ground />
      <Figure presentation={presentation} headgear="safety-glasses" torso="plain" holding="probe" />
    </>
  );
}

function Electrical({ presentation }: SceneProps) {
  return (
    <>
      {/* Transmission pylon and catenary lines. */}
      <g opacity="0.32" stroke="currentColor" strokeWidth="2.2" fill="none">
        <path d="M168 160 L156 40 M168 160 L180 40 M158 62 H178 M156 92 H180 M154 122 H182" />
        <path d="M140 46 L156 40 L180 40 L200 46" />
        <path d="M120 52 q24 12 36 -12 M180 40 q20 20 40 8" strokeOpacity="0.5" />
      </g>
      {/* Substation transformer with cooling fins. */}
      <g opacity="0.3" stroke="currentColor" strokeWidth="2" fill="none">
        <rect x="196" y="112" width="30" height="34" rx="2" />
        <path d="M200 118 v22 M206 118 v22 M212 118 v22 M218 118 v22" strokeOpacity="0.6" />
      </g>
      {/* A single arc, mostly absent. A constant spark would read as a fault. */}
      <path
        className="es-anim-arc"
        d="M158 62 l6 -6 l-3 8 l7 -4"
        stroke="var(--avatar-spark, #facc15)"
        strokeWidth="2"
        fill="none"
      />
      <Ground />
      <Figure presentation={presentation} headgear="hardhat" torso="vest" holding="tablet" />
    </>
  );
}

function Software({ presentation }: SceneProps) {
  return (
    <>
      {/* Two monitors, code scrolling inside a clip so lines recycle rather
          than the block growing forever. */}
      <g opacity="0.42">
        <rect x="128" y="40" width="92" height="62" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <clipPath id="es-code-clip">
          <rect x="133" y="45" width="82" height="52" />
        </clipPath>
        <g clipPath="url(#es-code-clip)" className="es-anim-scroll">
          {Array.from({ length: 14 }, (_, i) => (
            <rect
              key={i}
              x={136}
              y={48 + i * 9}
              width={[52, 34, 66, 44, 58, 30, 48][i % 7]}
              height="4"
              rx="2"
              fill="var(--avatar-screen, #22d3ee)"
              opacity={0.32 + (i % 3) * 0.16}
            />
          ))}
        </g>
        <path d="M174 102 v10 M158 116 h32" stroke="currentColor" strokeWidth="2" fill="none" />
      </g>
      {/* Terminal with a caret that blinks, because everything else here is
          continuous and a discrete beat gives the eye somewhere to rest. */}
      <g opacity="0.34">
        <rect x="150" y="122" width="76" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="156" y="130" width="26" height="3.5" rx="1.5" fill="currentColor" opacity="0.6" />
        <rect x="156" y="139" width="40" height="3.5" rx="1.5" fill="currentColor" opacity="0.45" />
        <rect className="es-anim-caret" x="200" y="138" width="6" height="6" fill="var(--avatar-screen, #22d3ee)" />
      </g>
      <Ground />
      <Figure presentation={presentation} headgear="none" torso="plain" holding="tablet" />
    </>
  );
}

function Computer({ presentation }: SceneProps) {
  return (
    <>
      {/* Server rack. Activity lights blink on three different cycles — a rack
          where every light pulses together looks like a Christmas tree. */}
      <g opacity="0.34" stroke="currentColor" strokeWidth="2" fill="none">
        <rect x="150" y="38" width="70" height="116" rx="4" />
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x="158" y={48 + i * 18} width="54" height="12" rx="2" />
        ))}
      </g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle
          key={i}
          className={
            i % 3 === 0 ? "es-anim-blink" : i % 3 === 1 ? "es-anim-blink-late" : "es-anim-blink-slow"
          }
          cx="206"
          cy={54 + i * 18}
          r="2.4"
          fill="var(--avatar-screen, #22d3ee)"
        />
      ))}
      {/* Network fabric behind the rack. */}
      <g opacity="0.2" stroke="currentColor" strokeWidth="1.4" fill="none">
        <path d="M126 62 L150 76 M126 104 L150 90 M126 132 L150 118" />
        <circle cx="124" cy="62" r="3" />
        <circle cx="124" cy="104" r="3" />
        <circle cx="124" cy="132" r="3" />
      </g>
      <Ground />
      <Figure presentation={presentation} headgear="none" torso="plain" holding="tablet" />
    </>
  );
}

function Chemical({ presentation }: SceneProps) {
  return (
    <>
      {/* Reactor vessels and pipework. */}
      <g opacity="0.32" stroke="currentColor" strokeWidth="2.2" fill="none">
        <rect x="140" y="52" width="40" height="88" rx="18" />
        <rect x="192" y="76" width="30" height="64" rx="14" />
        <path d="M180 74 h12 M180 112 h12 M160 52 v-12 h44 v36" />
        <circle cx="204" cy="40" r="5" />
      </g>
      {/* Bubbles rise inside the vessel, clipped so they recycle. Three
          columns on different cycles so it never pulses as one unit. */}
      <clipPath id="es-vessel-clip">
        <rect x="142" y="54" width="36" height="84" rx="16" />
      </clipPath>
      <g clipPath="url(#es-vessel-clip)" opacity="0.55">
        <circle className="es-anim-rise" cx="152" cy="140" r="3" fill="var(--avatar-screen, #22d3ee)" />
        <circle className="es-anim-rise-late" cx="162" cy="140" r="2.4" fill="var(--avatar-screen, #22d3ee)" />
        <circle className="es-anim-rise-slow" cx="170" cy="140" r="3.4" fill="var(--avatar-screen, #22d3ee)" />
      </g>
      <Ground />
      <Figure presentation={presentation} headgear="safety-glasses" torso="labcoat" holding="clipboard" />
    </>
  );
}

function Industrial({ presentation }: SceneProps) {
  return (
    <>
      {/* Conveyor. Boxes translate across a clip and wrap, so three rectangles
          read as continuous production. */}
      <g opacity="0.34" stroke="currentColor" strokeWidth="2.2" fill="none">
        <path d="M126 132 H226 M126 144 H226" />
        <circle cx="134" cy="138" r="7" />
        <circle cx="218" cy="138" r="7" />
      </g>
      <clipPath id="es-belt-clip">
        <rect x="126" y="104" width="100" height="28" />
      </clipPath>
      <g clipPath="url(#es-belt-clip)" opacity="0.5">
        <g className="es-anim-convey">
          <rect x="126" y="114" width="16" height="16" rx="2" fill="currentColor" />
          <rect x="170" y="114" width="16" height="16" rx="2" fill="currentColor" />
          <rect x="214" y="114" width="16" height="16" rx="2" fill="currentColor" />
        </g>
      </g>
      {/* Gantry arm that lifts and returns on a long cycle. */}
      <g opacity="0.3" stroke="currentColor" strokeWidth="2.2" fill="none">
        <path d="M196 40 H226 M210 40 V64" />
        <g className="es-anim-lift" style={{ transformOrigin: "210px 64px" }}>
          <path d="M210 64 L196 88" />
          <rect x="188" y="88" width="16" height="10" rx="2" fill="currentColor" opacity="0.4" />
        </g>
      </g>
      <Ground />
      <Figure presentation={presentation} headgear="hardhat" torso="vest" holding="clipboard" />
    </>
  );
}

function Mining({ presentation }: SceneProps) {
  return (
    <>
      {/* Benched pit wall behind everything. */}
      <g opacity="0.22" fill="currentColor">
        <path d="M120 160 V128 H150 V112 H182 V96 H222 V160 Z" />
      </g>
      {/* Excavator with a boom that digs on a long, deliberate cycle. */}
      <g opacity="0.36" stroke="currentColor" strokeWidth="2.2" fill="none">
        <rect x="188" y="112" width="30" height="18" rx="3" />
        <g className="es-anim-dig" style={{ transformOrigin: "192px 116px" }}>
          <path d="M192 116 L166 96 L152 108" />
          <path d="M152 108 l-8 8 l14 6 l6 -10 Z" fill="currentColor" opacity="0.45" />
        </g>
        <path d="M186 130 h34 v8 h-34 Z" />
      </g>
      {/* Haul truck crossing, wheels turning. */}
      <g className="es-anim-haul" opacity="0.4">
        <g stroke="currentColor" strokeWidth="2" fill="none">
          <path d="M120 148 h30 l6 -12 h14 v20 h-50 Z" />
        </g>
        <circle className="es-anim-spin" cx="132" cy="156" r="5" fill="none" stroke="currentColor" strokeWidth="2" style={{ transformOrigin: "132px 156px" }} />
        <circle className="es-anim-spin" cx="158" cy="156" r="5" fill="none" stroke="currentColor" strokeWidth="2" style={{ transformOrigin: "158px 156px" }} />
      </g>
      <Ground />
      <Figure presentation={presentation} headgear="hardhat" torso="vest" holding="clipboard" />
    </>
  );
}

function General({ presentation }: SceneProps) {
  return (
    <>
      {/* Drafting board and instruments — the honest fallback for someone with
          no department yet. Deliberately a real scene rather than an empty
          frame: eleven of the current users are in exactly this state. */}
      <g opacity="0.3" stroke="currentColor" strokeWidth="2" fill="none">
        <path d="M126 140 L146 56 H222 L212 140 Z" />
        <path d="M150 74 H214 M148 90 H206 M146 106 H210 M144 122 H198" strokeOpacity="0.55" />
        <g className="es-anim-sway" style={{ transformOrigin: "186px 62px" }}>
          <path d="M186 62 L176 96 M186 62 L198 96" />
          <circle cx="186" cy="62" r="3" />
        </g>
      </g>
      <Ground />
      <Figure presentation={presentation} headgear="none" torso="plain" holding="clipboard" />
    </>
  );
}

/**
 * The registry.
 *
 * A record rather than a switch so `Discipline` staying exhaustive is the
 * compiler's job, and so a future Rive or glTF renderer registers alongside
 * these rather than replacing the call sites.
 */
export const DISCIPLINE_SCENES: Record<Discipline, (p: SceneProps) => React.ReactElement> = {
  CIVIL: Civil,
  MECHANICAL: Mechanical,
  ELECTRONIC: Electronic,
  ELECTRICAL: Electrical,
  SOFTWARE: Software,
  COMPUTER: Computer,
  CHEMICAL: Chemical,
  INDUSTRIAL: Industrial,
  MINING: Mining,
  GENERAL: General,
};

/** Text alternative. The scene is decorative; this is what a screen reader gets. */
export const SCENE_DESCRIPTION: Record<Discipline, string> = {
  CIVIL: "An illustration of a civil engineer in a hard hat and hi-vis vest, reviewing drawings beside a tower crane and a building under construction.",
  MECHANICAL: "An illustration of a mechanical engineer beside turning gears and a working piston.",
  ELECTRONIC: "An illustration of an electronic engineer testing a circuit board beside an oscilloscope.",
  ELECTRICAL: "An illustration of an electrical engineer beside a transmission pylon and a substation transformer.",
  SOFTWARE: "An illustration of a software engineer at a workstation with code scrolling on screen.",
  COMPUTER: "An illustration of a computer engineer beside a server rack with activity lights.",
  CHEMICAL: "An illustration of a chemical engineer in a lab coat monitoring reactor vessels and pipework.",
  INDUSTRIAL: "An illustration of an industrial engineer beside a conveyor line and a gantry arm.",
  MINING: "An illustration of a mining engineer in a hard hat beside an excavator and a haul truck at an open pit.",
  GENERAL: "An illustration of an engineer at a drafting board with drawing instruments.",
};
