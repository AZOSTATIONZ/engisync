"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FolderInput, Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { fileEvidence } from "@/app/dashboard/projects/[id]/document/evidence-actions";

export type UnfiledFile = {
  id: string;
  name: string;
  size: number;
  uploaderName: string;
  createdAt: string;
};

/**
 * Files that belong to this project but not yet to any section.
 *
 * This tray is what makes the move to section-scoped evidence safe for
 * projects that already have files: every historical upload lands here rather
 * than vanishing, and can be put in its proper place in one click without
 * re-uploading. Once it is empty it disappears entirely.
 */
export function UnfiledEvidence({
  workspaceId,
  files,
  sections,
  canEdit,
}: {
  workspaceId: string;
  files: UnfiledFile[];
  sections: { id: string; title: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (files.length === 0) return null;

  async function file(fileId: string, sectionId: string) {
    if (!sectionId) return;
    setBusy(fileId);
    const res = await fileEvidence(workspaceId, fileId, sectionId);
    setBusy(null);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  }

  return (
    <Card className="border-amber-500/40">
      <CardContent className="space-y-3 py-4">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Inbox className="h-4 w-4 text-amber-600" />
            Unfiled evidence
            <span className="rounded-full bg-amber-500/15 px-2 text-xs font-semibold text-amber-700">
              {files.length}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            These files belong to the project but not to any section yet, so
            they don&apos;t count towards your documentation. Put each one where
            it belongs.
          </p>
        </div>

        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">
                {f.uploaderName}
              </span>
              <a
                href={`/api/files/${f.id}`}
                className="text-muted-foreground hover:text-foreground"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              {canEdit && (
                <span className="flex items-center gap-1">
                  <FolderInput className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <select
                    disabled={busy === f.id}
                    defaultValue=""
                    onChange={(e) => file(f.id, e.target.value)}
                    aria-label={`File ${f.name} into a section`}
                    className="h-8 max-w-[12rem] rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="" disabled>
                      {busy === f.id ? "Filing…" : "File into…"}
                    </option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
