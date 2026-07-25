# Deploying EngiSync

This guide gets EngiSync live on a public URL using **Vercel** (app) + **Neon**
(PostgreSQL). You already use Neon in development, so most of the work is
connecting a Git repo to Vercel and setting environment variables.

---

## 1. Push the code to GitHub

From `E:\claudecode` in PowerShell:

```bash
git init
git add .
git commit -m "EngiSync"
```

Create an empty repo at https://github.com/new (e.g. `engisync`), then:

```bash
git remote add origin https://github.com/<your-username>/engisync.git
git branch -M main
git push -u origin main
```

> `.env` is git-ignored, so your secrets are **not** pushed. Good.

---

## 2. Prepare the production database (Neon)

You can reuse your existing Neon project or create a dedicated branch/project
for production (recommended so test data stays separate).

1. In the Neon console, open your project and copy the **direct** connection
   string (same place you got it before).
2. Apply the schema to it from your machine:

   ```bash
   # point Prisma at the production DB just for this command
   $env:DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
   npx prisma migrate deploy
   ```

   `migrate deploy` applies your existing migrations without prompting. Run
   `npm run db:seed` too if you want the sample accounts in production.

---

## 3. Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub.
2. **Add New → Project → Import** your `engisync` repo.
3. Framework preset: **Next.js** (auto-detected). Leave build settings as-is —
   the build command is already `prisma generate && next build`.
4. Before deploying, add the **Environment Variables** below.
5. Click **Deploy**. You'll get a URL like `https://engisync.vercel.app`.

### Required environment variables

| Variable        | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| `DATABASE_URL`  | Your Neon connection string                                  |
| `AUTH_SECRET`   | Generate with `npx auth secret` (or `openssl rand -base64 32`) |
| `AUTH_URL`      | Your Vercel URL, e.g. `https://engisync.vercel.app`          |
| `NEXTAUTH_URL`  | Same as `AUTH_URL`                                           |

> Fastest path to a shareable link: point `DATABASE_URL` at the **same Neon
> database you've used in development** — it already has every table and the
> seed accounts, so no separate DB setup or migration is needed.

### Optional environment variables

| Variable                | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `AUTH_GOOGLE_ID/SECRET` | Google sign-in                           |
| `AUTH_MICROSOFT_ENTRA_ID_ID/SECRET/ISSUER` | Microsoft sign-in     |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | AI Assistant             |
| `AI_PROVIDER`, `AI_MODEL` | AI provider/model overrides            |
| `RESEND_API_KEY` or `SMTP_HOST/PORT/USER/PASS/SECURE` + `EMAIL_FROM` | Email (verification, reset, invites) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push (`npx web-push generate-vapid-keys`) |

All optional features degrade gracefully when their variables are absent — the
app runs fine without them.

---

## 4. OAuth redirect URIs (only if you use Google/Microsoft)

In each provider's console, add the production callback URL:

- Google: `https://<your-domain>/api/auth/callback/google`
- Microsoft: `https://<your-domain>/api/auth/callback/microsoft-entra-id`

Email/password login needs none of this.

---

## 5. Verify

- Visit `https://<your-domain>` — the landing page loads.
- Visit `https://<your-domain>/api/health` — should return `{"status":"ok"}`.
- Register or log in and click through the dashboard.

---

## 6. Ongoing deploys

Every `git push` to `main` triggers a new Vercel deploy automatically. When you
change the Prisma schema:

```bash
npx prisma migrate dev --name <change>   # locally, creates the migration
git add . && git commit -m "..." && git push
$env:DATABASE_URL="<prod url>"; npx prisma migrate deploy   # apply to prod
```

---

## Notes & limits

- **File storage:** uploaded files are stored in Postgres (max 10 MB each). This
  works on Vercel + Neon out of the box. For large-scale usage, move storage to
  S3 or Supabase Storage — the app's file layer (`src/lib/files.ts` + the
  download routes) is isolated so this is a contained change.
- **Rate limiting** is in-memory (per instance). On Vercel's serverless
  functions this is best-effort; for strict limits across instances, back
  `src/lib/rate-limit.ts` with Upstash Redis (same function signature).
- **Custom domain:** add it under Vercel → Project → Settings → Domains, then
  update `AUTH_URL` / `NEXTAUTH_URL` and OAuth redirect URIs to match.

---

## Alternative hosts

- **Railway / Render:** use the included `Dockerfile`. Set the same environment
  variables and run `npx prisma migrate deploy` as a release step.
- **Docker (local/VPS):** `docker compose up` (see `docker-compose.yml`) runs
  the app plus a Postgres container.
