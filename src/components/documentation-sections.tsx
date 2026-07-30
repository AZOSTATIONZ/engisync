"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Lock,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  saveSection,
  submitSection,
  addSectionComment,
  reviewSection,
} from "@/app/dashboard/projects/[id]/document/actions";

type SectionStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED";

export type SectionData = {
  id: string;
  key: string;
  title: string;
  hint: string;
  content: string;
  status: SectionStatus;
  locked: boolean;
  comments: {
    id: string;
    authorName: string;
    body: string;
    isCorrection: boolean;
    createdAt: string;
  }[];
};

const STATUS: Record<
  SectionStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileText },
  SUBMITTED: { label: "Submitted", className: "bg-blue-500/15 text-blue-600", icon: Clock },
  APPROVED: { label: "Approved", className: "bg-green-500/15 text-green-600", icon: CheckCircle2 },
  CHANGES_REQUESTED: {
    label: "Changes requested",
    className: "bg-amber-500/15 text-amber-700",
    icon: AlertTriangle,
  },
};

function StatusBadge({ status }: { status: SectionStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className)}>
      <s.icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  );
}

export function DocumentSectionCard({
  workspaceId,
  section,
  index,
  mode,
  canEdit,
}: {
  workspaceId: string;
  section: SectionData;
  index?: number;
  mode: "edit" | "review";
  canEdit: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState(section.content);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");

  const dirty = content !== section.content;

  async function run(fn: () => Promise<{ error?: string; success?: string } | null>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  }

  const editable = mode === "edit" && canEdit && !section.locked;

  return (
    <Card id={section.key} className="scroll-mt-24">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            {index != null && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index}
              </span>
            )}
            {section.title}
            {section.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </h3>
          <StatusBadge status={section.status} />
        </div>
        <p className="text-xs text-muted-foreground">{section.hint}</p>

        {editable ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Write this section…"
          />
        ) : (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {section.content ? (
              <p className="whitespace-pre-wrap">{section.content}</p>
            ) : (
              <p className="text-muted-foreground">Not written yet.</p>
            )}
          </div>
        )}

        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy || !dirty}
              onClick={() => run(() => saveSection(workspaceId, section.id, content))}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || dirty}
              onClick={() => run(() => submitSection(workspaceId, section.id))}
            >
              Submit for review
            </Button>
            {dirty && (
              <span className="self-center text-xs text-muted-foreground">
                Save before submitting.
              </span>
            )}
          </div>
        )}

        {/* Supervisor review controls */}
        {mode === "review" && (
          <div className="space-y-2 rounded-md border border-primary/20 bg-primary/[0.03] p-3">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note to the team…"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await reviewSection(section.id, "APPROVED", note);
                    if (!r?.error) setNote("");
                    return r;
                  })
                }
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await reviewSection(section.id, "CHANGES_REQUESTED", note);
                    if (!r?.error) setNote("");
                    return r;
                  })
                }
              >
                <AlertTriangle className="h-4 w-4" /> Request corrections
              </Button>
            </div>
          </div>
        )}

        {/* Comment thread */}
        {section.comments.length > 0 && (
          <ul className="space-y-2 border-t pt-3">
            {section.comments.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "rounded-md border p-2 text-sm",
                  c.isCorrection && "border-amber-500/40 bg-amber-500/5",
                )}
              >
                <p className="whitespace-pre-wrap">{c.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.authorName} · {new Date(c.createdAt).toLocaleDateString("en-GB")}
                  {c.isCorrection && " · correction"}
                </p>
              </li>
            ))}
          </ul>
        )}

        {/* Add comment */}
        <div className="flex items-start gap-2 pt-1">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={1}
            placeholder="Add a comment…"
            className="min-h-0"
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !comment.trim()}
            onClick={() =>
              run(async () => {
                const r = await addSectionComment(section.id, comment);
                if (!r?.error) setComment("");
                return r;
              })
            }
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
