import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";
import { EMPTY_STATS, type ContributionStats } from "@/lib/personalization";

/**
 * Contribution statistics for a profile.
 *
 * Every figure is COUNTED FROM RECORDS, never stored on the user. A cached
 * "tasksCompleted" column drifts the moment a task is reopened or a project
 * deleted, and a badge backed by a stale counter is worse than no badge —
 * `computeBadges` treats these as provable claims.
 *
 * Six counts in one round trip via `$transaction`. Deliberately NOT called
 * from the navbar: this is profile-page work, not something to repeat on
 * every page render.
 */
export async function getContributionStats(
  userId: string,
): Promise<ContributionStats> {
  /* Resolved up front because neither of the next two queries can filter by
     membership directly:
       - DocumentSection reaches a workspace only via its ProjectDocument;
       - PublishedProject stores a bare `workspaceId` with no relation field,
         deliberately — a published record is a SNAPSHOT and must survive the
         workspace being deleted (see the repository module).
     Filtering by id list is what those two shapes allow. */
  const workspaceIds = await userWorkspaceIds(userId);

  const [
    tasksCompleted,
    projectsLed,
    contributionsVerified,
    sectionsApproved,
    publishedProjects,
    supervises,
  ] = await prisma.$transaction([
    prisma.task.count({ where: { assigneeId: userId, status: "DONE" } }),
    prisma.workspaceMember.count({ where: { userId, role: "LEADER" } }),
    // VERIFIED only. A declared payment is a claim; the badge says "verified
    // contributor", so counting unconfirmed declarations would make it a lie.
    prisma.contribution.count({ where: { userId, status: "VERIFIED" } }),
    prisma.documentSection.count({
      where: {
        status: "APPROVED",
        document: { workspaceId: { in: workspaceIds } },
      },
    }),
    prisma.publishedProject.findMany({
      where: { status: "PUBLISHED", workspaceId: { in: workspaceIds } },
      select: { downloads: true },
    }),
    // Supervisor status is a DEPARTMENT role, not a field on Workspace —
    // supervisors oversee a department, not individual projects.
    prisma.departmentMember.count({ where: { userId, role: "SUPERVISOR" } }),
  ]);

  return {
    ...EMPTY_STATS,
    tasksCompleted,
    projectsLed,
    contributionsVerified,
    sectionsApproved,
    projectsPublished: publishedProjects.length,
    repositoryDownloads: publishedProjects.reduce(
      (sum, p) => sum + (p.downloads ?? 0),
      0,
    ),
    supervises,
  };
}
