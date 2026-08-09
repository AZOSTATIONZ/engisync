# Databases

## The rule

**Your `.env` points at a dev branch. Production is reached only by
`prisma migrate deploy`.**

## Why this is written down

On 29 July, `prisma migrate dev` in this repository offered to **reset the
production database**. That was not a bug in the command — it is exactly what
`migrate dev` does when it detects drift, and it was pointed at the only
database this project had. One confirmation stood between a routine schema
change and deleting 41 students' accounts, projects and coursework.

Every schema change since then has been applied to production by hand, using
`migrate diff` to generate SQL and `migrate deploy` to apply it, because there
was nowhere else to apply it to.

## One-time setup: create your dev branch

1. **Neon console** → your project → **Branches** → **Create branch**
2. Parent: `main`. Name it `dev`.
   Neon branches are copy-on-write, so this is instant and costs almost
   nothing until you start writing.
3. Open the new branch → **Connection string** → copy it.
4. In `E:\claudecode\.env`, replace `DATABASE_URL` with that string.
5. Confirm you are pointed somewhere safe:

   ```bash
   npm run db:guard
   ```

   It prints the host and whether it is production. If it still says
   production, the `.env` edit did not take.

**Your dev branch contains a copy of real student data** — names, email
addresses, password hashes, EcoCash references and uploaded coursework.

Scrub it as soon as you have created it:

```bash
npm run db:anonymise              # report only, changes nothing
npm run db:anonymise -- --confirm # rewrite
```

This replaces every name and address with a stable pseudonym, resets all
passwords to `DevPassword-123!` so you can sign in as anyone, deletes sessions,
2FA secrets, recovery codes, tokens, push subscriptions and OAuth credentials,
clears IP addresses, device labels and payment references, and replaces
uploaded file bytes with a placeholder.

It **refuses to run against production, with no override** — unlike the
migration guard, there is no legitimate reason to want that.

**It does not make the data anonymous in the legal sense.** Free text is
scrubbed only where a name matches a user in the database; a nickname, a
misspelling or somebody who never had an account survives. Treat the branch as
sensitive — just less so. Do not paste its connection string anywhere, and do
not point a deployed preview at it.

## Everyday work

| You want to | Command |
|---|---|
| Change the schema while developing | `npm run prisma:migrate` |
| Apply existing migrations to production | `npm run prisma:deploy` |
| See which database you are pointed at | `npm run db:guard` |
| Reset your dev branch to a clean state | `npm run prisma:reset` |
| Scrub real student data from your dev branch | `npm run db:anonymise` |

## The guard

`scripts/db-guard.mjs` runs before `prisma:migrate`, `prisma:reset` and
`db:seed`. If `DATABASE_URL` points at the production endpoint, it refuses and
explains why.

`prisma:deploy` is **deliberately not guarded**. Applying a reviewed migration
to production is the correct way to reach it, and blocking that would push
people towards the dangerous commands to get their work done.

To run a guarded command against production on purpose:

```bash
ALLOW_PRODUCTION_DB=1 npm run prisma:migrate
```

Deliberately awkward. Wanting this is legitimate; doing it by accident is not.

## Shipping a schema change to production

The pattern used for every migration in this codebase, and the reason none of
them lost data:

1. Change `prisma/schema.prisma`.
2. `npm run prisma:migrate` — applies to your dev branch and writes the
   migration file.
3. **Read the generated SQL.** Every migration in `prisma/migrations/` was
   checked for `DROP TABLE`, `DROP COLUMN` and `TRUNCATE` before it ran. If a
   destructive statement is there and you did not intend it, stop.
4. Commit the migration file.
5. `npm run prisma:deploy` against production, or let the deploy pipeline do
   it.

### The drift trap

`migrate diff` against this project emits `DROP TABLE "playing_with_neon"` —
a leftover Neon sample table that exists in the database and not in the
schema. It is unrelated to whatever you are changing, and it has been stripped
by hand from every migration in this repository. Once dev and production are
separate, generate migrations from the **dev** branch and this stops
appearing.
