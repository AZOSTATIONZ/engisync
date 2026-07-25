/** Re-mounts on every navigation, giving a subtle fade-in transition. */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="animate-page">{children}</div>;
}
