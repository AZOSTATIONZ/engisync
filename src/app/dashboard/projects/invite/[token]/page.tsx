import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { preview } from "@/lib/plain-text";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInviteButton } from "./accept-button";

export const metadata: Metadata = { title: "Group invite" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await auth(); // dashboard layout already guards auth

  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: {
      workspace: {
        select: {
          name: true,
          description: true,
          department: { select: { name: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  const now = new Date();
  const invalid =
    !invite ||
    invite.revoked ||
    (invite.expiresAt && invite.expiresAt < now) ||
    (invite.maxUses !== null && invite.uses >= invite.maxUses);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Group invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invalid || !invite ? (
            <>
              <p className="text-sm text-destructive">
                This invite link is invalid, expired, or has reached its use
                limit.
              </p>
              <Link
                href="/dashboard/projects"
                className="text-sm text-primary hover:underline"
              >
                Go to your projects
              </Link>
            </>
          ) : (
            <>
              <div>
                <p className="text-lg font-semibold">{invite.workspace.name}</p>
                {invite.workspace.department && (
                  <p className="text-sm text-muted-foreground">
                    {invite.workspace.department.name}
                  </p>
                )}
                {invite.workspace.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {preview(invite.workspace.description, 220)}
                  </p>
                )}
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {invite.workspace._count.members} members
                </p>
              </div>
              <AcceptInviteButton token={token} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
