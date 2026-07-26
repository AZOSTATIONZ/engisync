"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Trash2 } from "lucide-react";
import { requestAccountDeletion, type DeleteState } from "./account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Verifying…" : "Send deletion confirmation"}
    </Button>
  );
}

export function DeleteAccountSection({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<DeleteState, FormData>(
    requestAccountDeletion,
    null,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 text-sm">
          <p className="font-medium">Delete this account permanently</p>
          <p className="text-muted-foreground">
            Removes your profile, personal projects, tasks and files. Work you
            submitted to a group stays in the group&apos;s record but is shown as
            &ldquo;Deleted user&rdquo;. <strong>This cannot be undone.</strong>
          </p>
        </div>
      </div>

      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4" /> Delete my account
        </Button>
      ) : (
        <form action={action} className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="del-password">Confirm your password</Label>
            <PasswordInput id="del-password" name="password" required autoComplete="current-password" />
          </div>

          {twoFactorEnabled && (
            <div className="space-y-2">
              <Label htmlFor="del-totp">Two-factor code</Label>
              <Input
                id="del-totp"
                name="totpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="del-confirm">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input id="del-confirm" name="confirm" placeholder="DELETE" required autoComplete="off" />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-600">{state.success}</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitBtn />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll email you a one-time confirmation link. Your account is only
            deleted after you open it.
          </p>
        </form>
      )}
    </div>
  );
}
