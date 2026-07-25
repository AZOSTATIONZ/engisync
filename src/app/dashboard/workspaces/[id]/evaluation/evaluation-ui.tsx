"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ShieldAlert, MessageCircleQuestion } from "lucide-react";
import {
  generateEvaluation,
  runMentor,
  askSupervisor,
  type MentorState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function GenerateEvaluationButton({
  workspaceId,
  label = "Run AI evaluation",
}: {
  workspaceId: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await generateEvaluation(workspaceId);
        setBusy(false);
        if (res?.error) toast.error(res.error);
        else {
          toast.success(res?.success ?? "Done");
          router.refresh();
        }
      }}
    >
      <Sparkles className="h-4 w-4" />
      {busy ? "Analyzing project…" : label}
    </Button>
  );
}

export function MentorCheck({ workspaceId }: { workspaceId: string }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<MentorState>(null);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await runMentor(workspaceId);
          setBusy(false);
          setState(res);
          if (res?.error) toast.error(res.error);
        }}
      >
        <ShieldAlert className="h-4 w-4" />
        {busy ? "Checking…" : "Run mentor check"}
      </Button>
      {state?.alerts && (
        state.alerts.length === 0 ? (
          <p className="text-sm text-green-600">
            No issues detected — the project looks on track.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {state.alerts.map((a, i) => (
              <li
                key={i}
                className={
                  a.severity === "warn"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }
              >
                • {a.message}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

export function SupervisorAsk({ workspaceId }: { workspaceId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-3">
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        placeholder="e.g. Is my project scope realistic for one semester? What am I missing?"
      />
      <Button
        size="sm"
        disabled={busy || !question.trim()}
        onClick={async () => {
          setBusy(true);
          setAnswer(null);
          const res = await askSupervisor(workspaceId, question);
          setBusy(false);
          if (res?.error) toast.error(res.error);
          else setAnswer(res?.answer ?? "");
        }}
      >
        <MessageCircleQuestion className="h-4 w-4" />
        {busy ? "Thinking…" : "Ask the supervisor"}
      </Button>
      {answer && (
        <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-sm">
          {answer}
        </div>
      )}
    </div>
  );
}
