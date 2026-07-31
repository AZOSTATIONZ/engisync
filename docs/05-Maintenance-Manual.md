# EngiSync — Maintenance Manual

**Audience:** Engineers who operate, maintain, and extend EngiSync.
**Last updated:** 26 July 2026

---

## 1. Folder structure

```
prisma/            schema.prisma, migrations/, seed.ts
src/app/(auth)/    auth pages
src/app/api/       route handlers (auth, files, share, push, health, register)
src/app/dashboard/ feature slices (one folder per feature)
src/components/     shared + feature UI
src/lib/           domain logic (one module per feature)
src/types/         ambient types
src/auth.ts        Auth.js config
public/            static assets + push service worker
docs/              documentation set
```

## 2. Backend architecture

There is no separate backend service. Server-side work runs inside Next.js as **Server Actions** (mutations invoked from the UI) and **Route Handlers** (`route.ts` / `src/app/api`). Both authenticate with `auth()`, authorize against the target resource, validate with Zod, then call domain libraries in `src/lib`, which are the only code that touches Prisma. Keep this boundary: never query Prisma from a component.

## 3. Frontend architecture

Pages are React Server Components that fetch through domain libraries. Interactivity lives in small Client Components (`"use client"`) — forms use `useActionState`/`useFormStatus` or local state with `router.refresh()`, and surface results with `sonner` toasts. Styling is Tailwind with shadcn-style primitives in `src/components/ui`.

## 4. Database schema

Defined in `prisma/schema.prisma` (41 models). Treat the schema as the source of truth for the domain. Any change must go through a migration (below) so environments stay reproducible.

## 5. API endpoints (route handlers)

- `GET /api/health` — liveness check.
- `POST /api/register` — account creation.
- File download + public share routes under `src/app/api/files` and `src/app/api/share`.
- `POST /api/push` — push subscription.
- Feature routes: `…/documentation/download` (compiled document) and `…/report/print` (printable analytics report).
- Auth routes are handled by Auth.js under `/api/auth/*`.

## 6. Authentication

Auth.js with JWT sessions (`trustHost`). Credentials hashed with bcrypt; optional TOTP 2FA; email verification and password reset via expiring single-use tokens. Configuration is in `src/auth.ts`; secrets come from env (`AUTH_SECRET`, OAuth client vars).

## 7. Logging

Server errors are logged to the platform's stdout/stderr (visible in Vercel logs). The AI layer logs provider/model/status on failure (`[ai] …`). Significant user actions are written to the `AuditLog` table. For deeper observability, add a structured logger and forward to a log drain.

## 8. Error handling

Domain functions return typed results or throw; actions catch and return `{ error }` states surfaced as toasts. Route handlers return JSON with appropriate status codes (401/403/404). Never leak stack traces to clients. When adding features, keep the "authenticate → authorize → validate → act" order and fail closed.

## 9. Monitoring

Use Vercel Analytics/Logs for request health and the `/api/health` endpoint for uptime checks. Monitor Neon's dashboard for connections, storage, and slow queries. Recommended additions: an uptime monitor hitting `/api/health` and alerting, plus error tracking (e.g., Sentry) wired into actions and route handlers.

## 10. Updating dependencies

1. Create a branch. 2. `npm outdated` to review. 3. Update in small batches (patch/minor first). 4. Run `npm run typecheck && npm run lint && npm run test && npm run build`. 5. Deploy a preview and smoke-test. Take special care with `next`, `next-auth`, and `prisma` major bumps — read their migration guides and test auth and a migration end to end.

## 11. Database migrations

- **Develop:** edit `schema.prisma`, then `npx prisma migrate dev --name <change>` (creates a migration + regenerates the client).
- **Deploy:** `npx prisma migrate deploy` against the production database (CI step or run locally with the prod `DATABASE_URL`).
- **Never** hand-edit applied migrations; create a new one.
- Always back up (below) before a production migration.
- *Sandbox note:* Prisma's engine download is blocked in some CI sandboxes; run generate/migrate where the engine binaries are reachable (developer machine or standard CI).

## 12. Scaling

- ~~Move rate limiting to a shared store~~ — done, using Postgres rather than Redis. A counter read a few times per user per day did not justify another account, key and dependency; `rateLimitShared()` does it in one atomic `INSERT … ON CONFLICT` statement. Verified: 10 concurrent callers against a limit of 4 admit exactly 4.
- Use Neon connection pooling; keep queries indexed (indexes already exist on hot foreign keys).
- Move file storage from Postgres bytes to object storage (S3/Supabase) for large files.
- Split dev and production databases.

## 13. Performance optimization

Prefer server components and narrow `select`s; batch independent queries with `Promise.all` (as the analytics and workspace libraries do); throttle background work (due-soon notifications are throttled per user); paginate long lists; and cache/`revalidatePath` deliberately after mutations.

## 14. Troubleshooting common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| "AI is not configured" | No provider key | Set `GEMINI_API_KEY` + `AI_PROVIDER` in `.env`/Vercel |
| AI 400/403 | Invalid key or API disabled | Recreate the Gemini key; enable the Generative Language API |
| Build fails at `prisma generate` | Engine download blocked | Build where engines are reachable; retry on real CI |
| Login loops / session issues | Missing `AUTH_SECRET` / wrong `AUTH_URL` | Set both correctly and redeploy |
| Emails not sent | Email not configured | Set SMTP or Resend vars; feature is optional |
| Push not working | No VAPID keys | Generate and set VAPID env vars |
| 403 on a page | Not a member/role for that resource | Expected — isolation is enforced |

## 15. Backup procedures

Neon provides automated backups and point-in-time restore. Additionally, before each production migration take a logical dump:

```
pg_dump "$DATABASE_URL" -Fc -f engisync-$(date +%F).dump
```

Store dumps securely off-platform and test a restore periodically.

## 16. Disaster recovery

1. Provision a database (Neon PITR or a fresh instance). 2. Restore the latest dump (`pg_restore`) or use PITR to just before the incident. 3. Run `npx prisma migrate deploy`. 4. Redeploy the app. 5. Verify `/api/health`, log in, and spot-check a group and the documentation module. Document the incident and root cause.

## 17. Security updates

Run `npm audit` regularly; patch promptly. Rotate `AUTH_SECRET`, database credentials, and API keys on any suspected exposure (see the System Configuration Guide for rotation steps). Keep dependencies — especially `next` and `next-auth` — current. Review the audit log after security events.

## 18. Release process

1. Branch and implement. 2. `typecheck`, `lint`, `test`, `build` all green. 3. Open a PR; review for security, isolation, and error handling. 4. If the change includes schema edits, ensure the migration is included and back up production. 5. Merge → Vercel deploys → run `prisma migrate deploy` if needed → verify `/api/health` and the affected feature. 6. Update the Change Log in the SRS.

## 19. Extending the app (recipe for a new feature)

1. Add/adjust models in `schema.prisma`; create a migration.
2. Write a domain module in `src/lib/<feature>.ts` (pure logic + guards).
3. Add a route folder under `src/app/dashboard/<feature>` with a page, colocated `actions.ts`, and client components.
4. Enforce isolation: resolve the caller's membership/role before returning or mutating anything.
5. Add unit tests for the new library logic.
6. Wire navigation in `src/components/nav-items.ts` if it needs a sidebar entry.
7. Run the full gate (typecheck/lint/test/build) and ship.

## 20. Maintenance checklist (recurring)

- Weekly: review logs and error tracker; check `/api/health`; triage `npm outdated`/`npm audit`.
- Before each release: back up production; run the full gate; confirm migrations.
- Monthly: test a database restore; rotate any keys nearing policy limits; review audit logs.
