import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/identity";
import { getContext, can } from "@/lib/policy";
import { computeTotals, type FinanceTotals } from "@/lib/finance";

/**
 * Read model for the project finance workspace.
 *
 * Everything a member can see, a member CAN see: full expense history, every
 * contribution, every verification decision. Transparency to the whole group
 * is the real fraud control — far more effective than any check on an
 * individual receipt.
 */

/** Prisma Decimal → integer cents, without going through a float. */
function decimalToCents(d: { toString(): string }): number {
  const [whole, frac = ""] = d.toString().split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const w = Math.abs(Number(whole));
  return sign * (w * 100 + Number(frac.padEnd(2, "0").slice(0, 2)));
}

export type FinancePayment = {
  id: string;
  memberName: string;
  memberId: string;
  amountCents: number;
  baseAmountCents: number;
  currency: string;
  method: string;
  reference: string | null;
  status: "DECLARED" | "VERIFIED" | "REJECTED" | "DISPUTED";
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  receiptFileId: string | null;
  requestTitle: string | null;
  isMine: boolean;
  events: {
    id: string;
    type: string;
    actorName: string;
    note: string | null;
    at: string;
  }[];
};

export type FinanceExpense = {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  baseAmountCents: number;
  currency: string;
  vendor: string | null;
  spentByName: string | null;
  receiptFileId: string | null;
  at: string;
};

export type FinanceRequest = {
  id: string;
  title: string;
  purpose: string | null;
  targetCents: number;
  perMemberCents: number | null;
  currency: string;
  dueDate: string | null;
  closed: boolean;
  paidMemberIds: string[];
  memberCount: number;
  iHavePaid: boolean;
};

export type ProjectFinance = {
  workspaceId: string;
  workspaceName: string;
  baseCurrency: string;
  totals: FinanceTotals;
  payments: FinancePayment[];
  expenses: FinanceExpense[];
  requests: FinanceRequest[];
  queue: FinancePayment[];
  instructions: {
    ecocashNumber: string | null;
    ecocashName: string | null;
    oneMoneyNumber: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    notes: string | null;
  } | null;
  memberCount: number;
  members: { id: string; name: string }[];
  canManage: boolean;
  myVerifiedCents: number;
  myPendingCents: number;
};

export async function getProjectFinance(
  workspaceId: string,
  userId: string,
): Promise<ProjectFinance | null> {
  const ctx = await getContext(workspaceId, userId);
  if (!can(ctx, "budget.view")) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      currency: true,
      budgetTarget: true,
      _count: { select: { members: true } },
      members: {
        select: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      paymentInstruction: true,
      contributionRequests: {
        orderBy: [{ closed: "asc" }, { createdAt: "desc" }],
        include: {
          contributions: {
            select: { userId: true, status: true },
          },
        },
      },
      contributions: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          request: { select: { title: true } },
          events: { orderBy: { createdAt: "asc" } },
        },
      },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: { spentBy: { select: { name: true, email: true } } },
      },
    },
  });
  if (!workspace) return null;

  const payments: FinancePayment[] = workspace.contributions.map((c) => ({
    id: c.id,
    memberId: c.userId,
    memberName: displayName(c.user),
    amountCents: decimalToCents(c.amount),
    baseAmountCents: decimalToCents(c.baseAmount),
    currency: c.currency,
    method: c.method,
    reference: c.reference,
    status: c.status as FinancePayment["status"],
    note: c.note,
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    receiptFileId: c.receiptFileId,
    requestTitle: c.request?.title ?? null,
    isMine: c.userId === userId,
    events: c.events.map((e) => ({
      id: e.id,
      type: e.type,
      actorName: e.actorName,
      note: e.note,
      at: e.createdAt.toISOString(),
    })),
  }));

  const expenses: FinanceExpense[] = workspace.expenses.map((e) => ({
    id: e.id,
    description: e.description,
    category: e.category,
    amountCents: decimalToCents(e.amount),
    baseAmountCents: decimalToCents(e.baseAmount),
    currency: e.currency,
    vendor: e.vendor,
    spentByName: e.spentBy ? displayName(e.spentBy) : null,
    receiptFileId: e.receiptFileId,
    at: (e.spentAt ?? e.createdAt).toISOString(),
  }));

  const requests: FinanceRequest[] = workspace.contributionRequests.map((r) => {
    const paid = r.contributions
      .filter((c) => c.status === "VERIFIED")
      .map((c) => c.userId);
    return {
      id: r.id,
      title: r.title,
      purpose: r.purpose,
      targetCents: decimalToCents(r.targetAmount),
      perMemberCents: r.perMemberAmount ? decimalToCents(r.perMemberAmount) : null,
      currency: r.currency,
      dueDate: r.dueDate ? r.dueDate.toISOString() : null,
      closed: r.closed,
      paidMemberIds: [...new Set(paid)],
      memberCount: workspace._count.members,
      iHavePaid: r.contributions.some(
        (c) => c.userId === userId && c.status !== "REJECTED",
      ),
    };
  });

  const totals = computeTotals(
    payments.map((p) => ({ baseAmountCents: p.baseAmountCents, status: p.status })),
    expenses.map((e) => e.baseAmountCents),
    workspace.budgetTarget ? decimalToCents(workspace.budgetTarget) : 0,
  );

  const mine = payments.filter((p) => p.isMine);

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    baseCurrency: workspace.currency,
    totals,
    payments,
    expenses,
    requests,
    // Disputes surface first: an unresolved dispute is the most urgent thing
    // in this module.
    queue: payments
      .filter((p) => p.status === "DECLARED" || p.status === "DISPUTED")
      .sort((a, b) => (a.status === "DISPUTED" ? -1 : b.status === "DISPUTED" ? 1 : 0)),
    instructions: workspace.paymentInstruction
      ? {
          ecocashNumber: workspace.paymentInstruction.ecocashNumber,
          ecocashName: workspace.paymentInstruction.ecocashName,
          oneMoneyNumber: workspace.paymentInstruction.oneMoneyNumber,
          bankName: workspace.paymentInstruction.bankName,
          bankAccountName: workspace.paymentInstruction.bankAccountName,
          bankAccountNumber: workspace.paymentInstruction.bankAccountNumber,
          notes: workspace.paymentInstruction.notes,
        }
      : null,
    memberCount: workspace._count.members,
    members: workspace.members.map((m) => ({
      id: m.user.id,
      name: displayName(m.user),
    })),
    canManage: can(ctx, "budget.manage"),
    myVerifiedCents: mine
      .filter((p) => p.status === "VERIFIED")
      .reduce((s, p) => s + p.baseAmountCents, 0),
    myPendingCents: mine
      .filter((p) => p.status === "DECLARED")
      .reduce((s, p) => s + p.baseAmountCents, 0),
  };
}
