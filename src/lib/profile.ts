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

/**
 * A profile as the OUTSIDE WORLD may see it.
 *
 * Returns null unless the student has explicitly published — there is no
 * "unlisted" middle ground, because a URL that leaks is a URL that is public.
 *
 * WHAT IS DELIBERATELY EXCLUDED, and why:
 *   - email: never rendered in shared UI at all (see identity.ts);
 *   - financial badges and contribution counts: whether someone could afford
 *     to pay into a group fund is not an employer's business;
 *   - tasks, deadlines and internal activity: day-to-day performance data that
 *     belongs to the student and their supervisor;
 *   - unpublished projects: only supervisor-APPROVED work appears, so the page
 *     shows verified achievement rather than self-reported claims.
 *
 * What remains is the part a graduate would actually want to show: who they
 * are, what they can do, and the work an institution stood behind.
 */
export async function getPublicProfile(handle: string) {
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: {
      id: true,
      name: true,
      image: true,
      headline: true,
      bio: true,
      skills: true,
      accentColor: true,
      avatarStyle: true,
      publicProfile: true,
      deptMemberships: {
        take: 1,
        select: { department: { select: { name: true } } },
      },
    },
  });

  // The flag is checked AFTER the lookup but before anything is returned, so a
  // private profile is indistinguishable from a handle that does not exist.
  if (!user || !user.publicProfile) return null;

  const workspaceIds = await userWorkspaceIds(user.id);
  const published = await prisma.publishedProject.findMany({
    where: { status: "PUBLISHED", workspaceId: { in: workspaceIds } },
    select: {
      slug: true,
      title: true,
      abstract: true,
      year: true,
      departmentName: true,
      downloads: true,
    },
    orderBy: { year: "desc" },
    take: 20,
  });

  return {
    name: user.name,
    image: user.image,
    headline: user.headline,
    bio: user.bio,
    skills: user.skills,
    accentColor: user.accentColor,
    avatarStyle: user.avatarStyle,
    department: user.deptMemberships[0]?.department.name ?? null,
    userId: user.id,
    published,
  };
}
