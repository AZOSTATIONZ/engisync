import type { Metadata } from "next";
import { auth } from "@/auth";
import { DocumentationHistory } from "@/components/documentation-history";

export const metadata: Metadata = { title: "Report history" };

export default async function MemberHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from, to } = await searchParams;
  const session = await auth();
  const base = `/dashboard/projects/${id}/document`;

  return (
    <DocumentationHistory
      workspaceId={id}
      userId={session!.user.id}
      backHref={base}
      baseHref={`${base}/history`}
      from={from}
      to={to}
    />
  );
}
