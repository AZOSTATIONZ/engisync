/**
 * Dashboard loading state.
 *
 * Skeletons mirror the real layout (Today card, projects, activity) so
 * content replaces placeholders in place instead of jumping. The context
 * line tells the user what is happening — an interface should never feel
 * frozen, and "loading" with no subject is indistinguishable from frozen.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-44" />
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        Preparing your workspace&hellip;
      </p>

      {/* Today */}
      <div className="space-y-2 rounded-xl border p-4">
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>

      {/* Projects */}
      <div className="space-y-2 rounded-xl border p-4">
        <div className="skeleton h-5 w-28" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
      </div>

      {/* Activity */}
      <div className="space-y-2 rounded-xl border p-4">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
    </div>
  );
}
