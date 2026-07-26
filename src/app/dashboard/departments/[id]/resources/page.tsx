import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Library, Sparkles, ShieldCheck, ExternalLink, Clock, XCircle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeptMembership,
  isDeptAdmin,
  listApprovedResources,
  listMySubmissions,
  listPendingResources,
} from "@/lib/resource-hub";
import { getRecommendations, getLearnerProfile } from "@/lib/recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SubmitResourceForm,
  ResourceActions,
  ModerationRow,
  ProfileForm,
  DifficultyBadge,
} from "./resource-hub-ui";

export const metadata: Metadata = { title: "Resource Hub" };

export default async function ResourceHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; type?: string; difficulty?: string }>;
}) {
  const { id } = await params;
  const { q, type, difficulty } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const dept = await prisma.department.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!dept || !(await getDeptMembership(id, userId))) notFound();

  const [approved, mine, pending, rec, profile, admin] = await Promise.all([
    listApprovedResources(id, userId, { q, type, difficulty }),
    listMySubmissions(id, userId),
    listPendingResources(id, userId),
    getRecommendations(userId),
    getLearnerProfile(userId),
    isDeptAdmin(id, userId),
  ]);

  const notApproved = mine.filter((m) => m.status !== "APPROVED");

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/departments/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to department
      </Link>

      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-6 text-white shadow-soft sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm/relaxed opacity-90">
              <Library className="h-4 w-4" /> AI-curated Resource Hub
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{dept.name}</h1>
            <p className="max-w-lg text-sm text-white/80">
              Every resource is AI-checked for relevance, quality, and safety before it appears here.
            </p>
          </div>
          <SubmitResourceForm departmentId={id} />
        </div>
      </div>

      {/* Recommended for you */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" /> Recommended for you
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {rec.aiRanked ? "AI-personalized" : "Based on your department"}
          </span>
        </CardHeader>
        <CardContent>
          {rec.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recommendations yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rec.items.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium group-hover:text-primary">{r.name}</p>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">{r.category}</p>
                  <p className="mt-1 text-sm">{r.why}</p>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search + filter */}
      <form method="get" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search resources…"
          className="h-10 flex-1 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
        />
        <select name="type" defaultValue={type ?? "ALL"} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
          {["ALL", "LINK", "GITHUB", "YOUTUBE", "SOFTWARE", "TUTORIAL", "DOCUMENTATION", "PAPER", "DATASET", "TEMPLATE", "PDF", "OTHER"].map((t) => (
            <option key={t} value={t}>{t === "ALL" ? "All types" : t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <select name="difficulty" defaultValue={difficulty ?? "ALL"} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
          {["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"].map((d) => (
            <option key={d} value={d}>{d === "ALL" ? "All levels" : d.charAt(0) + d.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>

      {/* Approved resources */}
      <div className="grid gap-3 md:grid-cols-2">
        {(approved ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No resources yet — be the first to submit one.</p>
        ) : (
          (approved ?? []).map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{r.title}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <DifficultyBadge level={r.difficulty} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.type}{r.category ? ` · ${r.category}` : ""} · by {r.submittedByName}
                </p>
                {r.description && <p className="text-sm">{r.description}</p>}
                {r.whyUseful && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Why useful: </span>{r.whyUseful}
                  </p>
                )}
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] text-muted-foreground">#{t}</span>
                    ))}
                  </div>
                )}
                <ResourceActions resource={r} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* My submissions awaiting/rejected */}
      {notApproved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notApproved.map((m) => (
              <div key={m.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                {m.status === "PENDING" ? (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                )}
                <div>
                  <p className="font-medium">{m.title} <span className="text-xs text-muted-foreground">— {m.status.toLowerCase()}</span></p>
                  {m.moderationReason && <p className="text-xs text-muted-foreground">{m.moderationReason}</p>}
                  {m.suggestedCategory && (
                    <p className="text-xs text-muted-foreground">Suggested category: {m.suggestedCategory}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Admin moderation queue */}
      {admin && pending && pending.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-amber-600" /> Moderation queue ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((r) => (
              <ModerationRow key={r.id} resource={r} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Learner profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personalize my recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm departmentId={id} profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
