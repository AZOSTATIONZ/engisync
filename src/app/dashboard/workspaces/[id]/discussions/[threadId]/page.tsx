import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getThread } from "@/lib/discussion";
import { isWorkspaceLeader } from "@/lib/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { ReplyForm, DeleteThreadButton } from "../discussions-ui";

export const metadata: Metadata = { title: "Discussion" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string; threadId: string }>;
}) {
  const { id, threadId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const thread = await getThread(threadId, userId);
  if (!thread) notFound();

  const canDelete =
    thread.authorId === userId || (await isWorkspaceLeader(id, userId));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/dashboard/workspaces/${id}/discussions`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All discussions
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{thread.title}</h1>
          {canDelete && <DeleteThreadButton threadId={thread.id} />}
        </div>
      </div>

      <div className="space-y-3">
        {thread.messages.map((m) => (
          <Card key={m.id}>
            <CardContent className="py-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{m.authorName}</span>
                <span>
                  {new Date(m.createdAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{m.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReplyForm threadId={thread.id} />
        </CardContent>
      </Card>
    </div>
  );
}
