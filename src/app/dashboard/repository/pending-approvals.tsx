"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { approvePublication, rejectPublication, type RepoState } from "./actions";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  departmentName: string;
  submittedAt: string | null;
  files: { id: string; kind: string; name: string }[];
};

/**
 * The supervisor's queue. Approval here is the signature that moves a project
 * into the permanent archive — which is why rejection demands a reason the
 * group will read.
 */
export function PendingApprovals({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<RepoState>) {
    setBusy(id);
    const res = await fn();
    setBusy(null);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      router.refresh();
    }
  }

  return (
    <ul className="space-y-3">
      {items.map((p) => (
        <li key={p.id} className="rounded-lg border p-3">
          <p className="font-medium">{p.title}</p>
          <p className="text-xs text-muted-foreground">
            {p.authors.join(", ")} · {p.departmentName}
            {p.submittedAt &&
              ` · submitted ${new Date(p.submittedAt).toLocaleDateString()}`}
          </p>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {p.abstract}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Attached: {p.files.map((f) => `${f.name} (${f.kind.toLowerCase().replace("_", " ")})`).join(", ") || "nothing"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy === p.id}
              onClick={() => run(p.id, () => approvePublication(p.id))}
            >
              <Check className="mr-1 h-4 w-4" /> Approve &amp; publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === p.id}
              onClick={() => {
                const reason = prompt(
                  "What must the group fix before this can be published?",
                  "",
                );
                if (!reason) return;
                run(p.id, () => rejectPublication(p.id, reason));
              }}
            >
              <X className="mr-1 h-4 w-4" /> Send back
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
