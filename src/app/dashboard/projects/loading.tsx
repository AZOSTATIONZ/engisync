/** Projects loading — mirrors the project card grid. */
export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        Loading your projects&hellip;
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border p-4">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
