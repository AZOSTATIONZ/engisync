"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import {
  createThread,
  postMessage,
  deleteThread,
  type DiscussionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Posting…" : label}
    </Button>
  );
}

export function NewThreadForm({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const action = createThread.bind(null, workspaceId);
  const [state, formAction] = useActionState<DiscussionState, FormData>(action, null);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <MessageSquarePlus className="h-4 w-4" /> New topic
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="title">Topic</Label>
            <Input id="title" name="title" required placeholder="e.g. How should we wire the sensors?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">First message</Label>
            <Textarea id="body" name="body" required rows={3} />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <Submit label="Start discussion" />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const action = postMessage.bind(null, threadId);
  const [state, formAction] = useActionState<DiscussionState, FormData>(
    async (prev, fd) => {
      const res = await action(prev, fd);
      if (res?.success) {
        setKey((k) => k + 1);
        router.refresh();
      }
      return res;
    },
    null,
  );

  return (
    <form key={key} action={formAction} className="space-y-2">
      <Textarea name="body" required rows={2} placeholder="Write a reply…" />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Submit label="Reply" />
    </form>
  );
}

export function DeleteThreadButton({ threadId }: { threadId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this whole discussion?")) return;
        setBusy(true);
        const res = await deleteThread(threadId);
        if (res?.error) {
          toast.error(res.error);
          setBusy(false);
        }
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" /> Delete
    </Button>
  );
}
