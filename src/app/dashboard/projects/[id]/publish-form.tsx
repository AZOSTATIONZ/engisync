"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { submitForPublication, type RepoState } from "../../repository/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm";

const KIND_OPTIONS = [
  ["SKIP", "Don't include"],
  ["REPORT", "Final report"],
  ["PRESENTATION", "Presentation"],
  ["SOURCE_CODE", "Source code"],
  ["CAD", "CAD files"],
  ["SIMULATION", "Simulation"],
  ["BOM", "Bill of materials"],
  ["IMAGE", "Images"],
  ["VIDEO", "Video"],
  ["OTHER", "Other"],
] as const;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting…" : "Submit for supervisor approval"}
    </Button>
  );
}

/**
 * The leader's publication form.
 *
 * The gate is a checklist plus a supervisor signature — deliberately not a
 * score threshold. The required items are few and universal (report,
 * abstract, keywords, license); code/CAD/BOM depend on the kind of project
 * and are the supervisor's judgement, not a form's.
 */
export function PublishForm({
  workspaceId,
  projectName,
  files,
}: {
  workspaceId: string;
  projectName: string;
  files: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<RepoState, FormData>(
    async (prev, fd) => {
      const res = await submitForPublication(workspaceId, prev, fd);
      if (res?.error) toast.error(res.error);
      else if (res?.success) {
        toast.success(res.success);
        setOpen(false);
        router.refresh();
      }
      return res;
    },
    null,
  );

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>Publish to repository</Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="pub-title">Title</Label>
        <Input id="pub-title" name="title" defaultValue={projectName} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="pub-abstract">Abstract (min 200 characters)</Label>
        <Textarea
          id="pub-abstract"
          name="abstract"
          rows={5}
          required
          minLength={200}
          placeholder="What problem does this project solve, how, and what were the results?"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="pub-keywords">Keywords (comma-separated, min 3)</Label>
          <Input id="pub-keywords" name="keywords" placeholder="irrigation, IoT, automation" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pub-disciplines">Disciplines</Label>
          <Input id="pub-disciplines" name="disciplines" placeholder="Electronic Engineering" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pub-components">Components / hardware</Label>
          <Input id="pub-components" name="components" placeholder="ESP32, DHT22, relay module" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pub-languages">Languages / tools</Label>
          <Input id="pub-languages" name="languages" placeholder="C++, MATLAB, KiCad" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="pub-license">License</Label>
        <select id="pub-license" name="license" className={`${selectClass} w-full`} defaultValue="All rights reserved">
          <option>All rights reserved</option>
          <option>CC BY 4.0 (reuse with credit)</option>
          <option>CC BY-NC 4.0 (non-commercial reuse with credit)</option>
          <option>MIT (code)</option>
          <option>GPL-3.0 (code)</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Which project files go into the archive?</Label>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files uploaded to this project yet — upload the final report
            under Files first.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <span className="min-w-0 truncate text-sm">{f.name}</span>
                <select name={`file-${f.id}`} className={selectClass} defaultValue="SKIP">
                  {KIND_OPTIONS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          At least one file must be marked as the final report. Files are
          copied into the archive at approval — later changes to the project
          won&apos;t affect the published record.
        </p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitBtn />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
