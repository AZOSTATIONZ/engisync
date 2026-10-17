# Deploying EngiSync

How a deploy reaches production, what the current one carries, and how to undo
it. Written for the person doing it at the time, which may be months from now.

## How a deploy happens

Pushing to `main` triggers a Vercel build, which promotes to
`engisync.vercel.app` when it succeeds. There is no manual step.

Vercel runs the **`vercel-build`** script if `package.json` defines one, in
preference to `build`. This project defines both, and they differ on purpose:

| script | runs where | what it does |
| --- | --- | --- |
| `build` | locally, in the gate | `prisma generate && next build` |
| `vercel-build` | Vercel only | the same, plus `prisma migrate deploy` first |

Keeping them separate means a local `npm run build` never touches a database,
so the verification gate cannot accidentally migrate anything — and the
Vercel path still gets migrations without anyone remembering to run them.

### Why migrations run with the advisory lock disabled

`DATABASE_URL` on Vercel is Neon's **pooled** endpoint. Prisma's migration
engine normally takes a Postgres session-level advisory lock, which a
transaction-mode pooler does not carry across statements, so the command hangs
with no output. That is the same hang documented in `DATABASE.md`.

`PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` turns that lock off.
`migrate deploy` does not need a shadow database — that was `migrate dev` —
so with the lock disabled it runs over the pooled endpoint correctly.

The lock exists to stop two migrations racing. Vercel can run concurrent
builds, so that race is possible in principle; in practice the loser fails on
an already-applied migration, the build fails, and nothing is promoted. A
failed build is the safe outcome.

## Ordering, and why this is zero-downtime

`migrate deploy` runs **during the build**, before the new deployment is
promoted. So the sequence is:

1. Old code is serving. Database has the old schema.
2. Build starts. Migration applies. **Old code is now serving against the new
   schema** — this is the window that has to be safe.
3. Build finishes. New deployment is promoted. New code serves.

Step 2 is only safe if every migration is backward-compatible with the code
already running. Adding a nullable column is. Dropping a column, renaming one,
or adding a `NOT NULL` without a default is not — those need two deploys:
one that makes the code tolerate both shapes, then one that changes the shape.

**This is the rule to check before every deploy**, and the thing most likely
to cause an outage if skipped.

## What the current pending migration does

`20261016105751_add_user_theme_key`:

```sql
ALTER TABLE "User" ADD COLUMN "themeKey" TEXT;
```

One nullable column, no default, no backfill, no index. It is additive, so
step 2 above is safe: code that does not select `themeKey` is unaffected, and
Prisma selects columns explicitly rather than `SELECT *`.

Nullable is also load-bearing at the product level, not just the schema level:
`NULL` means "never chose a theme", which is what lets a device preference be
promoted to the account on first sign-in. A default would erase that
distinction permanently. See `lib/themes.ts`.

## Rolling back

**Roll back the code, leave the column.**

In the Vercel dashboard, open the previous deployment and promote it, or:

```bash
npx vercel rollback
```

The `themeKey` column can stay. Code that predates it never selects it, so it
is inert — an unused nullable column costs nothing and dropping it would throw
away every theme choice users had made. Only drop it if the feature is being
abandoned permanently, and then as its own migration.

This asymmetry is the point: **additive migrations make rollback a code-only
operation.** If a future migration is not additive, write the rollback SQL
before deploying it, not after something breaks.

## If the build fails on the migration

Nothing is promoted and production keeps serving the previous deployment, so
there is no urgency. Read the build log in Vercel first — the migration runs
early, so its error is near the top.

- **`column already exists`** — the migration applied but `_prisma_migrations`
  was not updated, usually from an interrupted earlier run. Resolve it with
  `prisma migrate resolve --applied <migration_name>` against the database,
  rather than editing the SQL.
- **Hangs with no output** — the advisory lock is back on. Check the
  `vercel-build` script still sets `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1`.
- **`P1001` cannot reach the database** — Neon compute may be suspended or the
  connection string rotated. Check the Neon dashboard before changing anything
  here.

## Checks before pushing

The gate that has to pass, in this order, because each catches what the
previous one cannot:

```bash
npx tsc --noEmit        # types; vitest does NOT typecheck
npx next lint
npx vitest run
npm run build
```

`tsc` is not optional. Twice in this project a change has passed lint and the
full test suite while failing typecheck — once an unused `@ts-expect-error`,
once a duplicate import — because vitest executes TypeScript without checking
it.

Do not run `npm run build` while `npm run dev` is running; the dev server holds
`query_engine-windows.dll.node` and `prisma generate` fails with `EPERM`.

## Environment

Production environment variables live in Vercel and are marked **sensitive**,
which means they are write-only: `vercel env pull` returns `[SENSITIVE]` and
the API returns an empty value. Nobody can read them back, including the owner.
To run anything against production from a laptop you need the connection
string from the **Neon** dashboard instead — production branch
`ep-dry-block-ay8bim9d`, with *Pooled connection* switched **off** for
migrations.

`DIRECT_URL` is **not** set on Vercel, and `vercel-build` supplies it inline
from `DATABASE_URL`:

```
DIRECT_URL="$DATABASE_URL" PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 prisma migrate deploy
```

Pointing `DIRECT_URL` at the pooled endpoint would normally be wrong — that is
exactly what hangs — but it is correct here *because* the advisory lock is
disabled in the same command. The two settings only make sense together.

Locally, `.env` sets `DIRECT_URL` to the genuinely unpooled endpoint, which is
what `migrate dev` needs. The schema's `directUrl` line is therefore satisfied
in both places by different values, which is the point of it being a variable.

### A correction worth keeping

The first version of this file said `DIRECT_URL` "does not need to be" set on
Vercel, on the evidence that `prisma generate` succeeds without it. That
evidence was real and the conclusion was still wrong: `generate` does not read
`directUrl`, but `migrate deploy` does, and this build had just been changed to
run `migrate deploy`. The test was run before the premise changed and the
result was carried across the change without being re-checked.

The first deploy failed on exactly that, with `P1012: Environment variable not
found: DIRECT_URL`. Nothing was promoted, because the migration runs before
`next build` and a failed build is never deployed — which is the one part of
the design that behaved as intended.
