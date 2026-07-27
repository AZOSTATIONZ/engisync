"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Paperclip,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  declarePayment,
  verifyPayment,
  rejectPayment,
  disputePayment,
  createContributionRequest,
  savePaymentInstructions,
  type FinanceState,
} from "../finance-actions";
import { formatCents, STATUS_LABEL } from "@/lib/finance";
import type { FinancePayment, FinanceRequest } from "@/lib/finance-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function useToastAction(
  fn: (p: FinanceState, fd: FormData) => Promise<FinanceState>,
) {
  const router = useRouter();
  return useActionState<FinanceState, FormData>(async (prev, fd) => {
    const res = await fn(prev, fd);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      router.refresh();
    }
    return res;
  }, null);
}

const STATUS_STYLE: Record<FinancePayment["status"], string> = {
  VERIFIED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  DECLARED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  REJECTED: "bg-destructive/10 text-destructive",
  DISPUTED: "bg-destructive/15 text-destructive",
};

export function StatusPill({ status }: { status: FinancePayment["status"] }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {status === "VERIFIED" && <Check className="h-3 w-3" />}
      {status === "DECLARED" && <Clock className="h-3 w-3" />}
      {status === "DISPUTED" && <ShieldAlert className="h-3 w-3" />}
      {status === "REJECTED" && <X className="h-3 w-3" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ── "I have paid" ─────────────────────────────────────────────────── */

export function DeclarePaymentForm({
  workspaceId,
  baseCurrency,
  requests,
}: {
  workspaceId: string;
  baseCurrency: string;
  requests: FinanceRequest[];
}) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(baseCurrency);
  const [state, action] = useToastAction(declarePayment.bind(null, workspaceId));

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        I have paid
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Record a payment you made</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stated plainly and permanently: this app never takes money. */}
        <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          Pay through your own EcoCash, OneMoney or bank app first, then record it
          here. EngiSync never handles your money and will never ask for your PIN,
          password or a one-time code.
        </p>

        <form action={action} className="space-y-3">
          {requests.filter((r) => !r.closed).length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="requestId">What is this for?</Label>
              <select id="requestId" name="requestId" className={selectClass}>
                <option value="">General contribution</option>
                {requests
                  .filter((r) => !r.closed)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                      {r.perMemberCents
                        ? ` — ${formatCents(r.perMemberCents, r.currency)} each`
                        : ""}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="method">Payment method</Label>
              <select id="method" name="method" className={selectClass} defaultValue="ECOCASH">
                <option value="ECOCASH">EcoCash</option>
                <option value="ONEMONEY">OneMoney</option>
                <option value="INNBUCKS">InnBucks</option>
                <option value="ZIPIT">ZIPIT</option>
                <option value="BANK">Bank transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                className={selectClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="ZWG">ZWG</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="amount">Amount paid</Label>
              <Input id="amount" name="amount" inputMode="decimal" placeholder="15.00" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="paidAt">When did you pay?</Label>
              <Input id="paidAt" name="paidAt" type="datetime-local" />
            </div>
          </div>

          {/* Only asked for when it actually matters — a mismatched base
              currency is the one case where a rate is needed. */}
          {currency !== baseCurrency && (
            <div className="space-y-1">
              <Label htmlFor="exchangeRate">
                Rate to {baseCurrency} (1 {currency} = ? {baseCurrency})
              </Label>
              <Input
                id="exchangeRate"
                name="exchangeRate"
                inputMode="decimal"
                defaultValue="1"
              />
              <p className="text-xs text-muted-foreground">
                Recorded with this payment so past totals don&apos;t shift when
                rates move.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="reference">Transaction reference</Label>
            <Input
              id="reference"
              name="reference"
              placeholder="e.g. MP250727.1234.A56789"
              autoCapitalize="characters"
            />
            <p className="text-xs text-muted-foreground">
              From your payment confirmation message. Each reference can only be
              recorded once per project.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="receipt">Receipt or screenshot (optional)</Label>
            <Input id="receipt" name="receipt" type="file" accept="image/*,application/pdf" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" name="note" rows={2} />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex gap-2">
            <SubmitBtn label="Submit for verification" />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Verification queue ────────────────────────────────────────────── */

export function VerificationQueue({ payments }: { payments: FinancePayment[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<FinanceState>) {
    setBusy(id);
    const res = await fn();
    setBusy(null);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      router.refresh();
    }
  }

  if (payments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing waiting for verification.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {payments.map((p) => (
        <li key={p.id} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {p.memberName} — {formatCents(p.amountCents, p.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.method}
                {p.reference && ` · ${p.reference}`}
                {p.requestTitle && ` · ${p.requestTitle}`}
              </p>
            </div>
            <StatusPill status={p.status} />
          </div>

          {/* Deterministic check output, recorded at declaration time. */}
          {p.events[0]?.note && (
            <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Automatic checks flagged this
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                {p.events[0].note}
              </p>
            </div>
          )}

          {p.status === "DISPUTED" && (
            <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
              <p className="font-medium text-destructive">Member disputed this decision</p>
              <p className="mt-0.5 text-muted-foreground">
                {p.events.filter((e) => e.type === "DISPUTED").at(-1)?.note}
              </p>
            </div>
          )}

          {p.receiptFileId && (
            <a
              href={`/api/files/${p.receiptFileId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Paperclip className="h-3 w-3" /> View receipt
            </a>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy === p.id}
              onClick={() => run(p.id, () => verifyPayment(p.id))}
            >
              <Check className="mr-1 h-4 w-4" /> Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === p.id}
              onClick={() => {
                const reason = prompt(
                  "Why can't this be verified? The member will see this and can dispute it.",
                  "",
                );
                if (!reason) return;
                run(p.id, () => rejectPayment(p.id, reason));
              }}
            >
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Payment timeline (everyone sees this) ─────────────────────────── */

export function PaymentTimeline({ payments }: { payments: FinancePayment[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  async function dispute(id: string) {
    const reason = prompt("Why do you think this rejection is wrong?", "");
    if (!reason) return;
    const res = await disputePayment(id, reason);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      router.refresh();
    }
  }

  if (payments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No payments recorded yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {payments.map((p) => (
        <li key={p.id} className="rounded-lg border">
          <button
            type="button"
            onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {p.memberName}
                {p.isMine && " (you)"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {formatCents(p.amountCents, p.currency)} · {p.method}
                {p.requestTitle && ` · ${p.requestTitle}`}
              </span>
            </span>
            <StatusPill status={p.status} />
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                expanded === p.id ? "rotate-180" : ""
              }`}
            />
          </button>

          {expanded === p.id && (
            <div className="border-t px-3 py-2">
              {/* Append-only history — this is what makes the ledger
                  tamper-evident. */}
              <ol className="space-y-2">
                {p.events.map((e) => (
                  <li key={e.id} className="flex gap-2 text-xs">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0">
                      <span className="font-medium">{e.actorName}</span>{" "}
                      <span className="text-muted-foreground">
                        {e.type.toLowerCase()}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        · {new Date(e.at).toLocaleString()}
                      </span>
                      {e.note && (
                        <span className="mt-0.5 block whitespace-pre-wrap text-muted-foreground">
                          {e.note}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>

              {p.reference && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Reference: <span className="font-mono">{p.reference}</span>
                </p>
              )}

              {p.receiptFileId && (
                <a
                  href={`/api/files/${p.receiptFileId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Paperclip className="h-3 w-3" /> Receipt
                </a>
              )}

              {/* The member's recourse against an incorrect rejection. */}
              {p.isMine && p.status === "REJECTED" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => dispute(p.id)}
                >
                  Dispute this decision
                </Button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Leader forms ──────────────────────────────────────────────────── */

export function ContributionRequestForm({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useToastAction(
    createContributionRequest.bind(null, workspaceId),
  );

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        New contribution request
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-lg border p-3">
      <div className="space-y-1">
        <Label htmlFor="title">What is the money for?</Label>
        <Input id="title" name="title" placeholder="PCB manufacturing" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="targetAmount">Total needed</Label>
          <Input id="targetAmount" name="targetAmount" inputMode="decimal" placeholder="120.00" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="perMemberAmount">Per member</Label>
          <Input id="perMemberAmount" name="perMemberAmount" inputMode="decimal" placeholder="15.00" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="currency">Currency</Label>
          <select id="currency" name="currency" className={selectClass} defaultValue="USD">
            <option value="USD">USD</option>
            <option value="ZWG">ZWG</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="dueDate">Deadline</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="purpose">Details (optional)</Label>
        <Textarea id="purpose" name="purpose" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitBtn label="Create request" />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function PaymentInstructionsForm({
  workspaceId,
  instructions,
}: {
  workspaceId: string;
  instructions: {
    ecocashNumber: string | null;
    ecocashName: string | null;
    oneMoneyNumber: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    notes: string | null;
  } | null;
}) {
  const [state, action] = useToastAction(
    savePaymentInstructions.bind(null, workspaceId),
  );

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ecocashNumber">EcoCash number</Label>
          <Input id="ecocashNumber" name="ecocashNumber" defaultValue={instructions?.ecocashNumber ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ecocashName">Account name</Label>
          <Input id="ecocashName" name="ecocashName" defaultValue={instructions?.ecocashName ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="oneMoneyNumber">OneMoney number</Label>
          <Input id="oneMoneyNumber" name="oneMoneyNumber" defaultValue={instructions?.oneMoneyNumber ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bankName">Bank</Label>
          <Input id="bankName" name="bankName" defaultValue={instructions?.bankName ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bankAccountName">Bank account name</Label>
          <Input id="bankAccountName" name="bankAccountName" defaultValue={instructions?.bankAccountName ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bankAccountNumber">Bank account number</Label>
          <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={instructions?.bankAccountNumber ?? ""} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes for members</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={instructions?.notes ?? ""} />
      </div>
      <p className="text-xs text-muted-foreground">
        Only enter details needed to receive money. Never enter a PIN, password
        or one-time code — no one from EngiSync will ever ask for these.
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitBtn label="Save payment details" />
    </form>
  );
}
