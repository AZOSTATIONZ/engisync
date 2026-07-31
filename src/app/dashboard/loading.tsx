/**
 * The fallback loading state for every dashboard route.
 *
 * WHY IT IS GENERIC, AND WHY THAT IS AN IMPROVEMENT
 * In the App Router a `loading.tsx` creates a Suspense boundary for its own
 * segment AND every segment nested below it. This file therefore renders while
 * Settings, Knowledge, Calendar, Meetings, Departments and a dozen other
 * routes are fetching — not only Home.
 *
 * It used to be drawn as Home specifically: a "Today" card, a projects list, an
 * activity feed. That is the right skeleton for exactly one of the fifteen
 * routes it appears on, so on the other fourteen the placeholder had the wrong
 * shape and the real content visibly jumped into a different layout when it
 * arrived. A skeleton that does not match what follows is worse than none — it
 * promises a shape and then breaks the promise.
 *
 * It is now the shape those pages actually share: a title, a line of
 * description, and content blocks. Routes whose layout genuinely differs
 * (Projects, My Work, Repository, the money tab) keep their own tailored
 * `loading.tsx`, which takes precedence over this one.
 *
 * This matters more here than in most apps: the database is ~271ms away, so a
 * page running several sequential queries takes a noticeable moment, and
 * without a boundary the browser sits on the PREVIOUS page for that whole time
 * — which reads as the app being frozen rather than working.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header — proportions match `.page-title` + `.page-sub`, so the real
          heading lands where the placeholder was. */}
      <div className="space-y-2">
        <div className="skeleton h-9 w-56 max-w-full" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>

      {/* `role="status"` so a screen reader announces the wait rather than
          silently presenting an empty document. */}
      <p className="text-sm text-muted-foreground" role="status">
        Loading&hellip;
      </p>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
