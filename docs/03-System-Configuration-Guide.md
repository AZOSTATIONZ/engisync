# EngiSync — System Configuration Guide

**Audience:** Anyone setting up EngiSync for local development or deployment.
**Security note:** This guide never contains real secrets. It explains **where** each value is configured and **how** to set, replace, or rotate it. Actual keys live only in `.env` (local, git-ignored) or in your host's environment/secret manager (production).
**Last updated:** 26 July 2026

---

## 1. Project setup (quick start)

```
git clone <repo> && cd engisync
npm install
cp .env.example .env       # then fill in values (see below)
npx prisma migrate dev     # creates the database schema + generates the client
npm run db:seed            # optional: demo data
npm run dev                # http://localhost:3000
```

## 2. Folder explanations

| Path | What it holds |
|---|---|
| `prisma/` | `schema.prisma` (data model), `migrations/`, `seed.ts` |
| `src/app/(auth)/` | login, register, forgot, reset, verify pages |
| `src/app/api/` | route handlers (auth, files, share, push, health, register) |
| `src/app/dashboard/` | one folder per feature (workspaces, tasks, supervisor, …) |
| `src/components/` | shared and feature UI components |
| `src/lib/` | domain logic — one module per feature |
| `src/auth.ts` | Auth.js configuration |
| `public/` | static assets and the push service worker |
| `docs/` | this documentation set |
| `.env` | **your secrets (never committed)** |
| `.env.example` | template listing every variable with blank values |

## 3. Required software

- **Node.js 20 LTS or newer** (Next.js 15 / React 19).
- **npm** (bundled with Node) — the project's package manager.
- **PostgreSQL** — a hosted Neon/Supabase database, or local Postgres for offline dev.
- **Git**.
- Optional: **Docker** (a `Dockerfile` and `docker-compose.yml` are provided).

## 4. Required accounts

You can run the core app with only a database. Optional integrations need free accounts:

- **Neon** (or Supabase/Railway) — PostgreSQL database.
- **Google AI Studio** — free Gemini API key for AI features.
- **Google Cloud / Microsoft Entra** — OAuth client IDs (only if enabling social login).
- **Resend** *or* any SMTP provider (e.g., a Gmail App Password) — email.
- **Vercel** — hosting.

## 5. PostgreSQL setup

1. Create a database (Neon dashboard → new project, or `createdb engisync` locally).
2. Copy the connection string into `DATABASE_URL` in `.env`.
3. Run `npx prisma migrate dev` to create the schema.
- **Where it lives:** `DATABASE_URL` in `.env` (local) and in Vercel → Settings → Environment Variables (production).
- **Rotate:** change the database password in Neon, update `DATABASE_URL` in both places, redeploy.

## 6. Supabase setup (optional alternative)

Supabase can provide both PostgreSQL and file storage. To use its database, paste the Supabase Postgres connection string into `DATABASE_URL`. (File storage currently uses Postgres bytes; migrating to Supabase Storage is a future improvement — see the SRS.)

## 7. Firebase setup (optional)

Firebase Cloud Messaging can be used for push in place of the built-in Web Push. The current implementation uses the standard Web Push (VAPID) API, so Firebase is **not required**. If you later adopt FCM, store its server key and config in environment variables — never in source.

## 8. Node.js version

Use Node 20 LTS+. Set it with `nvm use 20` or an `.nvmrc`. Vercel's project settings pin the Node runtime for production builds.

## 9. Package manager

npm. Common commands: `npm install`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run db:seed`.

## 10. Environment variables (where each lives and how to set it)

All values are read from the environment. Local values go in `.env`; production values go in **Vercel → Settings → Environment Variables**. The template is `.env.example`.

**Database**
- `DATABASE_URL` — PostgreSQL connection string.

**Authentication**
- `AUTH_SECRET` — random session-signing secret. Generate with `npx auth secret` (or `openssl rand -base64 32`).
- `AUTH_URL` / `NEXTAUTH_URL` — the app's base URL (e.g., `https://engisync.vercel.app`).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from Google Cloud console (optional).
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` — from Microsoft Entra (optional).

**AI (free tier: Google Gemini)**
- `AI_PROVIDER` — `gemini` (or `openai` / `anthropic` / `local`).
- `GEMINI_API_KEY` — free key from Google AI Studio.
- Optional `AI_MODEL` — e.g., `gemini-1.5-flash`.

**Email (choose one path)**
- Resend: `RESEND_API_KEY`, `EMAIL_FROM`.
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

**Web push**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Generate once with `npx web-push generate-vapid-keys`.

> **Never commit `.env`.** It is git-ignored. Share configuration by giving teammates `.env.example` and asking them to obtain their own keys.

## 11. API keys — setting, replacing, rotating

1. **Set:** paste the value into `.env` (local) and add the same variable in Vercel (production).
2. **Replace:** overwrite the value in both places and redeploy.
3. **Rotate on compromise:** revoke the key in the provider's console, issue a new one, update `.env` + Vercel, redeploy, and (for `AUTH_SECRET`) expect existing sessions to be invalidated.

To activate AI specifically: get a free key at `https://aistudio.google.com/app/apikey`, set `GEMINI_API_KEY` in `.env` and Vercel, keep `AI_PROVIDER="gemini"`, redeploy.

## 12. Authentication providers

Credentials (email/password) work out of the box. To enable Google/Microsoft login, create an OAuth app in the respective console, add the redirect URL (`<AUTH_URL>/api/auth/callback/<provider>`), and set the client ID/secret env vars. TOTP two-factor needs no configuration — users enable it in Settings.

## 13. Email configuration

Pick **one** path. For a zero-cost start, use a Gmail **App Password** (not your normal password) with `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`. For a hosted option, create a Resend key. Set `EMAIL_FROM` to a sender you control. If neither is configured, email features quietly disable and the app still runs.

## 14. Push notifications

Run `npx web-push generate-vapid-keys` once, put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the private key in `VAPID_PRIVATE_KEY`, and a contact mailto in `VAPID_SUBJECT`. Users then opt in from Settings. Without VAPID keys, push is disabled gracefully.

## 15. Cloud storage

Files are currently stored in PostgreSQL (`FileResource.data` as bytes) — no extra configuration needed. To move to S3/Supabase Storage later, add the provider credentials as env vars and swap the storage functions in `src/lib/files.ts` (see Future Improvements in the SRS).

## 16. Deployment instructions

1. Push the repo to GitHub.
2. Import it in Vercel; set the environment variables listed above (Production and Preview).
3. Ensure the build command is `prisma generate && next build` (already the project default) and that `DATABASE_URL` points at the production database.
4. Apply migrations: run `npx prisma migrate deploy` against the production database (locally with the prod URL, or as a CI step).
5. Deploy. Verify `GET /api/health` returns OK and log in.

## 17. Where every important configuration lives (summary)

| Concern | File / location |
|---|---|
| All secrets (local) | `.env` (git-ignored) |
| Secret template | `.env.example` |
| Secrets (production) | Vercel → Settings → Environment Variables |
| Data model & migrations | `prisma/schema.prisma`, `prisma/migrations/` |
| Auth configuration | `src/auth.ts` |
| AI provider logic | `src/lib/ai.ts` (keys via env only) |
| Email logic | `src/lib/email.ts` (credentials via env) |
| Push logic | `src/lib/push.ts` (VAPID via env) |
| Build/scripts | `package.json` |

## 18. Verifying the setup

Run `npm run typecheck`, `npm run lint`, and `npm run test`; start `npm run dev`; register a user; create a department and a group; open the project documentation; and (if AI is configured) try an assistant feature. If AI shows "not configured," that is expected until `GEMINI_API_KEY` is set.
