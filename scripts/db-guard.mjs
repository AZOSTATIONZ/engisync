#!/usr/bin/env node
/**
 * Refuses to run a destructive Prisma command against the production database.
 *
 * WHY THIS EXISTS
 * On 29 July, `prisma migrate dev` in this repository offered to RESET the
 * production database. It was not a mistake in the command — it was the
 * correct behaviour of that command, pointed at the only database this
 * project has ever had. One keystroke stood between a routine schema change
 * and deleting 41 students' accounts, projects and coursework.
 *
 * The fix is to split dev from production, and that is a Neon console job. But
 * splitting them only removes the danger while everyone remembers which
 * connection string is in their `.env`. This removes it permanently: the
 * dangerous commands now check where they are pointed and stop.
 *
 * WHY A HOSTNAME AND NOT A SECRET
 * The production endpoint below is a hostname, useless without credentials,
 * and it is already in the migration notes and the team's memory file. Naming
 * it explicitly is the point — a guard that infers "production" from
 * NODE_ENV or a branch name is a guard that fails silently the first time
 * somebody runs a script differently.
 *
 * ESCAPE HATCH, deliberately awkward: set ALLOW_PRODUCTION_DB=1. Applying a
 * migration to production is a real thing to want to do; doing it by accident
 * is not. `prisma migrate deploy` is additive and is NOT guarded, because that
 * is the correct way to reach production and blocking it would push people
 * towards the dangerous commands.
 */

const PRODUCTION_HOSTS = [
  // Neon primary branch for EngiSync (us-east-2). See the note above.
  "ep-dry-block-ay8bim9d",
];

/* LOAD .env THE WAY PRISMA DOES.
   A bare `node` script does not read .env, and npm scripts do not either —
   only the Prisma CLI does, later in the chain. The first version of this
   guard therefore saw no DATABASE_URL and refused EVERYTHING, which is worse
   than useless: a check that always fails is a check people permanently
   disable, and then the real one never fires. Caught by testing the allow
   path rather than only the block path. */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

const command = process.argv[2] ?? "this command";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n  DATABASE_URL is not set. Nothing to check — refusing anyway.\n");
  process.exit(1);
}

let host;
try {
  host = new URL(url).hostname;
} catch {
  console.error("\n  DATABASE_URL is not a valid URL. Refusing to run.\n");
  process.exit(1);
}

const isProduction = PRODUCTION_HOSTS.some((h) => host.includes(h));

if (!isProduction) {
  // Say which database, so a developer notices immediately if their .env is
  // pointing somewhere unexpected — silence here would be a missed warning.
  console.log(`  db-guard: ${command} → ${host} (not production) ✓`);
  process.exit(0);
}

if (process.env.ALLOW_PRODUCTION_DB === "1") {
  console.warn(
    `\n  ⚠  db-guard: running ${command} against PRODUCTION (${host})` +
      `\n     ALLOW_PRODUCTION_DB=1 was set, so this is deliberate.\n`,
  );
  process.exit(0);
}

console.error(
  `
  ══════════════════════════════════════════════════════════════════
   REFUSED: ${command} would run against the PRODUCTION database.

   Host: ${host}

   This database holds real students' accounts, projects and
   coursework. \`prisma migrate dev\` in particular may offer to RESET
   it — which has already nearly happened once on this project.

   What you probably want instead:

     • Point .env at your dev branch
       Neon → Branches → create a branch from main → copy its
       connection string into DATABASE_URL.

     • Apply an existing migration to production
       npm run prisma:deploy      (additive, not guarded)

     • Genuinely need this command against production?
       ALLOW_PRODUCTION_DB=1 npm run <script>
  ══════════════════════════════════════════════════════════════════
`,
);
process.exit(1);
