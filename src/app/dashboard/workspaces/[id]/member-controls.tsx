"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Check, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import {
  setMemberTitle,
  promoteToLeader,
  demoteToMember,
  nudgeMember,
  removeMember,
  setMemberCapability,
  type ActionState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Delegated capabilities a leader can grant a member.
 *
 * This is how "assistant leader" is expressed — as specific powers rather
 * than a whole extra role tier. Granting `canApprove` gives someone the
 * ability to approve work without also letting them delete the project or
 * change everyone's roles.
 */
const CAPABILITIES = [
  { key: "canApprove" as const, label: "Approve", hint: "Approve documents and accept join requests" },
  { key: "canManageBudget" as const, label: "Budget", hint: "Record contributions and expenses" },
  { key: "canInvite" as const, label: "Invite", hint: "Invite new members to the group" },
];

export type MemberCapabilities = {
  canApprove: boolean;
  canManageBudget: boolean;
  canInvite: boolean;
};

export function MemberControls({
  workspaceId,
  memberUserId,
  memberName,
  role,
  title,
  isOwner,
  capabilities,
}: {
  workspaceId: string;
  memberUserId: string;
  memberName: string;
  role: "LEADER" | "MEMBER" | "VIEWER";
  title: string | null;
  isOwner: boolean;
  capabilities: MemberCapabilities;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [titleVal, setTitleVal] = useState(title ?? "");
  const [caps, setCaps] = useState<MemberCapabilities>(capabilities);

  async function run(fn: () => Promise<ActionState>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Input
        value={titleVal}
        onChange={(e) => setTitleVal(e.target.value)}
        onBlur={() => {
          if ((title ?? "") !== titleVal) run(() => setMemberTitle(workspaceId, memberUserId, titleVal));
        }}
        placeholder="Role / responsibility"
        className="h-8 w-44 text-xs"
        disabled={busy}
      />
      {role === "MEMBER" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => run(() => promoteToLeader(workspaceId, memberUserId))}
        >
          <ChevronUp className="h-4 w-4" /> Make co-leader
        </Button>
      ) : (
        !isOwner && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => demoteToMember(workspaceId, memberUserId))}
          >
            <ChevronDown className="h-4 w-4" /> Make member
          </Button>
        )
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => {
          const msg = prompt(`Send a reminder to ${memberName}:`, "");
          if (msg === null) return;
          run(() => nudgeMember(workspaceId, memberUserId, msg));
        }}
      >
        <Bell className="h-4 w-4" /> Nudge
      </Button>
      {!isOwner && (
        <Button
          size="icon"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (!confirm(`Remove ${memberName} from this group?`)) return;
            run(() => removeMember(workspaceId, memberUserId));
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}

      {/* Capability grants — only meaningful for non-leaders, since leaders
          already hold every permission. */}
      {role !== "LEADER" && (
        <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground">Can also:</span>
          {CAPABILITIES.map((c) => {
            const on = caps[c.key];
            return (
              <button
                key={c.key}
                type="button"
                title={c.hint}
                disabled={busy}
                aria-pressed={on}
                onClick={() => {
                  const next = !on;
                  setCaps((p) => ({ ...p, [c.key]: next }));
                  run(async () => {
                    const res = await setMemberCapability(
                      workspaceId,
                      memberUserId,
                      c.key,
                      next,
                    );
                    if (res?.error) setCaps((p) => ({ ...p, [c.key]: on }));
                    return res;
                  });
                }}
                className={
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 " +
                  (on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-accent")
                }
              >
                {on && <Check className="h-3 w-3" />}
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
