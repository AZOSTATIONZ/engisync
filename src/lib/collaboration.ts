import { prisma } from "@/lib/prisma";

/** All departments involved in a group: its primary + approved collaborators. */
export async function getInvolvedDepartments(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      department: { select: { id: true, name: true, code: true } },
      collaborations: {
        include: { department: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!workspace) return { primary: null, collaborations: [] };

  return {
    primary: workspace.department,
    collaborations: workspace.collaborations.map((c) => ({
      id: c.id,
      status: c.status,
      department: c.department,
    })),
  };
}

/** Pending collaboration requests targeting a department (for its admins). */
export async function listCollaborationRequests(departmentId: string) {
  const rows = await prisma.workspaceCollaboration.findMany({
    where: { departmentId, status: "PENDING" },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspace.id,
    workspaceName: r.workspace.name,
    fromDepartment: r.workspace.department?.name ?? null,
  }));
}

/** Approved groups collaborating with a department (not primary to it). */
export async function listCollaboratingGroups(departmentId: string) {
  const rows = await prisma.workspaceCollaboration.findMany({
    where: { departmentId, status: "APPROVED" },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          department: { select: { name: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.workspace.id,
    name: r.workspace.name,
    homeDepartment: r.workspace.department?.name ?? null,
    memberCount: r.workspace._count.members,
  }));
}
