"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  Check,
  Copy,
  Download,
  Link2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  uploadFile,
  deleteFile,
  createShareLink,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export type Option = { id: string; label: string };

export type FileDTO = {
  id: string;
  name: string;
  description: string | null;
  mimeType: string;
  sizeLabel: string;
  uploaderName: string;
  workspaceName: string | null;
  createdAt: string;
  shareCount: number;
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Upload className="h-4 w-4" />
      {pending ? "Uploading…" : "Upload"}
    </Button>
  );
}

export function UploadForm({ workspaces }: { workspaces: Option[] }) {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await uploadFile(prev, fd);
      if (res?.success) {
        setKey((k) => k + 1); // reset the form
        router.refresh();
      }
      return res;
    },
    null,
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form key={key} action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file">File (max 10 MB)</Label>
              <Input id="file" name="file" type="file" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceId">Save to</Label>
              <select id="workspaceId" name="workspaceId" className={selectClass} defaultValue="">
                <option value="">Personal library</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" placeholder="e.g. Arduino wiring diagram" />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
          <UploadButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SharePanel({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await createShareLink(prev, fd);
      if (res?.token) {
        setUrl(`${window.location.origin}/api/share/${res.token}`);
        router.refresh();
      }
      return res;
    },
    null,
  );

  return (
    <div className="mt-3 rounded-md border bg-muted/40 p-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="fileId" value={fileId} />
        <div className="space-y-1">
          <Label htmlFor={`exp-${fileId}`} className="text-xs">Expires in</Label>
          <select id={`exp-${fileId}`} name="expiresInHours" className={`${selectClass} h-9`} defaultValue="24">
            <option value="1">1 hour</option>
            <option value="24">24 hours</option>
            <option value="168">7 days</option>
            <option value="0">Never</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`max-${fileId}`} className="text-xs">Max downloads</Label>
          <Input
            id={`max-${fileId}`}
            name="maxDownloads"
            type="number"
            min="1"
            placeholder="∞"
            className="h-9 w-24"
          />
        </div>
        <Button type="submit" size="sm">
          <Link2 className="h-4 w-4" /> Generate
        </Button>
      </form>
      {state?.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
      {url && (
        <div className="mt-3 flex items-center gap-2">
          <Input readOnly value={url} className="h-9 text-xs" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}

export function FileRow({ file }: { file: FileDTO }) {
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            {file.description && (
              <p className="text-sm text-muted-foreground">{file.description}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{file.sizeLabel}</span>
              <span>{file.mimeType}</span>
              <span>👤 {file.uploaderName}</span>
              {file.workspaceName && <span>📁 {file.workspaceName}</span>}
              {file.shareCount > 0 && <span>🔗 {file.shareCount} link(s)</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/files/${file.id}`}>
                <Download className="h-4 w-4" /> Download
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSharing((s) => !s)}>
              <Link2 className="h-4 w-4" /> Share
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Delete ${file.name}?`)) return;
                setBusy(true);
                await deleteFile(file.id);
                router.refresh();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {sharing && <SharePanel fileId={file.id} />}
      </CardContent>
    </Card>
  );
}
