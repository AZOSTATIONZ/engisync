/** My Work loading — mirrors the grouped task sections. */
export default function MyWorkLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-8 w-36" />
        <div className="skeleton h-4 w-72 max-w-full" />
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        Gathering everything assigned to you&hellip;
      </p>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border p-4">
          <div className="skeleton h-5 w-28" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
