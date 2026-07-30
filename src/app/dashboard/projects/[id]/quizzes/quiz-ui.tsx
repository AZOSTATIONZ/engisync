"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Plus, Trash2, Trophy } from "lucide-react";
import { createQuiz, submitQuiz, deleteQuiz, type QuizState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

type QB = { text: string; options: string[]; correctIndex: number };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function QuizBuilder({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<QB[]>([
    { text: "", options: ["", "", "", ""], correctIndex: 0 },
  ]);
  const action = createQuiz.bind(null, workspaceId);
  const [state, formAction] = useActionState<QuizState, FormData>(action, null);

  function update(i: number, patch: Partial<QB>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New quiz
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="questions" value={JSON.stringify(questions)} />
          <div className="space-y-2">
            <Label htmlFor="title">Quiz title</Label>
            <Input id="title" name="title" required placeholder="e.g. Circuit theory basics" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" />
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Question {i + 1}</span>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Textarea
                  value={q.text}
                  onChange={(e) => update(i, { text: e.target.value })}
                  placeholder="Question text"
                  rows={2}
                  className="mb-2"
                />
                <div className="space-y-1">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={q.correctIndex === oi}
                        onChange={() => update(i, { correctIndex: oi })}
                      />
                      <Input
                        value={opt}
                        onChange={(e) =>
                          update(i, {
                            options: q.options.map((o, idx) => (idx === oi ? e.target.value : o)),
                          })
                        }
                        placeholder={`Option ${oi + 1}`}
                        className="h-8"
                      />
                    </label>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Select the radio next to the correct answer.
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setQuestions((qs) => [...qs, { text: "", options: ["", "", "", ""], correctIndex: 0 }])
            }
          >
            <Plus className="h-4 w-4" /> Add question
          </Button>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <Submit label="Create quiz" />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function TakeQuiz({
  quizId,
  questions,
}: {
  quizId: string;
  questions: { id: string; text: string; options: string[] }[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (answers.some((a) => a < 0)) {
      toast.error("Answer every question first.");
      return;
    }
    start(async () => {
      const res = await submitQuiz(quizId, answers);
      if (res?.error) toast.error(res.error);
      else if (res && res.score !== undefined) {
        setResult({ score: res.score, total: res.total! });
        toast.success(`You scored ${res.score}/${res.total}`);
        router.refresh();
      }
    });
  }

  if (result) {
    return (
      <div className="rounded-md border bg-muted/40 p-6 text-center">
        <Trophy className="mx-auto mb-2 h-8 w-8 text-primary" />
        <p className="text-2xl font-bold">
          {result.score} / {result.total}
        </p>
        <p className="text-sm text-muted-foreground">Nice work! Your score is saved.</p>
        <Button className="mt-4" variant="outline" onClick={() => { setResult(null); setAnswers(Array(questions.length).fill(-1)); }}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="py-4">
            <p className="mb-2 font-medium">
              {i + 1}. {q.text}
            </p>
            <div className="space-y-1">
              {q.options.map((opt, oi) => (
                <label key={oi} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`q-${i}`}
                    checked={answers[i] === oi}
                    onChange={() =>
                      setAnswers((a) => a.map((v, idx) => (idx === i ? oi : v)))
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={submit} disabled={pending}>
        {pending ? "Submitting…" : "Submit answers"}
      </Button>
    </div>
  );
}

export function DeleteQuizButton({ quizId }: { quizId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this quiz?")) return;
        setBusy(true);
        const res = await deleteQuiz(quizId);
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
