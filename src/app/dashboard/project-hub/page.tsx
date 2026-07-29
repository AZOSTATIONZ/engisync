import Link from "next/link";
import type { Metadata } from "next";
import { Clock, Search, Wallet, MonitorPlay } from "lucide-react";
import {
  DISCIPLINE_LABEL,
  TIER_META,
  TIER_ORDER,
  formatBudget,
  formatWeeks,
  groupByTier,
  searchProjects,
  type Discipline,
  type Tier,
} from "@/lib/project-hub";
import { HUB_PROJECTS } from "@/lib/project-hub-catalog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Project Hub" };

const DISCIPLINES = Object.keys(DISCIPLINE_LABEL) as Discipline[];

/**
 * Project Hub — "what can I actually build this semester?"
 *
 * Sorted into tiers rather than a flat list, because the question a student
 * has is not "what exists" but "what is at my level right now". A flat
 * alphabetical list of 38 projects would put a final-year MPPT controller
 * directly above a first-year data logger.
 *
 * Filters live in the URL as a plain GET form. No client-side state, so a
 * filtered view can be shared with a classmate or a supervisor by pasting the
 * link — which is how students actually pick projects together.
 */
export default async function ProjectHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    discipline?: string;
    tier?: string;
    budget?: string;
    sim?: string;
  }>;
}) {
  const sp = await searchParams;

  const maxBudget = sp.budget ? Number(sp.budget) : undefined;
  const results = searchProjects(HUB_PROJECTS, {
    q: sp.q,
    discipline: (sp.discipline as Discipline) || "ALL",
    tier: (sp.tier as Tier) || "ALL",
    maxBudget: Number.isFinite(maxBudget) ? maxBudget : undefined,
    simulationOnly: sp.sim === "1",
  });

  const groups = groupByTier(results);
  const filtered =
    Boolean(sp.q) ||
    (sp.discipline && sp.discipline !== "ALL") ||
    (sp.tier && sp.tier !== "ALL") ||
    Boolean(sp.budget) ||
    sp.sim === "1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project Hub</h1>
        <p className="max-w-2xl text-muted-foreground">
          Engineering projects you can actually build, with realistic parts
          lists and budgets in US dollars. Every project says what you need to
          know beforehand and where the difficulty really is.
        </p>
      </div>

      <form
        action="/dashboard/project-hub"
        className="space-y-3 rounded-xl border p-4"
      >
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search — a part you own, a topic, a tool… e.g. ESP32, concrete, solar"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <Button type="submit">Search</Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            name="discipline"
            defaultValue={sp.discipline ?? "ALL"}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Discipline"
          >
            <option value="ALL">All disciplines</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {DISCIPLINE_LABEL[d]}
              </option>
            ))}
          </select>

          <select
            name="tier"
            defaultValue={sp.tier ?? "ALL"}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Level"
          >
            <option value="ALL">Any level</option>
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIER_META[t].label} · {TIER_META[t].typicalYear}
              </option>
            ))}
          </select>

          <select
            name="budget"
            defaultValue={sp.budget ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Budget"
          >
            <option value="">Any budget</option>
            <option value="0">Free — no parts</option>
            <option value="25">Under $25</option>
            <option value="50">Under $50</option>
            <option value="100">Under $100</option>
          </select>

          <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
            <input
              type="checkbox"
              name="sim"
              value="1"
              defaultChecked={sp.sim === "1"}
              className="h-4 w-4"
            />
            {/* Components are not always obtainable. A simulated build is a
                real build — this filter exists so that is never a dead end. */}
            Buildable without parts
          </label>

          {filtered && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/project-hub">Clear</Link>
            </Button>
          )}
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        {results.length} of {HUB_PROJECTS.length} projects
      </p>

      {results.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          description="Try a broader term, raise the budget, or clear the level filter. Searching a component you already own often works well — try 'Arduino' or 'copper'."
          actionLabel="Clear filters"
          actionHref="/dashboard/project-hub"
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.tier} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {TIER_META[g.tier].label}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    · {TIER_META[g.tier].typicalYear}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {TIER_META[g.tier].blurb}
                </p>
              </div>

              <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.projects.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/dashboard/project-hub/${p.slug}`}
                    className="card-hover flex h-full flex-col rounded-xl border p-4"
                  >
                    <p className="text-xs font-medium text-primary">
                      {DISCIPLINE_LABEL[p.discipline]}
                    </p>
                    <p className="mt-0.5 font-semibold">{p.title}</p>
                    <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">
                      {p.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" />
                        {formatBudget(p.budgetUsd)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatWeeks(p.weeks)}
                      </span>
                      {p.simulationOnly && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <MonitorPlay className="h-3.5 w-3.5" />
                          No parts
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
