import { disciplineFor, type DisciplineKey } from "@/lib/media";

/**
 * Engineering identity band — PCB traces drawn as a header decoration.
 *
 * WHY DRAWN, NOT PHOTOGRAPHED
 * A stock photo of a circuit board is a picture of someone else's work, weighs
 * a hundred kilobytes, and looks like every other engineering website. This is
 * a few hundred bytes of inline SVG in the app's own accent colour, so it
 * theme-switches for free, costs no network request, and reads as *drawn by
 * this product* rather than bought.
 *
 * WHY THE TRACES DIFFER BY DISCIPLINE
 * Someone in Civil should not get a picture of a microcontroller. Each
 * discipline gets geometry from its own field — traces and pads for
 * electronics, trusses for civil, gear teeth for mechanical — so the identity
 * is specific rather than "engineering" as a generic aesthetic.
 *
 * Deliberately static. This sits behind a person's name on a page an employer
 * may open; motion there is a distraction, and there is no state for it to
 * communicate.
 */

type Geometry = { path: string; nodes: [number, number][] };

const GEOMETRY: Record<DisciplineKey, Geometry> = {
  // Right-angled traces with via pads — the language of a PCB.
  electronic: {
    path: "M0 40h60l20-20h50l16 16h60l20 20h74M0 68h40l24 24h96l18-18h62",
    nodes: [[60, 40], [130, 20], [206, 36], [64, 92], [160, 92], [178, 74]],
  },
  electrical: {
    path: "M0 34h72l14 22h48l14-22h52l18 26h82M0 74h56l20-14h70",
    nodes: [[72, 34], [134, 56], [200, 34], [76, 60]],
  },
  // Ladders and diagonals: bridges and frames.
  civil: {
    path: "M0 84h360M20 84L60 30l40 54 40-54 40 54 40-54 40 54 40-54 40 54",
    nodes: [[60, 30], [140, 30], [220, 30], [300, 30]],
  },
  mechanical: {
    path: "M0 56h80M120 56h80M240 56h120M100 36v40M220 36v40",
    nodes: [[100, 56], [220, 56], [40, 56], [300, 56]],
  },
  mechatronics: {
    path: "M0 44h70l18 18h64l18-18h60l22 22h108M0 76h48l18-14h58",
    nodes: [[70, 44], [152, 62], [230, 44], [66, 62]],
  },
  // Pipework and vessels.
  chemical: {
    path: "M0 46h64v34h72V46h68v34h84M0 80h40",
    nodes: [[64, 46], [136, 46], [204, 46], [272, 80]],
  },
  // Branching call graph.
  software: {
    path: "M0 60h56l24-24h56l24 24h56l24-24h96M80 36v-14M216 36v-14",
    nodes: [[56, 60], [136, 60], [216, 60], [80, 22], [216, 22]],
  },
  // Binary-tree branching, distinct from software's linear call chain.
  "computer-science": {
    path: "M0 30h100l28 26h56l28-26h148M128 56v26M212 56v26",
    nodes: [[100, 30], [128, 56], [212, 56], [128, 82], [212, 82]],
  },
  // Bus lines with device drops — where hardware meets code.
  "computer-engineering": {
    path: "M0 38h360M0 74h360M64 38v36M148 38v36M232 38v36M300 38v36",
    nodes: [[64, 38], [148, 74], [232, 38], [300, 74]],
  },
  general: {
    path: "M0 50h72l20-20h64l20 20h60l20 20h96",
    nodes: [[72, 50], [156, 50], [236, 70]],
  },
};

export function CircuitHeader({
  department,
  departmentCode,
  className = "",
}: {
  department?: string | null;
  departmentCode?: string | null;
  className?: string;
}) {
  const key = disciplineFor(department, departmentCode);
  const g = GEOMETRY[key] ?? GEOMETRY.general;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 360 112"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-primary"
        fill="none"
      >
        <path
          d={g.path}
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {g.nodes.map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="3.5" fill="currentColor" fillOpacity="0.22" />
            <circle cx={cx} cy={cy} r="1.4" className="fill-background" />
          </g>
        ))}
      </svg>
      {/* Fades into the page rather than ending in a hard edge. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
