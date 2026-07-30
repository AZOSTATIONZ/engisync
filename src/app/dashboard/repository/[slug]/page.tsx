import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Quote,
  User as UserIcon,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCitation, relatedProjects } from "@/lib/repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/app/dashboard/projects/[id]/team/workspace-controls";

export const metadata: Metadata = { title: "Published project" };

const KIND_LABEL: Record<string, string> = {
  REPORT: "Final report",
  PRESENTATION: "Presentation",
  SOURCE_CODE: "Source code",
  CAD: "CAD files",
  SIMULATION: "Simulation",
  BOM: "Bill of materials",
  IMAGE: "Images",
  VIDEO: "Video",
  OTHER: "Other",
};

export default async function PublishedProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { slug } = await params;
  const p = await prisma.publishedProject.findUnique({
    where: { slug },
    include: { files: { select: { id: true, kind: true, name: true, size: true } } },
  });
  if (!p || p.status !== "PUBLISHED") notFound();

  const related = await relatedProjects(p.id);
  const citation = formatCitation(p);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/repository"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Repository
        </Link>
        <p className="font-mono text-xs text-primary">{p.slug}</p>
        <h1 className="page-title">{p.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserIcon className="h-3.5 w-3.5" />
            {p.authors.join(", ")}
          </span>
          <span>{p.year}</span>
          <span>{p.departmentName}</span>
          {p.supervisorName && <span>Supervised by {p.supervisorName}</span>}
          <span className="inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {p.downloads} downloads
          </span>
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Abstract</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.abstract}</p>
          {(p.keywords.length > 0 ||
            p.components.length > 0 ||
            p.languages.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[...p.keywords, ...p.components, ...p.languages].map((t) => (
                <Link
                  key={t}
                  href={`/dashboard/repository?q=${encodeURIComponent(t)}`}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/20"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" /> Project files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {p.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{f.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {KIND_LABEL[f.kind] ?? f.kind} ·{" "}
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                </span>
                <a
                  href={`/api/published/${f.id}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent"
                >
                  <Download className="h-4 w-4" /> Download
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            License: {p.license}
          </p>
        </CardContent>
      </Card>

      {/* Citation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Quote className="h-5 w-5 text-primary" /> Cite this project
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 rounded-lg bg-muted/50 p-3 font-mono text-xs">
            {citation}
          </p>
          <CopyButton value={citation} />
        </CardContent>
      </Card>

      {/* Related */}
      {related.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Related projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/repository/${r.slug}`}
                className="block rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <span className="block truncate text-sm font-medium">{r.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {r.slug} · {r.year}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
