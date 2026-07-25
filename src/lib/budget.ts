import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";

export const METHOD_LABELS: Record<string, string> = {
  ECOCASH: "EcoCash",
  ONEMONEY: "OneMoney",
  INNBUCKS: "InnBucks",
  CASH: "Cash",
  BANK: "Bank",
  OTHER: "Other",
};

export const CATEGORY_LABELS: Record<string, string> = {
  COMPONENTS: "Components",
  TOOLS: "Tools",
  PRINTING: "Printing",
  TRANSPORT: "Transport",
  SOFTWARE: "Software",
  SERVICES: "Services",
  OTHER: "Other",
};

/** Format an amount in the given currency. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Prisma Decimal has toNumber(); guard for plain numbers too.
function toNum(v: unknown): number {
  if (v && typeof v === "object" && "toNumber" in v) {
    return (v as { toNumber(): number }).toNumber();
  }
  return Number(v ?? 0);
}

/** Budget summaries for all of the user's workspaces (landing page). */
export async function listWorkspaceBudgets(userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: wsIds } },
    select: {
      id: true,
      name: true,
      currency: true,
      budgetTarget: true,
      contributions: { select: { amount: true } },
      expenses: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return workspaces.map((w) => {
    const contributed = w.contributions.reduce((s, c) => s + toNum(c.amount), 0);
    const spent = w.expenses.reduce((s, e) => s + toNum(e.amount), 0);
    return {
      id: w.id,
      name: w.name,
      currency: w.currency,
      target: w.budgetTarget ? toNum(w.budgetTarget) : null,
      contributed,
      spent,
      balance: contributed - spent,
    };
  });
}

/** Full budget detail for one workspace (or null if no access). */
export async function getWorkspaceBudget(workspaceId: string, userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  if (!wsIds.includes(workspaceId)) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      currency: true,
      budgetTarget: true,
      leaderId: true,
      members: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      contributions: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      expenses: {
        include: { spentBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!workspace) return null;

  const contributed = workspace.contributions.reduce(
    (s, c) => s + toNum(c.amount),
    0,
  );
  const spent = workspace.expenses.reduce((s, e) => s + toNum(e.amount), 0);

  // Per-member contribution totals.
  const perMember = new Map<string, { name: string; total: number }>();
  for (const m of workspace.members) {
    perMember.set(m.userId, {
      name: m.user.name ?? m.user.email,
      total: 0,
    });
  }
  for (const c of workspace.contributions) {
    const entry = perMember.get(c.userId);
    if (entry) entry.total += toNum(c.amount);
  }

  const isLeader = workspace.leaderId === userId;

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      currency: workspace.currency,
      target: workspace.budgetTarget ? toNum(workspace.budgetTarget) : null,
    },
    isLeader,
    members: workspace.members.map((m) => ({
      id: m.userId,
      name: m.user.name ?? m.user.email,
    })),
    contributions: workspace.contributions.map((c) => ({
      id: c.id,
      amount: toNum(c.amount),
      method: c.method,
      reference: c.reference,
      note: c.note,
      contributorName: c.user.name ?? c.user.email,
      createdAt: c.createdAt.toISOString(),
    })),
    expenses: workspace.expenses.map((e) => ({
      id: e.id,
      amount: toNum(e.amount),
      category: e.category,
      description: e.description,
      reference: e.reference,
      spentByName: e.spentBy?.name ?? e.spentBy?.email ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    totals: {
      contributed,
      spent,
      balance: contributed - spent,
    },
    perMember: [...perMember.entries()].map(([id, v]) => ({
      id,
      name: v.name,
      total: v.total,
    })),
  };
}
