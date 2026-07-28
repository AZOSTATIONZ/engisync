import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Engineering-flavoured empty state.
 *
 * Rule: no page ever says just "nothing found". An empty state explains what
 * will appear here and offers the next action. The illustration is a single
 * inline SVG (~1 KB) drawn in the app's own palette via CSS variables — it
 * theme-switches for free and costs no network request, unlike an
 * illustration pack.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-grid bg-grid-fade flex flex-col items-center gap-3 rounded-xl py-12 text-center">
      <BlueprintIllustration />
      <p className="font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild size="sm" className="mt-1">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {children}
    </div>
  );
}

/** A small drafting-board sketch: frame, dimension lines, an unfinished part. */
function BlueprintIllustration() {
  return (
    <svg
      width="120"
      height="88"
      viewBox="0 0 120 88"
      fill="none"
      aria-hidden="true"
      className="text-primary"
    >
      {/* Board */}
      <rect
        x="8"
        y="6"
        width="104"
        height="70"
        rx="6"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      {/* Grid hint */}
      <path
        d="M8 29h104M8 52h104M42 6v70M77 6v70"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="1"
      />
      {/* The drawn part — an unfinished bracket */}
      <path
        d="M30 58V34h22v10h16V34"
        stroke="currentColor"
        strokeOpacity="0.8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="86" cy="58" r="8" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2" />
      <circle cx="86" cy="58" r="2" fill="currentColor" fillOpacity="0.8" />
      {/* Dimension line */}
      <path
        d="M30 66h56"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <path d="M30 63v6M86 63v6" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      {/* Pencil */}
      <path
        d="M97 18l8 8-14 14-9 1 1-9 14-14z"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
