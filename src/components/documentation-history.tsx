import Link from "next/link";
import { ArrowLeft, History, GitCompare } from "lucide-react";
import {
  listReportVersions,
  compareReportVersions,
} from "@/lib/documentation";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Shared version-history + revision-compare view, used by both the member and
 * supervisor documentation history pages. Compare is driven by ?from & ?to.
 */
export async function DocumentationHistory({
  workspaceId,
  userId,
  backHref,
  baseHref,
  from,
  to,
}: {
  workspaceId: string;
  userId: string;
  backHref: string;
  baseHref: string; // the history route, for building compare links
  from?: string;
  to?: string;
}) {
  const versions = await listReportVersions(workspaceId, userId);

  const fromN = from ? parseInt(from, 10) : NaN;
  const toParsed = to === "current" ? "current" : to ? parseInt(to, 10) : NaN;
  const doCompare =
    !Number.isNaN(fromN) && (toParsed === "current" || !Number.isNaN(toParsed));
  const comparison = doCompare
    ? await compareReportVersions(
        workspaceId,
        userId,
        fromN,
        toParsed as number | "current",
      )
    : null;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to documentation
      </Link>

      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <History className="h-6 w-6 text-primary" /> Report Version History
      </h1>

      {versions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No report versions submitted yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-3">
            <ul className="divide-y">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">Version {v.versionNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.submittedByName} · {new Date(v.createdAt).toLocaleString("en-GB")}
                      {v.note ? ` · ${v.note}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`${baseHref}?from=${v.versionNumber}&to=current`}
                    className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
                  >
                    <GitCompare className="h-3.5 w-3.5" /> Compare with current
                  </Link>
                </li>
              ))}
            </ul>
            {versions.length > 1 && (
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Tip: compare any two versions with{" "}
                <code>?from=1&amp;to=2</code> in the address bar.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {comparison && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitCompare className="h-4 w-4 text-primary" />
              Comparing {comparison.fromLabel} → {comparison.toLabel}
              <span className="text-muted-foreground">
                ({comparison.changedCount} section{comparison.changedCount === 1 ? "" : "s"} changed)
              </span>
            </div>
            <div className="space-y-3">
              {comparison.sections
                .filter((s) => s.changed)
                .map((s) => (
                  <div key={s.key} className="rounded-md border">
                    <p className="border-b bg-muted/40 px-3 py-1.5 text-sm font-semibold">
                      {s.title}
                    </p>
                    <div className="grid gap-0 sm:grid-cols-2">
                      <div className="border-b p-3 text-sm sm:border-b-0 sm:border-r">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          {comparison.fromLabel}
                        </p>
                        <p className="whitespace-pre-wrap text-muted-foreground">
                          {s.before || "— empty —"}
                        </p>
                      </div>
                      <div className="p-3 text-sm">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          {comparison.toLabel}
                        </p>
                        <p className="whitespace-pre-wrap">{s.after || "— empty —"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              {comparison.changedCount === 0 && (
                <p className="text-sm text-muted-foreground">
                  No differences between these versions.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
