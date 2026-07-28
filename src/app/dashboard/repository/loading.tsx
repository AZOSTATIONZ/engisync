/** Repository loading — mirrors search bar + result cards. */
export default function RepositoryLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-8 w-72" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        Searching the department archive&hellip;
      </p>
      <div className="flex gap-2">
        <div className="skeleton h-10 flex-1" />
        <div className="skeleton h-10 w-28" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border p-4">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-4 w-full" />
            <div className="flex gap-1.5">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
