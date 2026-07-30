import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  FileText,
  Lock,
  Download,
  History,
  CheckCircle2,
  Award,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/identity";
import { getDocumentForMember } from "@/lib/documentation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentSectionCard } from "@/components/documentation-sections";
import { UnfiledEvidence } from "@/components/unfiled-evidence";
import { SubmitReportButton } from "./report-controls";

export const metadata: Metadata = { title: "Project documentation" };

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const doc = await getDocumentForMember(id, session!.user.id);
  if (!doc) notFound();

  // Files uploaded before evidence was section-scoped, plus anything a member
  // has deliberately detached. Surfaced rather than hidden — an unfindable
  // file is the exact problem this module exists to solve.
  const unfiled = await prisma.fileResource.findMany({
    where: { workspaceId: id, documentSectionId: null, supersededBy: { is: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      size: true,
      createdAt: true,
      uploader: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Slide-style header banner */}
      <div className="relative overflow-hidden rounded-2xl banner-brand p-6 shadow-soft sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 right-16 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm/relaxed opacity-90">
            <FileText className="h-4 w-4" /> Project Documentation
          </p>
          <h1 className="mt-1 page-title">{doc.workspaceName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              {doc.progress.approved}/{doc.progress.total} sections approved
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
            {doc.locked && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <Lock className="h-3.5 w-3.5" /> Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitReportButton workspaceId={id} />
        <Button asChild variant="outline" size="sm">
          <a href={`/dashboard/projects/${id}/document/download`}>
            <Download className="h-4 w-4" /> Download
          </a>
        </Button>
        {doc.versionCount > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/projects/${id}/document/history`}>
              <History className="h-4 w-4" /> Version history ({doc.versionCount})
            </Link>
          </Button>
        )}
      </div>

      {doc.locked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <Lock className="h-4 w-4 text-amber-600" />
          The supervisor has locked this document. Editing is disabled.
        </div>
      )}

      {/* Progress + section jump nav */}
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

      <UnfiledEvidence
        workspaceId={id}
        canEdit={doc.canEdit}
        files={unfiled.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          uploaderName: displayName(f.uploader),
          createdAt: f.createdAt.toISOString(),
        }))}
        sections={doc.sections.map((s) => ({ id: s.id, title: s.title }))}
      />

      <div className="space-y-4">
        {doc.sections.map((s, i) => (
          <DocumentSectionCard
            key={s.id}
            workspaceId={id}
            section={s}
            index={i + 1}
            mode="edit"
            canEdit={doc.canEdit}
          />
        ))}
      </div>
    </div>
  );
}
