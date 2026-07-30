import Link from "next/link";
import type { Metadata } from "next";
import { Award, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getContributionStats } from "@/lib/profile";
import { computeBadges } from "@/lib/personalization";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/avatar";
import { AnimatedCounter } from "@/components/animated-counter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Profile" };

/**
 * Your engineering profile.
 *
 * The personalization work — avatar, accent, headline, skills — and the badge
 * system both existed with nowhere to appear. This is that place, and it is
 * also the foundation of the shareable portfolio: everything here is derived
 * from records a supervisor could verify, so it can eventually be shown to
 * someone outside the university without becoming a self-reported CV.
 */
export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        image: true,
        headline: true,
        bio: true,
        skills: true,
        accentColor: true,
        avatarStyle: true,
        createdAt: true,
        deptMemberships: {
          take: 1,
          select: { department: { select: { name: true } }, role: true },
        },
      },
    }),
    getContributionStats(userId),
  ]);

  const badges = computeBadges(stats);
  const department = user?.deptMemberships[0]?.department.name ?? null;

  const figures = [
    { label: "Tasks completed", value: stats.tasksCompleted },
    { label: "Projects led", value: stats.projectsLed },
    { label: "Published", value: stats.projectsPublished },
    { label: "Downloads", value: stats.repositoryDownloads },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar
            userId={userId}
            name={user?.name}
            image={user?.image}
            accentColor={user?.accentColor}
            avatarStyle={user?.avatarStyle}
            size="xl"
          />
          <div className="min-w-0">
            <h1 className="page-title">{user?.name ?? "Your profile"}</h1>
            {user?.headline && (
              <p className="text-muted-foreground">{user.headline}</p>
            )}
            {department && (
              <p className="text-sm text-muted-foreground">
                {department}
                {user?.deptMemberships[0]?.role === "SUPERVISOR" && " · Supervisor"}
              </p>
            )}
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.settings}>
            <Pencil className="h-4 w-4" /> Edit profile
          </Link>
        </Button>
      </div>

      {user?.bio && (
        <Card>
          <CardContent className="py-4">
            <p className="whitespace-pre-wrap text-sm">{user.bio}</p>
          </CardContent>
        </Card>
      )}

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {figures.map((f) => (
          <Card key={f.label}>
            <CardContent className="py-3">
              <p className="text-xs uppercase text-muted-foreground">{f.label}</p>
              {/* Tabular figures so a row of numbers lines up. The count-up
                  earns its place here: these are cumulative achievements, and
                  the motion draws the eye to a number that took a year to
                  reach. It is NOT used for live counters elsewhere, where a
                  ticking figure would just look unstable. */}
              <p className="tabular text-2xl font-bold">
                <AnimatedCounter value={f.value} />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-primary" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              None yet. Badges are earned from real work — complete a task, lead
              a project, or get documentation approved by your supervisor.
            </p>
          ) : (
            <ul className="stagger grid gap-2 sm:grid-cols-2">
              {badges.map((b) => (
                <li key={b.id} className="card-hover rounded-lg border p-3">
                  <p className="text-sm font-medium">{b.label}</p>
                  {/* Every badge states what earned it, so a supervisor can
                      check the claim rather than take it on trust. */}
                  <p className="text-xs text-muted-foreground">{b.earnedFor}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {!user?.skills?.length ? (
            <EmptyState
              title="No skills listed"
              description="Add the software and techniques you work with — MATLAB, KiCad, SolidWorks, Python."
              actionLabel="Add skills"
              actionHref={routes.settings}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
