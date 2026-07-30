"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash } from "crypto";

import { auth } from "@/auth";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/policy";
import { recordActivity } from "@/lib/activity-log";
import { createNotification } from "@/lib/notifications";
import { displayName } from "@/lib/identity";
import { rateLimit } from "@/lib/rate-limit";
import {
  checkDeclaration,
  isBlocked,
  isCurrency,
  normaliseReference,
  parseAmountToCents,
  toBaseCents,
  type PaymentMethod,
} from "@/lib/finance";

/**
 * Finance actions.
 *
 * EngiSync never moves money. These actions record what members SAY they paid,
 * what a leader CONFIRMS, and what was spent — with every decision appended to
 * an immutable ledger rather than overwriting the previous state.
 */

export type FinanceState = { error?: string; success?: string } | null;

const METHODS: PaymentMethod[] = [
  "ECOCASH",
  "ONEMONEY",
  "INNBUCKS",
  "ZIPIT",
  "CASH",
  "BANK",
  "OTHER",
];

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function actorName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return displayName(u);
}

function rev(workspaceId: string) {
  revalidatePath(`/dashboard/budget/${workspaceId}`);
  revalidatePath(`/dashboard/projects/${workspaceId}`);
}

/** Cents → the Decimal string Prisma expects. */
function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/* ── Contribution requests ──────────────────────────────────────────── */

export async function createContributionRequest(
  workspaceId: string,
  _prev: FinanceState,
  formData: FormData,
): Promise<FinanceState> {
  const userId = await requireUserId();
  const authz = await authorize(workspaceId, userId, "budget.manage");
  if (!authz.ok) return { error: authz.error };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the request a title." };

  const targetCents = parseAmountToCents(String(formData.get("targetAmount") ?? ""));
  if (targetCents === null || targetCents <= 0) {
    return { error: "Enter a valid target amount." };
  }

  const perMemberRaw = String(formData.get("perMemberAmount") ?? "").trim();
  const perMemberCents = perMemberRaw ? parseAmountToCents(perMemberRaw) : null;
  if (perMemberRaw && perMemberCents === null) {
    return { error: "Enter a valid per-member amount." };
  }

  const currency = String(formData.get("currency") ?? "USD");
  if (!isCurrency(currency)) return { error: "Unsupported currency." };

  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  if (dueRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dueRaw)) {
    return { error: "Use a valid due date." };
  }

  await prisma.contributionRequest.create({
    data: {
      workspaceId,
      title,
      purpose: String(formData.get("purpose") ?? "").trim() || null,
      targetAmount: centsToDecimal(targetCents),
      perMemberAmount: perMemberCents !== null ? centsToDecimal(perMemberCents) : null,
      currency,
      dueDate: dueRaw ? new Date(dueRaw) : null,
      createdById: userId,
    },
  });

  await recordActivity({
    workspaceId,
    actorId: userId,
    kind: "BUDGET",
    action: "opened a contribution request for",
    subject: title,
  });

  // Everyone needs to know money is being asked for.
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, NOT: { userId } },
    select: { userId: true },
  });
  await Promise.all(
    members.map((m) =>
      createNotification({
        userId: m.userId,
        type: NotificationType.WORKSPACE,
        title: "New contribution request",
        body: title,
        link: `/dashboard/budget/${workspaceId}`,
      }),
    ),
  );

  rev(workspaceId);
  return { success: "Contribution request created." };
}

export async function closeContributionRequest(
  requestId: string,
): Promise<FinanceState> {
  const userId = await requireUserId();
  const req = await prisma.contributionRequest.findUnique({
    where: { id: requestId },
    select: { workspaceId: true, closed: true, title: true },
  });
  if (!req) return { error: "Request not found." };

  const authz = await authorize(req.workspaceId, userId, "budget.manage");
  if (!authz.ok) return { error: authz.error };

  await prisma.contributionRequest.update({
    where: { id: requestId },
    data: { closed: !req.closed },
  });
  rev(req.workspaceId);
  return { success: req.closed ? "Request reopened." : "Request closed." };
}

/* ── Payment instructions ───────────────────────────────────────────── */

export async function savePaymentInstructions(
  workspaceId: string,
  _prev: FinanceState,
  formData: FormData,
): Promise<FinanceState> {
  const userId = await requireUserId();
  const authz = await authorize(workspaceId, userId, "budget.manage");
  if (!authz.ok) return { error: authz.error };

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;

  // Deliberately narrow: a mobile number and an account name are all that is
  // needed to receive money. We never ask for a PIN, password or OTP, and
  // there is no field here in which one could be stored.
  const data = {
    ecocashNumber: str("ecocashNumber"),
    ecocashName: str("ecocashName"),
    oneMoneyNumber: str("oneMoneyNumber"),
    bankName: str("bankName"),
    bankAccountName: str("bankAccountName"),
    bankAccountNumber: str("bankAccountNumber"),
    notes: str("notes"),
    updatedById: userId,
  };

  await prisma.paymentInstruction.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
  });

  rev(workspaceId);
  return { success: "Payment details saved." };
}

/* ── Declaring a payment ────────────────────────────────────────────── */

/**
 * "I have paid."
 *
 * A member records a transfer they made through their own provider. Nothing
 * here is trusted yet — it enters the ledger as DECLARED and needs a human to
 * confirm it.
 */
export async function declarePayment(
  workspaceId: string,
  _prev: FinanceState,
  formData: FormData,
): Promise<FinanceState> {
  const userId = await requireUserId();

  // Members declare their own payments, so this only needs project membership.
  const authz = await authorize(workspaceId, userId, "project.view");
  if (!authz.ok) return { error: authz.error };

  const limited = rateLimit(`declare:${userId}`, 20, 15 * 60_000);
  if (!limited.ok) {
    return { error: "Too many submissions. Please try again shortly." };
  }

  const method = String(formData.get("method") ?? "ECOCASH") as PaymentMethod;
  if (!METHODS.includes(method)) return { error: "Unknown payment method." };

  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (amountCents === null) return { error: "Enter a valid amount." };

  const currency = String(formData.get("currency") ?? "USD");
  if (!isCurrency(currency)) return { error: "Unsupported currency." };

  const rateRaw = String(formData.get("exchangeRate") ?? "1").trim();
  const rate = Number(rateRaw || "1");
  if (!Number.isFinite(rate) || rate <= 0) return { error: "Enter a valid exchange rate." };

  const refRaw = String(formData.get("reference") ?? "").trim();
  const reference = refRaw ? normaliseReference(refRaw) : null;

  const paidAtRaw = String(formData.get("paidAt") ?? "").trim();
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : null;
  if (paidAt && Number.isNaN(paidAt.getTime())) {
    return { error: "Enter a valid payment time." };
  }

  const requestId = String(formData.get("requestId") ?? "").trim() || null;

  // Receipt (optional).
  let receiptHash: string | null = null;
  let receiptFileId: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return { error: "Receipt must be under 5 MB." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    receiptHash = createHash("sha256").update(bytes).digest("hex");
    const stored = await prisma.fileResource.create({
      data: {
        name: file.name || "receipt",
        mimeType: file.type || "application/octet-stream",
        size: bytes.length,
        data: bytes,
        workspaceId,
        uploaderId: userId,
        description: "Payment receipt",
      },
      select: { id: true },
    });
    receiptFileId = stored.id;
  }

  // Deterministic duplicate lookups.
  const [dupRef, dupReceipt, request] = await Promise.all([
    reference
      ? prisma.contribution.findFirst({
          where: { workspaceId, reference },
          select: { id: true },
        })
      : Promise.resolve(null),
    receiptHash
      ? prisma.contribution.findFirst({
          where: { workspaceId, receiptHash },
          select: { id: true },
        })
      : Promise.resolve(null),
    requestId
      ? prisma.contributionRequest.findUnique({
          where: { id: requestId },
          select: { id: true, workspaceId: true, perMemberAmount: true },
        })
      : Promise.resolve(null),
  ]);

  if (requestId && (!request || request.workspaceId !== workspaceId)) {
    return { error: "That contribution request doesn't belong to this project." };
  }

  const expectedCents = request?.perMemberAmount
    ? parseAmountToCents(request.perMemberAmount.toString())
    : null;

  const flags = checkDeclaration(
    {
      method,
      reference,
      amountCents,
      paidAt,
      currency,
      receiptHash,
      hasReceipt: Boolean(receiptFileId),
    },
    {
      now: new Date(),
      expectedCents,
      duplicateReceipt: Boolean(dupReceipt),
      duplicateReference: Boolean(dupRef),
    },
  );

  if (isBlocked(flags)) {
    return { error: flags.find((f) => f.severity === "block")!.message };
  }

  const name = await actorName(userId);
  const noteFlags = flags.length
    ? flags.map((f) => `${f.severity.toUpperCase()}: ${f.message}`).join("\n")
    : null;

  try {
    const created = await prisma.contribution.create({
      data: {
        workspaceId,
        userId,
        recordedById: userId,
        requestId: request?.id ?? null,
        amount: centsToDecimal(amountCents),
        baseAmount: centsToDecimal(toBaseCents(amountCents, rate)),
        currency,
        exchangeRate: String(rate),
        method,
        reference,
        paidAt,
        receiptFileId,
        receiptHash,
        status: "DECLARED",
        note: String(formData.get("note") ?? "").trim() || null,
      },
      select: { id: true },
    });

    await prisma.ledgerEvent.create({
      data: {
        contributionId: created.id,
        type: "DECLARED",
        actorId: userId,
        actorName: name,
        note: noteFlags,
      },
    });
  } catch (err: unknown) {
    // The unique constraint is the real guarantee; the pre-check above is only
    // a friendlier message. This catches the race between the two.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return {
        error: "This transaction reference has already been recorded for this project.",
      };
    }
    throw err;
  }

  await recordActivity({
    workspaceId,
    actorId: userId,
    kind: "BUDGET",
    action: "declared a payment of",
    subject: `${currency} ${(amountCents / 100).toFixed(2)}`,
  });

  const leaders = await prisma.workspaceMember.findMany({
    where: { workspaceId, OR: [{ role: "LEADER" }, { canApprove: true }] },
    select: { userId: true },
  });
  await Promise.all(
    leaders.map((l) =>
      createNotification({
        userId: l.userId,
        type: NotificationType.WORKSPACE,
        title: "Payment awaiting verification",
        body: `${name} declared ${currency} ${(amountCents / 100).toFixed(2)}.`,
        link: `/dashboard/budget/${workspaceId}`,
      }),
    ),
  );

  rev(workspaceId);
  return {
    success: flags.length
      ? "Payment recorded. The leader will review it — some details need a second look."
      : "Payment recorded. Awaiting verification by your group leader.",
  };
}

/* ── Verification ───────────────────────────────────────────────────── */

async function transition(
  contributionId: string,
  to: "VERIFIED" | "REJECTED" | "DISPUTED",
  note: string | null,
  opts: { requireApproval: boolean },
): Promise<FinanceState> {
  const userId = await requireUserId();

  const c = await prisma.contribution.findUnique({
    where: { id: contributionId },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      status: true,
      amount: true,
      currency: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!c) return { error: "Payment not found." };

  if (opts.requireApproval) {
    const authz = await authorize(c.workspaceId, userId, "budget.manage");
    if (!authz.ok) return { error: authz.error };
  } else {
    // Disputes: only the person who declared the payment may raise one.
    if (c.userId !== userId) {
      return { error: "Only the person who made this payment can dispute it." };
    }
    if (c.status !== "REJECTED") {
      return { error: "You can only dispute a rejected payment." };
    }
  }

  if (c.status === to) return null;

  const name = await actorName(userId);

  // Status is updated AND an event appended. The event log is the record of
  // truth; the status column is a materialised convenience for querying.
  await prisma.$transaction([
    prisma.contribution.update({
      where: { id: contributionId },
      data: {
        status: to,
        ...(to === "VERIFIED"
          ? { verifiedById: userId, verifiedAt: new Date() }
          : {}),
      },
    }),
    prisma.ledgerEvent.create({
      data: {
        contributionId,
        type: to,
        actorId: userId,
        actorName: name,
        note,
      },
    }),
  ]);

  const amountLabel = `${c.currency} ${Number(c.amount).toFixed(2)}`;

  if (to === "VERIFIED" || to === "REJECTED") {
    await createNotification({
      userId: c.userId,
      type: NotificationType.WORKSPACE,
      title: to === "VERIFIED" ? "Payment verified" : "Payment not verified",
      body:
        to === "VERIFIED"
          ? `Your ${amountLabel} contribution was confirmed.`
          : `Your ${amountLabel} contribution was rejected${note ? `: ${note}` : "."} You can dispute this.`,
      link: `/dashboard/budget/${c.workspaceId}`,
    });
  }

  if (to === "DISPUTED") {
    const leaders = await prisma.workspaceMember.findMany({
      where: { workspaceId: c.workspaceId, role: "LEADER" },
      select: { userId: true },
    });
    await Promise.all(
      leaders.map((l) =>
        createNotification({
          userId: l.userId,
          type: NotificationType.WORKSPACE,
          title: "Payment disputed",
          body: `${name} disputed a rejected ${amountLabel} contribution.`,
          link: `/dashboard/budget/${c.workspaceId}`,
        }),
      ),
    );
  }

  await recordActivity({
    workspaceId: c.workspaceId,
    actorId: userId,
    kind: to === "DISPUTED" ? "APPROVAL" : "APPROVAL",
    action:
      to === "VERIFIED"
        ? "verified a payment of"
        : to === "REJECTED"
          ? "rejected a payment of"
          : "disputed a decision on",
    subject: amountLabel,
  });

  rev(c.workspaceId);
  return {
    success:
      to === "VERIFIED"
        ? "Payment verified."
        : to === "REJECTED"
          ? "Payment rejected."
          : "Dispute raised — your leader and supervisor can see this.",
  };
}

export async function verifyPayment(contributionId: string): Promise<FinanceState> {
  return transition(contributionId, "VERIFIED", null, { requireApproval: true });
}

export async function rejectPayment(
  contributionId: string,
  reason: string,
): Promise<FinanceState> {
  const note = reason.trim();
  if (!note) return { error: "Give a reason so the member can respond." };
  return transition(contributionId, "REJECTED", note, { requireApproval: true });
}

export async function disputePayment(
  contributionId: string,
  reason: string,
): Promise<FinanceState> {
  const note = reason.trim();
  if (!note) return { error: "Explain why you think this is wrong." };
  return transition(contributionId, "DISPUTED", note, { requireApproval: false });
}
