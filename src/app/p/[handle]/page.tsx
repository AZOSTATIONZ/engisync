import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, Download, ExternalLink } from "lucide-react";
import { getContributionStats, getPublicProfile } from "@/lib/profile";
import { computeBadges, publicBadges } from "@/lib/personalization";
import { Avatar } from "@/components/avatar";
import { CircuitHeader } from "@/components/circuit-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Public engineering portfolio — /p/<handle>
 *
 * Outside /dashboard, so it is reachable without an account (see
 * auth.config.ts). Everything shown is either written by the student or
 * derived from work a supervisor approved; nothing here is self-asserted
 * achievement, which is the whole point of it being worth showing an employer.
 *
 * A private or non-existent handle both render the SAME 404. Distinguishing
 * them would let anyone enumerate which students have accounts.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) return { title: "Profile not found" };

  return {
    title: `${profile.name ?? "Engineer"} — EngiSync`,
    description:
      profile.headline ??
      `Engineering portfolio${profile.department ? ` · ${profile.department}` : ""}`,
    // Public and intended to be found: this is the page a graduate sends to an
    // employer, so it should be linkable and indexable.
    robots: { index: true, follow: true },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  const stats = await getContributionStats(profile.userId);
  // `publicBadges` strips anything financial — see personalization.ts.
  const badges = publicBadges(computeBadges(stats));

  return (
    <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-10">
      {/* Discipline-specific traces behind the name — the first signal to a
          visitor that this is engineering work, not a generic CV site. */}
      <CircuitHeader department={profile.department} />

      <header className="relative flex flex-wrap items-start gap-4">
        <Avatar
          userId={profile.userId}
          name={profile.name}
          image={profile.image}
          accentColor={profile.accentColor}
          avatarStyle={profile.avatarStyle}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <h1 className="page-title">{profile.name ?? "Engineer"}</h1>
          {profile.headline && (
            <p className="text-muted-foreground">{profile.headline}</p>
          )}
          {profile.department && (
            <p className="text-sm text-muted-foreground">{profile.department}</p>
          )}
        </div>
      </header>

      {profile.bio && (
        <Card>
          <CardContent className="py-4">
            <p className="whitespace-pre-wrap text-sm">{profile.bio}</p>
          </CardContent>
        </Card>
      )}

      {profile.skills.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Skills
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Published work
        </h2>
        {profile.published.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published projects yet.
          </p>
        ) : (
          <div className="space-y-3">
            {profile.published.map((p) => (
              /* NOT a link. The repository lives under /dashboard and requires
                 an account, so linking there would send an employer to a login
                 wall. The abstract is shown in full instead — enough to judge
                 the work without needing access to the institution's system. */
              <div
                key={p.slug}
                className="rounded-xl border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.year} · {p.departmentName}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Download className="h-3 w-3" />
                    {p.downloads}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.abstract}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {badges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-primary" /> Verified achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {badges.map((b) => (
                <li key={b.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-muted-foreground">{b.earnedFor}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <footer className="border-t pt-4 text-xs text-muted-foreground">
        <Link href="/" className="inline-flex items-center gap-1 hover:underline">
          Verified engineering work on EngiSync
          <ExternalLink className="h-3 w-3" />
        </Link>
      </footer>
    </div>
  );
}
