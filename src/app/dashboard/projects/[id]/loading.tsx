/**
 * Loading state for every project tab.
 *
 * One file covers all nine — Overview, Plan, Tasks, Document, Money, Insights,
 * Team, and the rest — because a `loading.tsx` boundary applies to its segment
 * and everything nested beneath it. Without this, tab switches fell back to the
 * generic dashboard skeleton, which redraws a page header the project layout
 * has already rendered and is still showing.
 *
 * So this deliberately skeletons ONLY the tab content. The project banner,
 * title and tab strip live in `layout.tsx`, which persists across tab changes
 * and must not be duplicated underneath itself — the give-away that a loading
 * state was written without looking at what stays on screen.
 *
 * The money tab keeps its own tailored version, which takes precedence.
 */
export default function ProjectTabLoading() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" role="status">
        Loading&hellip;
      </p>

      {/* A summary strip, then body content — the arrangement most tabs use. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border p-3">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-7 w-14" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
