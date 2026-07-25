"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import {
  setMemberTitle,
  promoteToLeader,
  demoteToMember,
  nudgeMember,
  removeMember,
  type ActionState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MemberControls({
  workspaceId,
  memberUserId,
  memberName,
  role,
  title,
  isOwner,
}: {
  workspaceId: string;
  memberUserId: string;
  memberName: string;
  role: "LEADER" | "MEMBER";
  title: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [titleVal, setTitleVal] = useState(title ?? "");

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
    </div>
  );
}
