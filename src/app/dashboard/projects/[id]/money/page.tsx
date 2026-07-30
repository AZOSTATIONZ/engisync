import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Landmark,
  Receipt,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { getProjectFinance } from "@/lib/finance-data";
import { formatCents } from "@/lib/finance";
import { CATEGORY_LABELS } from "@/lib/budget";
import { projectHome } from "@/lib/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DeclarePaymentForm,
  VerificationQueue,
  PaymentTimeline,
  ContributionRequestForm,
  PaymentInstructionsForm,
} from "./finance-ui";
import { AddExpenseForm, BudgetSettingsForm } from "./budget-ui";

export const metadata: Metadata = { title: "Project finance" };

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-bold ${
          tone === "good"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "warn"
              ? "text-amber-600 dark:text-amber-400"
              : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default async function ProjectFinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const fin = await getProjectFinance(id, session!.user.id);
  if (!fin) notFound();

  const base = fin.baseCurrency;
  const t = fin.totals;
  const openRequests = fin.requests.filter((r) => !r.closed);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={projectHome(fin.workspaceId)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {fin.workspaceName}
        </Link>
        <h1 className="text-2xl font-bold">Project finance</h1>
        <p className="text-muted-foreground">
          Track contributions and spending. Payments happen in your own EcoCash,
          OneMoney or bank app — EngiSync only keeps the record.
        </p>
      </div>

      {/* ── Totals ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Collected (verified)"
          value={formatCents(t.verifiedCents, base)}
          hint={
            t.pendingCents > 0
              ? `${formatCents(t.pendingCents, base)} awaiting verification`
              : undefined
          }
          tone="good"
        />
        <Stat label="Spent" value={formatCents(t.spentCents, base)} />
        <Stat
          label="Balance"
          value={formatCents(t.balanceCents, base)}
          hint="Verified money minus spending"
          tone={t.balanceCents < 0 ? "warn" : undefined}
        />
        <Stat
          label={t.targetCents > 0 ? "Still needed" : "No target set"}
          value={
            t.targetCents > 0 ? formatCents(t.outstandingCents, base) : "—"
          }
          hint={
            t.targetCents > 0 ? `${t.percentOfTarget}% of target raised` : undefined
          }
        />
      </div>

      {/* Only verified money counts. Say so, so nobody plans around
          unconfirmed declarations. */}
      {t.pendingCents > 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          {formatCents(t.pendingCents, base)} has been declared but not yet
          verified. It is deliberately excluded from the collected total until a
          leader confirms it.
        </p>
      )}

      {/* ── Your position ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your contributions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Verified</p>
              <p className="text-lg font-bold">
                {formatCents(fin.myVerifiedCents, base)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Awaiting verification</p>
              <p className="text-lg font-bold">
                {formatCents(fin.myPendingCents, base)}
              </p>
            </div>
          </div>
          <DeclarePaymentForm
            workspaceId={fin.workspaceId}
            baseCurrency={base}
            requests={fin.requests}
          />
        </CardContent>
      </Card>

      {/* ── Where to pay ───────────────────────────────────────────── */}
      {fin.instructions &&
        (fin.instructions.ecocashNumber ||
          fin.instructions.oneMoneyNumber ||
          fin.instructions.bankAccountNumber) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-5 w-5 text-primary" /> Where to send money
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {fin.instructions.ecocashNumber && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">EcoCash</p>
                  <p className="font-mono text-base font-semibold">
                    {fin.instructions.ecocashNumber}
                  </p>
                  {fin.instructions.ecocashName && (
                    <p className="text-xs text-muted-foreground">
                      {fin.instructions.ecocashName}
                    </p>
                  )}
                </div>
              )}
              {fin.instructions.oneMoneyNumber && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">OneMoney</p>
                  <p className="font-mono text-base font-semibold">
                    {fin.instructions.oneMoneyNumber}
                  </p>
                </div>
              )}
              {fin.instructions.bankAccountNumber && (
                <div className="rounded-lg border p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Landmark className="h-3 w-3" /> {fin.instructions.bankName}
                  </p>
                  <p className="font-mono text-base font-semibold">
                    {fin.instructions.bankAccountNumber}
                  </p>
                  {fin.instructions.bankAccountName && (
                    <p className="text-xs text-muted-foreground">
                      {fin.instructions.bankAccountName}
                    </p>
                  )}
                </div>
              )}
              {fin.instructions.notes && (
                <p className="text-xs text-muted-foreground">
                  {fin.instructions.notes}
                </p>
              )}
              <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Send money using your own EcoCash/OneMoney/bank app. No one from
                EngiSync or your project team should ever ask for your PIN, password or
                a one-time code.
              </p>
            </CardContent>
          </Card>
        )}

      {/* ── Contribution requests ──────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" /> Contribution requests
          </CardTitle>
          {fin.canManage && <ContributionRequestForm workspaceId={fin.workspaceId} />}
        </CardHeader>
        <CardContent className="space-y-3">
          {openRequests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No open requests.
            </p>
          ) : (
            openRequests.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{r.title}</p>
                    {r.purpose && (
                      <p className="text-xs text-muted-foreground">{r.purpose}</p>
                    )}
                  </div>
                  {r.iHavePaid && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      You&apos;ve paid
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span>Total: {formatCents(r.targetCents, r.currency)}</span>
                  {r.perMemberCents !== null && (
                    <span>Each: {formatCents(r.perMemberCents, r.currency)}</span>
                  )}
                  {r.dueDate && (
                    <span>
                      Due {new Date(r.dueDate).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                  <span>
                    {r.paidMemberIds.length} of {r.memberCount} members paid
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${
                        r.memberCount
                          ? Math.min(
                              100,
                              Math.round(
                                (r.paidMemberIds.length / r.memberCount) * 100,
                              ),
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Verification queue (leaders / approvers) ───────────────── */}
      {fin.canManage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" /> Verification queue
            </CardTitle>
            {fin.queue.length > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                {fin.queue.length}
              </span>
            )}
          </CardHeader>
          <CardContent>
            <VerificationQueue payments={fin.queue} />
          </CardContent>
        </Card>
      )}

      {/* ── Full payment history — visible to every member ─────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5 text-primary" /> All payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentTimeline payments={fin.payments} />
        </CardContent>
      </Card>

      {/* ── Spending ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5 text-primary" /> Spending
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fin.expenses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing spent yet.
            </p>
          ) : (
            <ul className="divide-y">
              {fin.expenses.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {e.description}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {CATEGORY_LABELS[e.category] ?? e.category}
                      {e.spentByName && ` · ${e.spentByName}`}
                      {" · "}
                      {new Date(e.at).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium">
                    {formatCents(e.amountCents, e.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {fin.canManage && (
            <div className="border-t pt-3">
              <AddExpenseForm workspaceId={fin.workspaceId} members={fin.members} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Leader settings ────────────────────────────────────────── */}
      {fin.canManage && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment details</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentInstructionsForm
                workspaceId={fin.workspaceId}
                instructions={fin.instructions}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Budget target</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetSettingsForm
                workspaceId={fin.workspaceId}
                target={t.targetCents ? t.targetCents / 100 : null}
                currency={base}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
