import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import {
  getWorkspaceBudget,
  formatMoney,
  METHOD_LABELS,
  CATEGORY_LABELS,
} from "@/lib/budget";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AddContributionForm,
  AddExpenseForm,
  BudgetSettingsForm,
  DeleteEntryButton,
} from "../budget-ui";

export const metadata: Metadata = { title: "Budget" };

export default async function WorkspaceBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const data = await getWorkspaceBudget(id, userId);
  if (!data) notFound();

  const { workspace, totals, contributions, expenses, perMember, members, isLeader } = data;
  const cur = workspace.currency;
  const pct = workspace.target
    ? Math.min(100, Math.round((totals.contributed / workspace.target) * 100))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/budget"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All budgets
        </Link>
        <h1 className="text-2xl font-bold">{workspace.name} — Budget</h1>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-muted-foreground">Contributed</p>
            <p className="text-2xl font-bold">{formatMoney(totals.contributed, cur)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-muted-foreground">Spent</p>
            <p className="text-2xl font-bold">{formatMoney(totals.spent, cur)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-muted-foreground">Balance</p>
            <p
              className={`text-2xl font-bold ${
                totals.balance < 0 ? "text-destructive" : "text-green-600"
              }`}
            >
              {formatMoney(totals.balance, cur)}
            </p>
          </CardContent>
        </Card>
      </div>

      {pct !== null && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Target progress</span>
              <span>
                {formatMoney(totals.contributed, cur)} / {formatMoney(workspace.target!, cur)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leader settings */}
      {isLeader && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget settings</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetSettingsForm
              workspaceId={workspace.id}
              currency={cur}
              target={workspace.target}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contributions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contributions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddContributionForm
              workspaceId={workspace.id}
              members={members}
              isLeader={isLeader}
              currentUserId={userId}
            />
            <div className="divide-y">
              {contributions.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No contributions yet.
                </p>
              ) : (
                contributions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {formatMoney(c.amount, cur)}{" "}
                        <span className="text-xs text-muted-foreground">
                          · {METHOD_LABELS[c.method]}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.contributorName}
                        {c.reference && ` · ref ${c.reference}`}
                      </p>
                    </div>
                    <DeleteEntryButton id={c.id} kind="contribution" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddExpenseForm workspaceId={workspace.id} members={members} />
            <div className="divide-y">
              {expenses.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No expenses yet.
                </p>
              ) : (
                expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {formatMoney(e.amount, cur)}{" "}
                        <span className="text-xs text-muted-foreground">
                          · {CATEGORY_LABELS[e.category]}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.description}
                        {e.spentByName && ` · ${e.spentByName}`}
                      </p>
                    </div>
                    <DeleteEntryButton id={e.id} kind="expense" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-member breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contributions by member</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {perMember.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span>{m.name}</span>
                <span className="font-medium">{formatMoney(m.total, cur)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
