"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { postSupervisorFeedback, type FeedbackState } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending…" : "Send feedback"}
    </Button>
  );
}

export function FeedbackForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<FeedbackState, FormData>(
    async (prev, fd) => {
      const res = await postSupervisorFeedback(workspaceId, prev, fd);
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
    <form key={key} action={action} className="space-y-2">
      <Textarea name="body" rows={3} placeholder="Feedback for the group…" required />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitBtn />
    </form>
  );
}
