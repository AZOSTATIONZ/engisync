import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { auth } from "@/auth";
import { getMembership } from "@/lib/workspace";
import { listThreads } from "@/lib/discussion";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { NewThreadForm } from "./discussions-ui";

export const metadata: Metadata = { title: "Discussions" };

export default async function DiscussionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!(await getMembership(id, session!.user.id))) notFound();

  const threads = await listThreads(id);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Discussions</h1>
          </div>
          <NewThreadForm workspaceId={id} />
        </div>
      </div>

      {threads.length === 0 ? (
        <EmptyState
          title="No discussions yet"
          description="Decisions made in a chat app are lost by the time the report is written. Threads here stay attached to the project, so the reasoning is still there in week ten."
        />
      ) : (
        <div className="grid gap-3">
          {threads.map((t) => (
            <Link key={t.id} href={`/dashboard/projects/${id}/discussions/${t.id}`}>
              <Card className="card-hover">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Started by {t.authorName} ·{" "}
                      {new Date(t.updatedAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-4 w-4" /> {t._count.messages}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
