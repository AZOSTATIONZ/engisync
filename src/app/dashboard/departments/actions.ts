"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DepartmentRole, SystemRole, NotificationType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { departmentSchema, announcementSchema, deptRoleEnum } from "@/lib/validations";
import { assertSingleDepartment, isDeptAdmin } from "@/lib/department";
import { createNotification } from "@/lib/notifications";
import { verifiedAccountGate } from "@/lib/verification";

export type ActionState = { error?: string; success?: string } | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function createDepartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  // University-level action: only system admins create departments.
  if (user.systemRole !== SystemRole.ADMIN) {
    return { error: "Only a university administrator can create departments." };
  }

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, code, description } = parsed.data;

  const existing = await prisma.department.findUnique({ where: { code } });
  if (existing) return { error: `A department with code "${code}" already exists.` };

  /**
   * The creator becomes the new department's ADMIN.
   *
   * This is correct and NOT a violation of the one-department rule: only
   * system administrators reach this code, they are staff rather than
   * students, and the rule counts MEMBER rows only (see
   * `assertSingleDepartment`). A university administrator is legitimately the
   * admin of every department — refusing to enrol them here would leave new
   * departments with nobody able to manage them.
   */
  const dept = await prisma.department.create({
    data: {
      name,
      code,
      description: description || null,
      createdById: user.id,
      members: { create: { userId: user.id, role: DepartmentRole.ADMIN } },
    },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "DEPARTMENT_CREATED", target: dept.id },
  });

  revalidatePath("/dashboard/departments");
  return { success: `Department "${name}" created.` };
}

export async function joinDepartment(departmentId: string): Promise<ActionState> {
  const user = await requireUser();

  // Joining a department puts you on a real roster other students and staff
  // see, so the account behind it has to be a reachable person.
  const unverified = await verifiedAccountGate(user.id);
  if (unverified) return { error: unverified };

  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) return { error: "Department not found." };

  // One department per student — defined once, in lib/department.ts.
  const clash = await assertSingleDepartment(user.id, departmentId);
  if (clash) return { error: clash };

  await prisma.departmentMember.upsert({
    where: { departmentId_userId: { departmentId, userId: user.id } },
    create: { departmentId, userId: user.id, role: DepartmentRole.MEMBER },
    update: {},
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "DEPARTMENT_JOINED", target: departmentId },
  });

  revalidatePath("/dashboard/departments");
  revalidatePath(`/dashboard/departments/${departmentId}`);
  return { success: `Joined ${dept.name}.` };
}

export async function leaveDepartment(departmentId: string): Promise<ActionState> {
  const user = await requireUser();
  const membership = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId, userId: user.id } },
  });
  if (!membership) return { error: "You are not in this department." };
  if (membership.role === DepartmentRole.ADMIN) {
    return { error: "Department admins can't leave their own department." };
  }

  await prisma.departmentMember.delete({
    where: { departmentId_userId: { departmentId, userId: user.id } },
  });

  revalidatePath("/dashboard/departments");
  revalidatePath(`/dashboard/departments/${departmentId}`);
  return { success: "Left the department." };
}

// ── Department admin tools ──

export async function postAnnouncement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = announcementSchema.safeParse({
    departmentId: formData.get("departmentId"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { departmentId, title, body } = parsed.data;

  if (!(await isDeptAdmin(departmentId, user.id))) {
    return { error: "Only a department admin can post announcements." };
  }

  await prisma.departmentAnnouncement.create({
    data: { departmentId, title, body, authorId: user.id },
  });

  // Notify every department member (except the author).
  const members = await prisma.departmentMember.findMany({
    where: { departmentId, NOT: { userId: user.id } },
    select: { userId: true },
  });
  await Promise.all(
    members.map((m) =>
      createNotification({
        userId: m.userId,
        type: NotificationType.SYSTEM,
        title: `Announcement: ${title}`,
        // A department announcement is the canonical "you need to know this".
        essential: true,
        body: body.slice(0, 140),
        link: `/dashboard/departments/${departmentId}`,
      }),
    ),
  );
  await prisma.auditLog.create({
    data: { userId: user.id, action: "DEPT_ANNOUNCEMENT_POSTED", target: departmentId },
  });

  revalidatePath(`/dashboard/departments/${departmentId}`);
  return { success: "Announcement posted." };
}

export async function deleteAnnouncement(id: string): Promise<ActionState> {
  const user = await requireUser();
  const a = await prisma.departmentAnnouncement.findUnique({ where: { id } });
  if (!a) return { error: "Announcement not found." };
  const allowed =
    a.authorId === user.id || (await isDeptAdmin(a.departmentId, user.id));
  if (!allowed) return { error: "You can't delete this announcement." };

  await prisma.departmentAnnouncement.delete({ where: { id } });
  revalidatePath(`/dashboard/departments/${a.departmentId}`);
  return { success: "Announcement deleted." };
}

export async function setMemberRole(
  departmentId: string,
  targetUserId: string,
  role: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!(await isDeptAdmin(departmentId, user.id))) {
    return { error: "Only a department admin can change roles." };
  }
  const parsed = deptRoleEnum.safeParse(role);
  if (!parsed.success) return { error: "Invalid role." };

  // Prevent removing the last admin.
  if (parsed.data === "MEMBER") {
    const adminCount = await prisma.departmentMember.count({
      where: { departmentId, role: "ADMIN" },
    });
    const target = await prisma.departmentMember.findUnique({
      where: { departmentId_userId: { departmentId, userId: targetUserId } },
    });
    if (target?.role === "ADMIN" && adminCount <= 1) {
      return { error: "A department must keep at least one admin." };
    }
  }

  await prisma.departmentMember.update({
    where: { departmentId_userId: { departmentId, userId: targetUserId } },
    data: { role: parsed.data },
  });

  revalidatePath(`/dashboard/departments/${departmentId}`);
  return { success: "Member role updated." };
}

export async function removeMember(
  departmentId: string,
  targetUserId: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!(await isDeptAdmin(departmentId, user.id))) {
    return { error: "Only a department admin can remove members." };
  }
  if (targetUserId === user.id) {
    return { error: "You can't remove yourself." };
  }
  const target = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId, userId: targetUserId } },
  });
  if (target?.role === "ADMIN") {
    return { error: "Demote this admin to a member before removing them." };
  }

  await prisma.departmentMember.delete({
    where: { departmentId_userId: { departmentId, userId: targetUserId } },
  });
  revalidatePath(`/dashboard/departments/${departmentId}`);
  return { success: "Member removed." };
}
