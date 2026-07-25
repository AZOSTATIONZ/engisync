"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { setAiEnabled, setUserPlan, type AdminState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AiToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const next = !on;
        setOn(next);
        const res = await setAiEnabled(next);
        setBusy(false);
        if (res?.error) {
          toast.error(res.error);
          setOn(!next);
        } else {
          toast.success(res?.success ?? "Updated");
          router.refresh();
        }
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

function SubmitPlan() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Saving…" : "Set plan"}
    </Button>
  );
}

export function SetPlanForm() {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<AdminState, FormData>(
    async (prev, fd) => {
      const res = await setUserPlan(prev, fd);
      if (res?.success) {
        toast.success(res.success);
        setKey((k) => k + 1);
        router.refresh();
      } else if (res?.error) toast.error(res.error);
      return res;
    },
    null,
  );

  return (
    <form key={key} action={action} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="email">User email</Label>
        <Input id="email" name="email" type="email" required placeholder="student@uni.edu" className="w-56" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="plan">Plan</Label>
        <select id="plan" name="plan" className={selectClass} defaultValue="STUDENT_PREMIUM">
          <option value="FREE">Free</option>
          <option value="STUDENT_PREMIUM">Student Premium</option>
          <option value="UNIVERSITY">University</option>
        </select>
      </div>
      <SubmitPlan />
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
