import Link from "next/link";
import type { Metadata } from "next";
import { Archive, Download, Search, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchRepository } from "@/lib/repository";
import { isSupervisor } from "@/lib/supervisor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PendingApprovals } from "./pending-approvals";

export const metadata: Metadata = { title: "Repository" };

/**
 * The department's permanent engineering knowledge base.
 * Future students search here BEFORE starting — so nobody rebuilds last
 * year's project from zero.
 */
export default async function RepositoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { q, year } = await searchParams;

  const supervises = await isSupervisor(userId);

  const [entries, pending, years] = await Promise.all([
    searchRepository({
      query: q,
      year: year ? Number(year) : undefined,
    }),
    supervises
      ? prisma.publishedProject.findMany({
          where: { status: "PENDING_APPROVAL" },
          select: {
            id: true,
            title: true,
            abstract: true,
            authors: true,
            departmentName: true,
            submittedAt: true,
            files: { select: { id: true, kind: true, name: true } },
          },
          orderBy: { submittedAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.publishedProject.findMany({
      where: { status: "PUBLISHED" },
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Engineering Repository</h1>
        <p className="text-muted-foreground">
          Completed, supervisor-approved projects from your department. Search
          here before starting — someone may have solved half your problem
          already.
        </p>
      </div>

      {/* Supervisors see their approval queue first. */}
      {supervises && pending.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Awaiting your approval ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PendingApprovals
              items={pending.map((p) => ({
                id: p.id,
                title: p.title,
                abstract: p.abstract,
                authors: p.authors,
                departmentName: p.departmentName,
                submittedAt: p.submittedAt?.toISOString() ?? null,
                files: p.files,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <form className="flex flex-wrap gap-2" action="/dashboard/repository">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by topic, component, language… e.g. ESP32 irrigation"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          />
        </div>
        <select
          name="year"
          defaultValue={year ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}
            </option>
          ))}
        </select>
        <Button type="submit">Search</Button>
      </form>

      {/* Results */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Archive className="h-9 w-9 text-primary" />
            <p className="font-medium">
              {q ? "Nothing matches that search." : "The repository is empty so far."}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {q
                ? "Try a broader term — a component name, microcontroller, or topic."
                : "When a group completes a project and their supervisor approves it, it's preserved here for future students."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/repository/${e.slug}`}
              className="block rounded-xl border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.slug} · {e.authors.slice(0, 3).join(", ")}
                    {e.authors.length > 3 && ` +${e.authors.length - 3}`} ·{" "}
                    {e.year} · {e.departmentName}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Download className="h-3 w-3" />
                  {e.downloads}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {e.abstract}
              </p>
              {(e.components.length > 0 || e.languages.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...e.components, ...e.languages].slice(0, 8).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
