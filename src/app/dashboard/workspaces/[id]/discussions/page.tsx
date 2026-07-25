import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { auth } from "@/auth";
import { getMembership } from "@/lib/workspace";
import { listThreads } from "@/lib/discussion";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
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

  const [workspace, threads] = await Promise.all([
    prisma.workspace.findUnique({ where: { id }, select: { name: true } }),
    listThreads(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/workspaces/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to group
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Discussions</h1>
            <p className="text-muted-foreground">{workspace?.name}</p>
          </div>
          <NewThreadForm workspaceId={id} />
        </div>
      </div>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 text-primary" />
            No discussions yet. Start the first topic for your group.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {threads.map((t) => (
            <Link key={t.id} href={`/dashboard/workspaces/${id}/discussions/${t.id}`}>
              <Card className="card-hover">
                <CardContent className="flex items-center justify-between py-4">
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
