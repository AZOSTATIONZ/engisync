"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  FileUp,
  Github,
  History,
  Paperclip,
  Share2,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EVIDENCE_SPECS,
  acceptAttribute,
  acceptsAnything,
  expectationLabel,
  kindsForSection,
} from "@/lib/evidence";
import {
  deleteEvidence,
  shareEvidence,
  unfileEvidence,
  uploadEvidence,
} from "@/app/dashboard/projects/[id]/document/evidence-actions";

export type EvidenceItem = {
  id: string;
  name: string;
  kind: string;
  size: number;
  version: number;
  externalUrl: string | null;
  uploaderName: string;
  createdAt: string;
  supersedesCount: number;
};

function formatSize(bytes: number): string {
  if (bytes === 0) return "link";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Evidence attached to one document section.
 *
 * The upload control lives INSIDE the section it belongs to, and its `accept`
 * list is derived from what that section actually expects. That is the whole
 * fix for "I uploaded it and couldn't find it": there is no way to upload
 * without saying what the file is evidence for, because the only upload
 * control in the product is attached to a section.
 */
export function SectionEvidence({
  workspaceId,
  sectionId,
  sectionKey,
  items,
  canEdit,
}: {
  workspaceId: string;
  sectionId: string;
  sectionKey: string;
  items: EvidenceItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [showLink, setShowLink] = useState(false);

  // "Link repo" only appears where source code is genuinely expected — it made
  // no sense on Project Title, which is what the generic fallback used to do.
  const acceptsCode =
    !acceptsAnything(sectionKey) && kindsForSection(sectionKey).includes("SOURCE_CODE");
  const expectation = expectationLabel(sectionKey);

  async function submit(formData: FormData) {
    setBusy(true);
    const res = await uploadEvidence(null, formData);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      formRef.current?.reset();
      setShowLink(false);
    }
    router.refresh();
  }

  async function run(fn: () => Promise<{ error?: string; success?: string } | null>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  }

  async function share(fileId: string) {
    setBusy(true);
    const res = await shareEvidence(workspaceId, fileId);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    if (res?.url) {
      // Clipboard access can be refused (permissions, insecure context), so the
      // link is always shown as well — a copy that silently failed would leave
      // the user with nothing.
      try {
        await navigator.clipboard.writeText(res.url);
        toast.success("Share link copied — valid for 7 days.");
      } catch {
        toast.success(`Share link (7 days): ${res.url}`);
      }
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Evidence
        {items.length > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 text-[0.65rem] font-semibold text-primary">
            {items.length}
          </span>
        )}
      </p>

      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-muted-foreground">
                {EVIDENCE_SPECS[f.kind as keyof typeof EVIDENCE_SPECS]?.label ?? f.kind}
              </span>
              <span className="min-w-0 flex-1 truncate">{f.name}</span>

              {f.version > 1 && (
                <span
                  className="flex items-center gap-1 text-[0.7rem] text-muted-foreground"
                  title={`Version ${f.version} — ${f.supersedesCount} earlier version${f.supersedesCount === 1 ? "" : "s"} kept`}
                >
                  <History className="h-3 w-3" /> v{f.version}
                </span>
              )}
              <span className="text-[0.7rem] text-muted-foreground">
                {formatSize(f.size)}
              </span>

              {f.externalUrl ? (
                <a
                  href={f.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Open repository"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <a
                  href={`/api/files/${f.id}`}
                  className="text-muted-foreground hover:text-foreground"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}

              {canEdit && (
                <>
                  {!f.externalUrl && (
                    <button
                      type="button"
                      disabled={busy}
                      title="Create a 7-day share link"
                      onClick={() => share(f.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    title="Move to unfiled"
                    onClick={() => run(() => unfileEvidence(workspaceId, f.id))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    title="Delete"
                    onClick={() => run(() => deleteEvidence(workspaceId, f.id))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form ref={formRef} action={submit} className="space-y-2">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="sectionId" value={sectionId} />

          {showLink ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                name="externalUrl"
                type="url"
                placeholder="https://github.com/you/your-project"
                className="h-9 min-w-0 flex-1"
              />
              <Button type="submit" size="sm" disabled={busy}>
                Link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowLink(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                name="file"
                accept={acceptAttribute(sectionKey) || undefined}
                className={cn(
                  "min-w-0 flex-1 text-xs text-muted-foreground",
                  "file:mr-2 file:rounded-md file:border file:border-input file:bg-background",
                  "file:px-2 file:py-1 file:text-xs file:font-medium hover:file:bg-accent",
                )}
              />
              <Button type="submit" size="sm" disabled={busy}>
                <FileUp className="h-4 w-4" /> {busy ? "Uploading…" : "Attach"}
              </Button>
              {acceptsCode && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLink(true)}
                >
                  <Github className="h-4 w-4" /> Link repo
                </Button>
              )}
            </div>
          )}

          <p className="text-[0.7rem] text-muted-foreground">
            Expected here: {expectation}.
          </p>
        </form>
      )}

      {!canEdit && items.length === 0 && (
        <p className="text-xs text-muted-foreground">No evidence attached yet.</p>
      )}
    </div>
  );
}
