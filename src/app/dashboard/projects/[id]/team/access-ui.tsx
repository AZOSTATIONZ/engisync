"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Check, Copy, Link2, X } from "lucide-react";
import {
  updateGroupAccess,
  approveJoinRequest,
  rejectJoinRequest,
  createInvite,
  revokeInvite,
  inviteByEmail,
  type ActionState,
} from "@/app/dashboard/projects/access-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function AccessSettingsForm({
  workspaceId,
  maxMembers,
  requireApproval,
}: {
  workspaceId: string;
  maxMembers: number | null;
  requireApproval: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await updateGroupAccess(prev, fd);
      if (res?.success) router.refresh();
      return res;
    },
    null,
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-1">
        <Label htmlFor="maxMembers">Max members</Label>
        <Input
          id="maxMembers"
          name="maxMembers"
          type="number"
          min="1"
          defaultValue={maxMembers ?? ""}
          placeholder="∞"
          className="w-28"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requireApproval"
          defaultChecked={requireApproval}
          className="h-4 w-4"
        />
        Require leader approval to join
      </label>
      <SaveButton label="Save" />
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-green-600">{state.success}</p>}
    </form>
  );
}

export function JoinRequestRow({
  requestId,
  name,
}: {
  requestId: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<ActionState>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res?.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      if (res?.success) toast.success(res.success);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="text-sm font-medium">{name}</span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => run(() => approveJoinRequest(requestId))}
        >
          <Check className="h-4 w-4" /> Approve
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={busy}
          onClick={() => run(() => rejectJoinRequest(requestId))}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function EmailInviteForm({
  workspaceId,
  emailConfigured,
}: {
  workspaceId: string;
  emailConfigured: boolean;
}) {
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await inviteByEmail(prev, fd);
      if (res?.success) setKey((k) => k + 1);
      return res;
    },
    null,
  );

  if (!emailConfigured) {
    return (
      <p className="text-xs text-muted-foreground">
        Email invites are unavailable until an email service is configured on the
        server. Use a copy-link invite above.
      </p>
    );
  }

  return (
    <form key={key} action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-1">
        <Label htmlFor="inv-email">Invite by email</Label>
        <Input id="inv-email" name="email" type="email" placeholder="student@uni.edu" className="h-9 w-56" />
      </div>
      <Button type="submit" size="sm" variant="outline">
        Send invite
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-green-600">{state.success}</p>}
    </form>
  );
}

export function InviteManager({
  workspaceId,
  invites,
  origin,
  emailConfigured = false,
}: {
  workspaceId: string;
  invites: {
    id: string;
    token: string;
    expiresAt: string | null;
    maxUses: number | null;
    uses: number;
  }[];
  origin?: string;
  emailConfigured?: boolean;
}) {
  const router = useRouter();
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [state, action] = useActionState<
    (ActionState & { token?: string }) | null,
    FormData
  >(async (prev, fd) => {
    const res = await createInvite(prev, fd);
    if (res?.token) {
      const base = origin ?? window.location.origin;
      setNewUrl(`${base}/dashboard/projects/invite/${res.token}`);
      router.refresh();
    }
    return res;
  }, null);

  function inviteUrl(token: string) {
    const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/dashboard/projects/invite/${token}`;
  }

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <div className="space-y-1">
          <Label htmlFor="i-exp">Expires in</Label>
          <select id="i-exp" name="expiresInHours" className={selectClass} defaultValue="24">
            <option value="1">1 hour</option>
            <option value="24">24 hours</option>
            <option value="168">7 days</option>
            <option value="0">Never</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="i-uses">Max uses</Label>
          <Input id="i-uses" name="maxUses" type="number" min="1" placeholder="∞" className="h-9 w-24" />
        </div>
        <Button type="submit" size="sm">
          <Link2 className="h-4 w-4" /> Create invite link
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <EmailInviteForm workspaceId={workspaceId} emailConfigured={emailConfigured} />

      {newUrl && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
          <Input readOnly value={newUrl} className="h-9 text-xs" />
          <CopyBtn value={newUrl} />
        </div>
      )}

      {invites.length > 0 && (
        <ul className="divide-y text-sm">
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {inviteUrl(inv.token)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inv.maxUses ? `${inv.uses}/${inv.maxUses} uses` : `${inv.uses} uses`}
                  {inv.expiresAt
                    ? ` · expires ${new Date(inv.expiresAt).toLocaleDateString("en-GB")}`
                    : " · no expiry"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <CopyBtn value={inviteUrl(inv.token)} />
                <RevokeBtn inviteId={inv.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function RevokeBtn({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Revoke this invite link?")) return;
        setBusy(true);
        await revokeInvite(inviteId);
        router.refresh();
      }}
    >
      <X className="h-4 w-4 text-destructive" />
    </Button>
  );
}
