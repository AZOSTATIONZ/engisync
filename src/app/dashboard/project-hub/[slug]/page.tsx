import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock,
  ListChecks,
  MonitorPlay,
  ShieldAlert,
  Target,
  Wallet,
} from "lucide-react";
import {
  DISCIPLINE_LABEL,
  SOURCES,
  TIER_META,
  bomTotalUsd,
  formatBudget,
  formatWeeks,
  relatedProjects,
} from "@/lib/project-hub";
import { HUB_PROJECTS } from "@/lib/project-hub-catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StartFromHub } from "./start-from-hub";

export async function generateStaticParams() {
  return HUB_PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = HUB_PROJECTS.find((x) => x.slug === slug);
  return { title: p ? p.title : "Project Hub" };
}

/**
 * A single project brief.
 *
 * Ordered the way a student decides: can I afford it and do I have time
 * (top), do I know enough (prerequisites), what will it cost me in parts
 * (BOM), what will I get out of it (outcomes), and what is going to go wrong
 * (challenges). "What's hard about this" is given its own prominent block
 * rather than buried, because it is the section that prevents someone from
 * abandoning a project in week five.
 */
export default async function HubProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = HUB_PROJECTS.find((x) => x.slug === slug);
  if (!p) notFound();

  const bomTotal = bomTotalUsd(p.bom);
  const related = relatedProjects(HUB_PROJECTS, p, 3);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/project-hub"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>
        <p className="text-xs font-medium text-primary">
          {DISCIPLINE_LABEL[p.discipline]} · {TIER_META[p.tier].label} ·{" "}
          {TIER_META[p.tier].typicalYear}
        </p>
        <h1 className="page-title">{p.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{p.summary}</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Wallet, label: "Estimated cost", value: formatBudget(p.budgetUsd) },
          { icon: Clock, label: "Time", value: formatWeeks(p.weeks) },
          {
            icon: MonitorPlay,
            label: "Hardware",
            value: p.simulationOnly ? "Optional" : "Required",
          },
          { icon: ListChecks, label: "Parts listed", value: `${p.bom.length}` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </p>
              <p className="text-lg font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <StartFromHub slug={p.slug} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {p.bom.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bill of materials</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Tables are the one thing that genuinely needs to scroll on
                    a phone; squeezing four columns into 360px is unreadable. */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Item</th>
                        <th className="py-2 px-2 text-right font-medium">Qty</th>
                        <th className="py-2 px-2 text-right font-medium">Unit</th>
                        <th className="py-2 pl-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.bom.map((line) => (
                        <tr key={line.item} className="border-b border-border/50">
                          <td className="py-2 pr-2">
                            {line.item}
                            {line.note && (
                              <span className="block text-xs text-muted-foreground">
                                {line.note}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {line.qty}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            ${line.unitUsd}
                          </td>
                          <td className="py-2 pl-2 text-right tabular-nums">
                            ${line.qty * line.unitUsd}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td className="py-2 pr-2" colSpan={3}>
                          Total
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums">
                          ${bomTotal}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Estimates in US dollars for parts bought online or in Harare.
                  Prices move — treat this as a planning figure, and check
                  before you order.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                What you&apos;ll be able to do afterwards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="ml-5 list-disc space-y-1.5 text-sm">
                {p.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {p.challenges.length > 0 && (
            <Card className="border-amber-500/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  Where this actually gets hard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="ml-5 list-disc space-y-1.5 text-sm">
                  {p.challenges.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Before you start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  You should already know
                </p>
                {p.prerequisites.length === 0 ? (
                  <p className="text-muted-foreground">
                    Nothing — this one is a starting point.
                  </p>
                ) : (
                  <ul className="ml-5 list-disc space-y-1">
                    {p.prerequisites.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Software</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.software.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Where to learn it</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {p.sources.map((id) => {
                  const s = SOURCES[id];
                  return (
                    <li key={id}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex items-start gap-1.5"
                      >
                        <span className="min-w-0">
                          <span className="font-medium group-hover:underline">
                            {s.name}
                          </span>
                          <span className="block text-xs capitalize text-muted-foreground">
                            {s.kind}
                          </span>
                        </span>
                        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {related.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Try next</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/dashboard/project-hub/${r.slug}`}
                        className="hover:underline"
                      >
                        {r.title}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {DISCIPLINE_LABEL[r.discipline]} ·{" "}
                        {TIER_META[r.tier].label}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {p.tags.map((t) => (
          <Link
            key={t}
            href={`/dashboard/project-hub?q=${encodeURIComponent(t)}`}
            className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent"
          >
            {t}
          </Link>
        ))}
      </div>
    </div>
  );
}
