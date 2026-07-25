import Link from "next/link";
import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { auth } from "@/auth";
import { listWorkspaceBudgets, formatMoney } from "@/lib/budget";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage() {
  const session = await auth();
  const budgets = await listWorkspaceBudgets(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budget</h1>
        <p className="text-muted-foreground">
          Track contributions (EcoCash and more), expenses, and balances per
          workspace.
        </p>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5 text-primary" /> No workspaces yet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Budgets are tracked per workspace. Create or join a workspace to get
            started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const pct = b.target
              ? Math.min(100, Math.round((b.contributed / b.target) * 100))
              : null;
            return (
              <Link key={b.id} href={`/dashboard/budget/${b.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <CardTitle className="text-base">{b.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contributed</span>
                      <span className="font-medium">
                        {formatMoney(b.contributed, b.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spent</span>
                      <span className="font-medium">
                        {formatMoney(b.spent, b.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Balance</span>
                      <span
                        className={
                          b.balance < 0
                            ? "font-semibold text-destructive"
                            : "font-semibold text-green-600"
                        }
                      >
                        {formatMoney(b.balance, b.currency)}
                      </span>
                    </div>
                    {pct !== null && (
                      <div className="pt-1">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pct}% of {formatMoney(b.target!, b.currency)} target
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
