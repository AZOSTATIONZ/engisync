"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import {
  addContribution,
  addExpense,
  deleteContribution,
  deleteExpense,
  updateBudgetSettings,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Member = { id: string; name: string };

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function AddContributionForm({
  workspaceId,
  members,
  isLeader,
  currentUserId,
}: {
  workspaceId: string;
  members: Member[];
  isLeader: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await addContribution(prev, fd);
      if (res?.success) {
        setKey((k) => k + 1);
        router.refresh();
      }
      return res;
    },
    null,
  );

  return (
    <form key={key} action={action} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="c-amount">Amount</Label>
          <Input id="c-amount" name="amount" type="number" step="0.01" min="0" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-method">Method</Label>
          <select id="c-method" name="method" className={selectClass} defaultValue="ECOCASH">
            <option value="ECOCASH">EcoCash</option>
            <option value="ONEMONEY">OneMoney</option>
            <option value="INNBUCKS">InnBucks</option>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-reference">Reference (e.g. EcoCash txn)</Label>
          <Input id="c-reference" name="reference" placeholder="MP2507…" />
        </div>
        {isLeader ? (
          <div className="space-y-1">
            <Label htmlFor="c-user">Contributor</Label>
            <select id="c-user" name="userId" className={selectClass} defaultValue={currentUserId}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="userId" value={currentUserId} />
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-note">Note (optional)</Label>
        <Input id="c-note" name="note" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Submit label="Add contribution" />
    </form>
  );
}

export function AddExpenseForm({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await addExpense(prev, fd);
      if (res?.success) {
        setKey((k) => k + 1);
        router.refresh();
      }
      return res;
    },
    null,
  );

  return (
    <form key={key} action={action} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="e-amount">Amount</Label>
          <Input id="e-amount" name="amount" type="number" step="0.01" min="0" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="e-category">Category</Label>
          <select id="e-category" name="category" className={selectClass} defaultValue="COMPONENTS">
            <option value="COMPONENTS">Components</option>
            <option value="TOOLS">Tools</option>
            <option value="PRINTING">Printing</option>
            <option value="TRANSPORT">Transport</option>
            <option value="SOFTWARE">Software</option>
            <option value="SERVICES">Services</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="e-spent">Spent by (optional)</Label>
          <select id="e-spent" name="spentById" className={selectClass} defaultValue="">
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="e-reference">Reference (optional)</Label>
          <Input id="e-reference" name="reference" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="e-description">Description</Label>
        <Input id="e-description" name="description" required placeholder="e.g. ESP32 dev board ×2" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Submit label="Add expense" />
    </form>
  );
}

export function BudgetSettingsForm({
  workspaceId,
  currency,
  target,
}: {
  workspaceId: string;
  currency: string;
  target: number | null;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await updateBudgetSettings(prev, fd);
      if (res?.success) router.refresh();
      return res;
    },
    null,
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-1">
        <Label htmlFor="b-target">Budget target</Label>
        <Input
          id="b-target"
          name="budgetTarget"
          type="number"
          step="0.01"
          min="0"
          defaultValue={target ?? ""}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="b-currency">Currency</Label>
        <Input id="b-currency" name="currency" defaultValue={currency} className="w-24" maxLength={8} />
      </div>
      <Submit label="Save" />
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-green-600">{state.success}</p>}
    </form>
  );
}

export function DeleteEntryButton({
  id,
  kind,
}: {
  id: string;
  kind: "contribution" | "expense";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this entry?")) return;
        setBusy(true);
        if (kind === "contribution") await deleteContribution(id);
        else await deleteExpense(id);
        router.refresh();
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
