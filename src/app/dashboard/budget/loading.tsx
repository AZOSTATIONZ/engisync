/** Finance loading — mirrors the totals row and ledger. */
export default function FinanceLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        Reconciling contributions and spending&hellip;
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-xl border p-4">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-14 w-full" />
        <div className="skeleton h-14 w-full" />
      </div>
    </div>
  );
}
