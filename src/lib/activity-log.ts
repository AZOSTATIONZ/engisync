import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/identity";

/**
 * Writing to the activity feed.
 *
 * Only for events that CANNOT be derived from existing rows — stage changes,
 * approvals, members joining, budget updates. Anything that already has its
 * own row and timestamp (tasks, files, meetings, discussion posts) is derived
 * at read time in `activity.ts` instead, so it needs no write path and can
 * never drift out of sync with the record it describes.
 *
 * Recording activity must never break the action that triggered it — a failed
 * feed write is a logging problem, not a reason to fail a user's stage change.
 */

export type ActivityKind =
  | "STAGE"
  | "APPROVAL"
  | "MEMBER"
  | "BUDGET"
  | "DOCUMENT"
  | "AI"
  | "SYSTEM";

export async function recordActivity(input: {
  workspaceId: string;
  actorId: string | null;
  kind: ActivityKind;
  action: string;
  subject: string;
}): Promise<void> {
  try {
    let actorName = "Someone";
    if (input.actorId) {
      const user = await prisma.user.findUnique({
        where: { id: input.actorId },
        select: { name: true, email: true },
      });
      // Denormalised via displayName so the feed never stores a raw email and
      // stays readable after the account is deleted.
      actorName = displayName(user);
    }

    await prisma.activity.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        actorName,
        kind: input.kind,
        action: input.action,
        subject: input.subject,
      },
    });
  } catch (err) {
    console.error("[activity] failed to record", err);
  }
}
