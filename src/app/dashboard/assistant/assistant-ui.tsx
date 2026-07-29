"use client";

import { Markdown } from "@/components/markdown";
import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { FileText, ListChecks, ShieldAlert, Sparkles } from "lucide-react";
import {
  summarizeContent,
  detectRisks,
  askAssistant,
  generateTasks,
  type AIState,
  type TaskGenState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export type Option = { id: string; label: string };

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TOOLS = [
  { id: "summarize", label: "Summarize", icon: FileText },
  { id: "tasks", label: "Generate tasks", icon: ListChecks },
  { id: "risks", label: "Detect risks", icon: ShieldAlert },
  { id: "ask", label: "Ask", icon: Sparkles },
] as const;

function RunButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Thinking…" : label}
    </Button>
  );
}

function ResultBox({ text }: { text: string }) {
  return (
    // Models reply in Markdown. Rendering it as pre-formatted text showed
    // students raw "### Heading" and "**bold**" syntax, which reads as broken.
    <div className="mt-4 rounded-lg border bg-muted/40 p-4">
      <Markdown content={text} />
    </div>
  );
}

function TextTool({
  action,
  field,
  placeholder,
  label,
  buttonLabel,
}: {
  action: (prev: AIState, fd: FormData) => Promise<AIState>;
  field: string;
  placeholder: string;
  label: string;
  buttonLabel: string;
}) {
  const [state, formAction] = useActionState<AIState, FormData>(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <Textarea id={field} name={field} rows={7} placeholder={placeholder} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <RunButton label={buttonLabel} />
      {state?.result && <ResultBox text={state.result} />}
    </form>
  );
}

function GenerateTasksTool({ workspaces }: { workspaces: Option[] }) {
  const [state, action] = useActionState<TaskGenState, FormData>(
    generateTasks,
    null,
  );
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="notes">Notes or brief</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={7}
          placeholder="Paste meeting notes, an assignment brief, or a project description. The assistant will turn it into tasks."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws">Add tasks to</Label>
        <select id="ws" name="workspaceId" className={selectClass} defaultValue="">
          <option value="">Personal tasks</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.label}</option>
          ))}
        </select>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <RunButton label="Generate & add tasks" />
      {state?.created && (
        <div className="mt-4 rounded-md border bg-muted/40 p-4 text-sm">
          <p className="mb-2 font-medium">
            Created {state.created.length} task
            {state.created.length === 1 ? "" : "s"}:
          </p>
          <ul className="list-inside list-disc space-y-1">
            {state.created.map((t, i) => (
              <li key={i}>
                {t.title}{" "}
                <span className="text-xs text-muted-foreground">({t.priority})</span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/tasks"
            className="mt-3 inline-block text-primary hover:underline"
          >
            View in Tasks →
          </Link>
        </div>
      )}
    </form>
  );
}

export function Assistant({ workspaces }: { workspaces: Option[] }) {
  const [tool, setTool] = useState<(typeof TOOLS)[number]["id"]>("summarize");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              tool === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {tool === "summarize" && (
            <TextTool
              action={summarizeContent}
              field="content"
              label="Content to summarize"
              placeholder="Paste meeting notes, a document, or a discussion…"
              buttonLabel="Summarize"
            />
          )}
          {tool === "tasks" && <GenerateTasksTool workspaces={workspaces} />}
          {tool === "risks" && (
            <TextTool
              action={detectRisks}
              field="content"
              label="Project description or status"
              placeholder="Describe your project, timeline, and current status…"
              buttonLabel="Detect risks"
            />
          )}
          {tool === "ask" && (
            <TextTool
              action={askAssistant}
              field="question"
              label="Your question"
              placeholder="e.g. How do I debounce a button on an ESP32?"
              buttonLabel="Ask"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
