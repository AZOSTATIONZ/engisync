#!/usr/bin/env node
/**
 * Replace real student data in a DEV database branch with pseudonyms.
 *
 * Run after creating a Neon dev branch (see docs/DATABASE.md). A branch is a
 * copy-on-write clone of production, so the moment it exists it holds 41 real
 * people's names, email addresses, password hashes, EcoCash references and
 * uploaded coursework. Same owner and same Neon account, so it is not a new
 * exposure — but a dev database gets pointed at preview deployments, pasted
 * into bug reports and left running on laptops, and none of those are things
 * you want doing to a student's real work.
 *
 *   node scripts/anonymise-dev-db.mjs            # report only, changes nothing
 *   node scripts/anonymise-dev-db.mjs --confirm  # actually rewrite
 *
 * IT REFUSES TO RUN AGAINST PRODUCTION, and unlike `db-guard.mjs` there is NO
 * override. `ALLOW_PRODUCTION_DB` is deliberately not honoured here: running
 * this against production would irreversibly destroy every account, and there
 * is no legitimate reason to want that. A guard with an escape hatch is a
 * guard somebody eventually uses at 2am.
 *
 * WHAT IT DOES NOT PROMISE. Free text written by one person about another —
 * "ask Tendai about the beam" in a discussion message — is scrubbed only where
 * the name matches a user in this database. A nickname, a misspelling, or a
 * person who never had an account survives. This makes the data far safer, not
 * anonymous in the legal sense, and it should not be treated as a licence to
 * share the branch.
 */

import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const PRODUCTION_HOSTS = ["ep-dry-block-ay8bim9d"];
const CONFIRMED = process.argv.includes("--confirm");

/** One password for every account, so you can sign in as anyone while testing. */
const DEV_PASSWORD = "DevPassword-123!";

const FIRST = [
  "Tarisai", "Nyasha", "Farai", "Rudo", "Tendai", "Chipo", "Blessing", "Kudzai",
  "Anesu", "Tanaka", "Rutendo", "Munashe", "Tafara", "Vimbai", "Simba", "Ropafadzo",
  "Panashe", "Nomsa", "Takudzwa", "Chiedza", "Batsirai", "Sekai", "Tinashe", "Mazvita",
];
const LAST = [
  "Moyo", "Ncube", "Dube", "Sibanda", "Mhlanga", "Chikafu", "Marange", "Zvobgo",
  "Mutasa", "Nyoni", "Chirwa", "Madziva", "Gwati", "Mupfumi", "Sithole", "Banda",
];

/** Same input always gives the same pseudonym, so relationships stay legible. */
export function pseudonym(id) {
  const h = createHash("sha256").update(id).digest();
  const first = FIRST[h[0] % FIRST.length];
  const last = LAST[h[1] % LAST.length];
  return { name: `${first} ${last}`, first, last };
}

export function pseudoEmail(id, first, last) {
  const n = createHash("sha256").update(id).digest("hex").slice(0, 4);
  // `.invalid` is reserved by RFC 2606 and can never route, so a stray send
  // from a dev environment cannot reach a real inbox.
  return `${first}.${last}.${n}`.toLowerCase() + "@engisync.invalid";
}

/**
 * Replace every real name and address in a piece of free text.
 *
 * Pure, and exported, because the ordering here is the part that silently
 * goes wrong: replacing "Tafadzwa" before "Tafadzwa Musendo" leaves the
 * surname stranded next to a pseudonym, which is worse than not scrubbing at
 * all — it looks anonymised and is not. Callers must pass `replacements`
 * sorted longest-first.
 */
export function substitute(text, replacements) {
  if (typeof text !== "string" || !text) return text;
  let out = text;
  for (const [real, fake] of replacements) {
    if (!real) continue;
    // Case-insensitive scan rather than a RegExp. Names contain characters
    // that are regex metacharacters — "O'Brien", "Jean-Luc", initials with
    // dots — and building a pattern from user data means escaping it
    // perfectly every time. A plain indexOf loop has nothing to escape, so
    // it cannot be subtly wrong in a way that silently leaves a name behind.
    let from = 0;
    let result = "";
    const haystack = out.toLowerCase();
    const needle = real.toLowerCase();
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) break;
      result += out.slice(from, at) + fake;
      from = at + needle.length;
    }
    out = result + out.slice(from);
  }
  return out;
}

/** Longest first — see `substitute`. */
export function sortReplacements(pairs) {
  return [...pairs].sort((a, b) => b[0].length - a[0].length);
}

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) fail("DATABASE_URL is not set.");

  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    fail("DATABASE_URL is not a valid URL.");
  }

  if (PRODUCTION_HOSTS.some((h) => host.includes(h))) {
    fail(
      `REFUSED: ${host} is the PRODUCTION database.\n\n` +
        `  This script destroys every account irreversibly. Point .env at your\n` +
        `  Neon dev branch first — see docs/DATABASE.md.\n\n` +
        `  There is no override for this check, by design.`,
    );
  }

  console.log(`\n  Database: ${host}`);
  console.log(`  Mode:     ${CONFIRMED ? "REWRITE" : "report only (pass --confirm to apply)"}\n`);

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  console.log(`  ${users.length} user(s) to pseudonymise.`);

  // Built before anything changes: the substitution pass below needs to find
  // the ORIGINAL names inside free text.
  const replacements = [];
  const plan = users.map((u) => {
    const p = pseudonym(u.id);
    const email = pseudoEmail(u.id, p.first, p.last);
    if (u.name?.trim()) replacements.push([u.name.trim(), p.name]);
    if (u.email) replacements.push([u.email, email]);
    return { id: u.id, oldName: u.name, oldEmail: u.email, name: p.name, email };
  });

  // Longest first, so "Tafadzwa Musendo" is replaced before "Tafadzwa".
  const ordered = sortReplacements(replacements);

  if (!CONFIRMED) {
    for (const p of plan.slice(0, 5)) {
      console.log(`    ${String(p.oldName ?? "(no name)").padEnd(22)} → ${p.name}`);
    }
    if (plan.length > 5) console.log(`    …and ${plan.length - 5} more`);
    console.log(
      `\n  Would also: reset every password to "${DEV_PASSWORD}", delete all\n` +
        `  sessions, 2FA secrets, recovery codes, reset/verification tokens,\n` +
        `  push subscriptions and OAuth tokens; clear IP addresses, user agents,\n` +
        `  device labels and EcoCash references; replace uploaded file bytes with\n` +
        `  a placeholder; and substitute names inside free text.\n`,
    );
    console.log("  Nothing was changed. Re-run with --confirm.\n");
    return;
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  /* 1. Identity. */
  for (const p of plan) {
    await prisma.user.update({
      where: { id: p.id },
      data: {
        name: p.name,
        email: p.email,
        passwordHash,
        image: null,
        headline: null,
        bio: null,
        handle: null,
        // Turning 2FA off as well as clearing the secret: leaving it enabled
        // with no secret would lock every account out of the dev database.
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }
  console.log(`  ✓ ${plan.length} identities pseudonymised, passwords reset`);

  /* 2. Credentials and anything that grants access. Deleted, not faked —
        a plausible-looking fake token is a thing somebody eventually trusts. */
  const wiped = {
    sessions: (await prisma.session.deleteMany({})).count,
    backupCodes: (await prisma.twoFactorBackupCode.deleteMany({})).count,
    resetTokens: (await prisma.passwordResetToken.deleteMany({})).count,
    verifyTokens: (await prisma.emailVerificationToken.deleteMany({})).count,
    pushSubs: (await prisma.pushSubscription.deleteMany({})).count,
    oauthAccounts: (await prisma.account.deleteMany({})).count,
  };
  console.log(
    `  ✓ credentials destroyed: ${Object.entries(wiped)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
  );

  /* 3. Traces of real people and devices. */
  const audits = await prisma.auditLog.updateMany({
    data: { ipAddress: null, userAgent: null },
  });
  const devices = await prisma.knownDevice.updateMany({
    data: { lastIp: null, label: "Dev device" },
  });
  console.log(`  ✓ ${audits.count} audit rows and ${devices.count} devices de-identified`);

  /* 4. Financial references. An EcoCash transaction reference identifies a
        real payment by a real person to a real number. */
  const money = await prisma.contribution.updateMany({
    data: { reference: null, note: null },
  });
  console.log(`  ✓ ${money.count} payment references cleared`);

  /* 5. Uploaded bytes. These are students' actual reports and drawings —
        the most personal content in the database and the largest. */
  const placeholder = Buffer.from(
    "This file's contents were removed when the dev database was anonymised.\n",
  );
  const files = await prisma.fileResource.updateMany({
    where: { NOT: { data: null } },
    data: { data: placeholder },
  });
  const published = await prisma.publishedFile.updateMany({
    where: { NOT: { data: null } },
    data: { data: placeholder },
  });
  console.log(`  ✓ ${files.count + published.count} uploaded file(s) replaced with a placeholder`);

  /* 6. Denormalised author names, and names inside free text. */
  const textJobs = [
    ["projectFeedback", ["authorName", "body"]],
    ["sectionComment", ["authorName", "body"]],
    ["discussionThread", ["authorName", "title"]],
    ["discussionMessage", ["authorName", "body"]],
    ["departmentResource", ["submittedByName", "studentNote", "description"]],
    ["reportVersion", ["submittedByName", "note"]],
    ["quizAttempt", ["userName"]],
    ["ledgerEvent", ["actorName", "note"]],
    ["notification", ["title", "body"]],
    ["meeting", ["minutes", "description"]],
    ["withdrawalRequest", ["reason", "leaderNote", "supervisorNote"]],
    ["timeLog", ["note"]],
    ["attendance", ["note"]],
    ["publishedProject", ["authors", "supervisorName", "abstract"]],
    ["documentSection", ["content"]],
    ["task", ["title", "description"]],
  ];

  let rewritten = 0;
  for (const [model, fields] of textJobs) {
    const delegate = prisma[model];
    if (!delegate) continue;
    const rows = await delegate.findMany({
      select: Object.fromEntries([["id", true], ...fields.map((f) => [f, true])]),
    });
    for (const row of rows) {
      const patch = {};
      for (const f of fields) {
        const before = row[f];
        if (typeof before !== "string" || !before) continue;
        let after = before;
        for (const [real, fake] of replacements) {
          if (!real) continue;
          after = after.split(real).join(fake);
          // Case-insensitive second pass for names typed in running text.
          const re = new RegExp(real.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          after = after.replace(re, fake);
        }
        if (after !== before) patch[f] = after;
      }
      if (Object.keys(patch).length) {
        await delegate.update({ where: { id: row.id }, data: patch });
        rewritten++;
      }
    }
  }
  console.log(`  ✓ ${rewritten} row(s) had real names substituted in free text`);

  console.log(
    `\n  Done. Every account's password is now: ${DEV_PASSWORD}\n` +
      `  Residual risk: nicknames and misspellings in free text are not caught.\n` +
      `  Treat this branch as sensitive, just less so.\n`,
  );
}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith("anonymise-dev-db.mjs");

if (invokedDirectly) {
  main()
    .catch((e) => {
      console.error("\n  Failed:", e.message, "\n");
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
