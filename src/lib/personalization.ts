/**
 * Personalization — identity, accent colour, generated avatars, earned badges.
 *
 * WHY AVATARS ARE GENERATED, NOT UPLOADED
 * ---------------------------------------
 * The obvious implementation is an upload button. It is the wrong one here:
 *
 *   - There is no object storage configured. Adding S3 for decoration would be
 *     the largest infrastructure change in the product, for a profile picture.
 *   - Uploaded images need moderation. A shared department hub with unmoderated
 *     user images is a real safeguarding problem, and there is no one to staff
 *     a review queue.
 *   - A photo is tens to hundreds of kilobytes on every page that shows a team
 *     list. On Zimbabwean mobile data that is a cost students pay to look at
 *     each other's faces.
 *
 * So avatars are generated deterministically from the user's id: a small inline
 * SVG, a few hundred bytes, no storage, no upload, no moderation, and it works
 * offline. Users pick a STYLE and an ACCENT, which is where the sense of
 * ownership actually comes from — the specific pixels matter far less than
 * having chosen them.
 *
 * OAuth users who already have a provider image keep it (`user.image`); that
 * one is already hosted, already moderated by Google or Microsoft, and costs us
 * nothing.
 *
 * WHY THE ACCENT PALETTE IS FIXED
 * -------------------------------
 * A free colour picker guarantees that somebody chooses #FFFF00 on white and
 * the interface becomes unreadable. Every accent below has been chosen to hold
 * contrast against both the light and dark surfaces, so personalization can
 * never break accessibility.
 */

/* ── Accent colours ─────────────────────────────────────────────────── */

export type AccentKey =
  | "blue"
  | "violet"
  | "teal"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

/**
 * HSL triples matching the `--primary` custom property format already used in
 * globals.css, so an accent is applied by overriding one variable rather than
 * by shipping seven stylesheets.
 */
export const ACCENTS: Record<
  AccentKey,
  { label: string; light: string; dark: string; swatch: string }
> = {
  blue: { label: "Blue", light: "221 83% 53%", dark: "217 91% 60%", swatch: "#2563eb" },
  violet: { label: "Violet", light: "262 83% 58%", dark: "263 90% 66%", swatch: "#7c3aed" },
  teal: { label: "Teal", light: "184 90% 34%", dark: "180 77% 47%", swatch: "#0d9488" },
  emerald: { label: "Emerald", light: "160 84% 32%", dark: "158 64% 47%", swatch: "#059669" },
  amber: { label: "Amber", light: "32 95% 44%", dark: "38 92% 55%", swatch: "#d97706" },
  rose: { label: "Rose", light: "347 77% 50%", dark: "350 89% 65%", swatch: "#e11d48" },
  slate: { label: "Graphite", light: "215 25% 35%", dark: "215 20% 65%", swatch: "#475569" },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];
export const DEFAULT_ACCENT: AccentKey = "blue";

export function isAccentKey(v: unknown): v is AccentKey {
  return typeof v === "string" && v in ACCENTS;
}

/** Never trust a stored value — a row written before a palette change, or by
 *  hand, must not be able to blank out the interface's primary colour. */
export function resolveAccent(v: string | null | undefined): AccentKey {
  return isAccentKey(v) ? v : DEFAULT_ACCENT;
}

/* ── Generated avatars ──────────────────────────────────────────────── */

export type AvatarStyle = "node" | "gear" | "hex" | "wave" | "truss" | "orbit";

export const AVATAR_STYLES: { key: AvatarStyle; label: string }[] = [
  { key: "node", label: "Circuit node" },
  { key: "gear", label: "Gear" },
  { key: "hex", label: "Hex lattice" },
  { key: "wave", label: "Waveform" },
  { key: "truss", label: "Truss" },
  { key: "orbit", label: "Orbit" },
];

const AVATAR_STYLE_KEYS = AVATAR_STYLES.map((s) => s.key);

export function isAvatarStyle(v: unknown): v is AvatarStyle {
  return typeof v === "string" && (AVATAR_STYLE_KEYS as string[]).includes(v);
}

/**
 * Stable 32-bit hash (FNV-1a).
 *
 * Deterministic ACROSS PROCESSES and deploys — `Math.random()` or object
 * identity would give a user a different face on every render, and a face that
 * changes is not an identity.
 */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The style a user gets before they choose one. Stable for a given id. */
export function defaultAvatarStyle(userId: string): AvatarStyle {
  return AVATAR_STYLE_KEYS[hashString(userId) % AVATAR_STYLE_KEYS.length];
}

export function resolveAvatarStyle(
  stored: string | null | undefined,
  userId: string,
): AvatarStyle {
  return isAvatarStyle(stored) ? stored : defaultAvatarStyle(userId);
}

/**
 * Up to two initials, used inside the avatar and as the text fallback.
 * Deliberately never derived from an email address — see `identity.ts`; an
 * avatar reading "TA" from `tafadzwa@…` would leak the local part into shared
 * UI, which is exactly what `displayName()` exists to prevent.
 */
export function initials(name: string | null | undefined): string {
  const clean = (name ?? "").trim();
  if (!clean) return "";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── Profile text limits ────────────────────────────────────────────── */

export const LIMITS = {
  headline: 80,
  bio: 280,
  skills: 12,
  skillLength: 24,
} as const;

/**
 * Normalise a comma-separated skills input.
 *
 * Deduplicates case-insensitively but PRESERVES the user's capitalisation —
 * "MATLAB" and "SolidWorks" are how those are written, and lowercasing them to
 * make deduplication easier would make every profile look careless.
 */
export function parseSkills(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const s = raw.trim().replace(/\s+/g, " ").slice(0, LIMITS.skillLength);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= LIMITS.skills) break;
  }
  return out;
}

export function clampText(input: string, max: number): string {
  return input.trim().replace(/\s+/g, " ").slice(0, max);
}

/* ── Earned badges ──────────────────────────────────────────────────── */

/**
 * BADGES MUST BE EARNED FROM REAL RECORDS.
 *
 * Every badge below is derived from something the database can prove: a task
 * marked done, a supervisor approval, a verified contribution. None is awarded
 * for logging in, for streaks, or for time spent in the app.
 *
 * This is the difference between a credential and a sticker. A student should
 * be able to point at a badge and say what they did to get it — and a
 * supervisor should be able to check. The moment badges can be farmed by
 * activity rather than achievement, every badge on every profile becomes
 * worthless, including the ones that were honest.
 */
export type BadgeId =
  | "first-task"
  | "task-10"
  | "task-50"
  | "task-200"
  | "team-leader"
  | "verified-contributor"
  | "documented"
  | "published"
  | "cited"
  | "supervisor";

export type Badge = {
  id: BadgeId;
  label: string;
  /** What the holder actually did. Shown on hover and on the profile. */
  earnedFor: string;
};

export type ContributionStats = {
  tasksCompleted: number;
  projectsLed: number;
  /** Payments the student declared that a leader then confirmed. */
  contributionsVerified: number;
  /** Documentation sections a supervisor approved. */
  sectionsApproved: number;
  projectsPublished: number;
  /** Times a published project of theirs was downloaded by someone else. */
  repositoryDownloads: number;
  supervises: number;
};

export const EMPTY_STATS: ContributionStats = {
  tasksCompleted: 0,
  projectsLed: 0,
  contributionsVerified: 0,
  sectionsApproved: 0,
  projectsPublished: 0,
  repositoryDownloads: 0,
  supervises: 0,
};

/**
 * Compute badges from proven activity.
 *
 * Ordered most-significant first so a profile leads with the strongest claim;
 * the count tiers are collapsed so a profile never shows "10 tasks" beside
 * "200 tasks", which reads as padding.
 */
export function computeBadges(s: ContributionStats): Badge[] {
  const out: Badge[] = [];

  if (s.supervises > 0) {
    out.push({
      id: "supervisor",
      label: "Supervisor",
      earnedFor: `Supervises ${s.supervises} project${s.supervises === 1 ? "" : "s"}`,
    });
  }
  if (s.repositoryDownloads >= 10) {
    out.push({
      id: "cited",
      label: "Referenced work",
      earnedFor: `Published work downloaded ${s.repositoryDownloads} times by others`,
    });
  }
  if (s.projectsPublished > 0) {
    out.push({
      id: "published",
      label: "Published",
      earnedFor: `${s.projectsPublished} project${s.projectsPublished === 1 ? "" : "s"} approved and published to the repository`,
    });
  }
  if (s.sectionsApproved > 0) {
    out.push({
      id: "documented",
      label: "Documented",
      earnedFor: `${s.sectionsApproved} documentation section${s.sectionsApproved === 1 ? "" : "s"} approved by a supervisor`,
    });
  }
  if (s.projectsLed > 0) {
    out.push({
      id: "team-leader",
      label: "Team leader",
      earnedFor: `Led ${s.projectsLed} project team${s.projectsLed === 1 ? "" : "s"}`,
    });
  }
  if (s.contributionsVerified > 0) {
    out.push({
      id: "verified-contributor",
      label: "Verified contributor",
      earnedFor: `${s.contributionsVerified} confirmed financial contribution${s.contributionsVerified === 1 ? "" : "s"}`,
    });
  }

  // Only the highest task tier earned, never the whole ladder.
  if (s.tasksCompleted >= 200) {
    out.push({ id: "task-200", label: "200 tasks", earnedFor: "Completed 200 assigned tasks" });
  } else if (s.tasksCompleted >= 50) {
    out.push({ id: "task-50", label: "50 tasks", earnedFor: "Completed 50 assigned tasks" });
  } else if (s.tasksCompleted >= 10) {
    out.push({ id: "task-10", label: "10 tasks", earnedFor: "Completed 10 assigned tasks" });
  } else if (s.tasksCompleted >= 1) {
    out.push({ id: "first-task", label: "First task", earnedFor: "Completed your first assigned task" });
  }

  return out;
}

/* ── Milestones worth acknowledging ─────────────────────────────────── */

/**
 * Restrained, professional acknowledgement — not gamification.
 *
 * These fire on genuine, infrequent achievements a student would tell someone
 * about. There is deliberately NO streak, NO daily login reward and NO points
 * balance: those reward showing up rather than doing engineering, and they age
 * badly in a tool a supervisor also uses.
 *
 * Anything acknowledged here must already be visible elsewhere in the product
 * as a fact. The celebration adds warmth to information the student already
 * has; it never becomes the only place something is reported.
 */
export type MilestoneKind =
  | "project-published"
  | "documentation-approved"
  | "milestone-complete"
  | "project-complete";

export const MILESTONE_COPY: Record<
  MilestoneKind,
  { title: string; body: string }
> = {
  "project-published": {
    title: "Your project is in the repository",
    body: "Future students in your department can find and build on it now.",
  },
  "documentation-approved": {
    title: "Documentation approved",
    body: "Your supervisor signed off this section.",
  },
  "milestone-complete": {
    title: "Milestone reached",
    body: "That's another part of the plan done.",
  },
  "project-complete": {
    title: "Project complete",
    body: "Every task and milestone is finished. Well done.",
  },
};
