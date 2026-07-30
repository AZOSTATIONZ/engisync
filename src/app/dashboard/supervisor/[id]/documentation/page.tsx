import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Download,
  History,
  CheckCircle2,
  Award,
} from "lucide-react";
import { auth } from "@/auth";
import { getDocumentForSupervisor } from "@/lib/documentation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentSectionCard } from "@/components/documentation-sections";
import { DocumentLockToggle } from "./lock-toggle";
import { ApprovalButtons } from "@/app/dashboard/projects/[id]/document/report-controls";

export const metadata: Metadata = { title: "Review documentation" };

export default async function SuperviseDocumentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const doc = await getDocumentForSupervisor(id, session!.user.id);
  if (!doc) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/supervisor/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>

      {/* Slide-style header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-indigo-800 to-violet-800 p-6 text-white shadow-soft sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm/relaxed opacity-90">
              <FileText className="h-4 w-4" /> Supervisor Review
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{doc.workspaceName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                {doc.progress.approved}/{doc.progress.total} approved
              </span>
              {doc.approved && (
                <span className="flex items-center gap-1 rounded-full bg-green-400/25 px-3 py-1 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Report approved
                </span>
              )}
              {doc.completionApproved && (
                <span className="flex items-center gap-1 rounded-full bg-amber-300/25 px-3 py-1 text-xs font-medium">
                  <Award className="h-3.5 w-3.5" /> Completion signed off
                </span>
              )}
            </div>
          </div>
          <DocumentLockToggle workspaceId={id} locked={doc.locked} />
        </div>
      </div>

      {/* Approvals + tools */}
      <div className="flex flex-wrap items-center gap-2">
        <ApprovalButtons
          workspaceId={id}
          approved={doc.approved}
          completionApproved={doc.completionApproved}
        />
        <Button asChild variant="outline" size="sm">
          <a href={`/dashboard/projects/${id}/document/download`}>
            <Download className="h-4 w-4" /> Download
          </a>
        </Button>
        {doc.versionCount > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/supervisor/${id}/documentation/history`}>
              <History className="h-4 w-4" /> Version history ({doc.versionCount})
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${doc.progress.pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {doc.sections.map((s, i) => (
              <a
                key={s.key}
                href={`#${s.key}`}
                className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {i + 1}. {s.title}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {doc.sections.map((s, i) => (
          <DocumentSectionCard
            key={s.id}
            workspaceId={id}
            section={s}
            index={i + 1}
            mode="review"
            canEdit={false}
          />
        ))}
      </div>
    </div>
  );
}
