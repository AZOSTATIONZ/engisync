"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";
import {
  contributionSchema,
  expenseSchema,
  budgetSettingsSchema,
} from "@/lib/validations";

export type ActionState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function requireMember(workspaceId: string, userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  return wsIds.includes(workspaceId);
}

async function isLeader(workspaceId: string, userId: string) {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return m?.role === "LEADER";
}

export async function addContribution(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = contributionSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    amount: formData.get("amount"),
    method: formData.get("method") || "ECOCASH",
    reference: formData.get("reference"),
    note: formData.get("note"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  if (!(await requireMember(data.workspaceId, userId))) {
    return { error: "You are not a member of this workspace." };
  }

  // Contributor defaults to the current user; only a leader can log for others.
  let contributorId = userId;
  if (data.userId && data.userId !== userId) {
    if (!(await isLeader(data.workspaceId, userId))) {
      return { error: "Only a group leader can log contributions for others." };
    }
    if (!(await requireMember(data.workspaceId, data.userId))) {
      return { error: "That contributor is not in this workspace." };
    }
    contributorId = data.userId;
  }

  // Leader-entered records are trusted at source and land VERIFIED — the
  // DECLARED → VERIFIED flow exists for members declaring their own payments.
  // baseAmount mirrors amount here because this path is single-currency.
  await prisma.contribution.create({
    data: {
      workspaceId: data.workspaceId,
      userId: contributorId,
      amount: data.amount,
      baseAmount: data.amount,
      status: contributorId === userId ? "DECLARED" : "VERIFIED",
      method: data.method,
      reference: data.reference ?? null,
      note: data.note ?? null,
      recordedById: userId,
      ...(contributorId !== userId
        ? { verifiedById: userId, verifiedAt: new Date() }
        : {}),
    },
  });
  await prisma.auditLog.create({
    data: { userId, action: "CONTRIBUTION_ADDED", target: data.workspaceId },
  });

  revalidatePath(`/dashboard/budget/${data.workspaceId}`);
  return { success: "Contribution recorded." };
}

export async function addExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = expenseSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    amount: formData.get("amount"),
    category: formData.get("category") || "OTHER",
    description: formData.get("description"),
    reference: formData.get("reference"),
    spentById: formData.get("spentById"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  if (!(await requireMember(data.workspaceId, userId))) {
    return { error: "You are not a member of this workspace." };
  }

  await prisma.expense.create({
    data: {
      workspaceId: data.workspaceId,
      amount: data.amount,
      baseAmount: data.amount,
      category: data.category,
      description: data.description,
      reference: data.reference ?? null,
      spentById: data.spentById || null,
      recordedById: userId,
    },
  });
  await prisma.auditLog.create({
    data: { userId, action: "EXPENSE_ADDED", target: data.workspaceId },
  });

  revalidatePath(`/dashboard/budget/${data.workspaceId}`);
  return { success: "Expense recorded." };
}

export async function deleteContribution(id: string): Promise<ActionState> {
  const userId = await requireUserId();
  const c = await prisma.contribution.findUnique({ where: { id } });
  if (!c) return { error: "Not found." };
  const allowed =
    c.recordedById === userId || (await isLeader(c.workspaceId, userId));
  if (!allowed) return { error: "You can't delete this entry." };

  await prisma.contribution.delete({ where: { id } });
  revalidatePath(`/dashboard/budget/${c.workspaceId}`);
  return { success: "Deleted." };
}

export async function deleteExpense(id: string): Promise<ActionState> {
  const userId = await requireUserId();
  const e = await prisma.expense.findUnique({ where: { id } });
  if (!e) return { error: "Not found." };
  const allowed =
    e.recordedById === userId || (await isLeader(e.workspaceId, userId));
  if (!allowed) return { error: "You can't delete this entry." };

  await prisma.expense.delete({ where: { id } });
  revalidatePath(`/dashboard/budget/${e.workspaceId}`);
  return { success: "Deleted." };
}

export async function updateBudgetSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = budgetSettingsSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    budgetTarget: formData.get("budgetTarget") || undefined,
    currency: formData.get("currency") || "USD",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { workspaceId, budgetTarget, currency } = parsed.data;

  if (!(await isLeader(workspaceId, userId))) {
    return { error: "Only the group leader can change budget settings." };
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      budgetTarget: budgetTarget && budgetTarget > 0 ? budgetTarget : null,
      currency: currency.toUpperCase(),
    },
  });

  revalidatePath(`/dashboard/budget/${workspaceId}`);
  return { success: "Budget settings updated." };
}
