# EngiSync

A project management and collaboration platform for university engineering students. Groups coordinate deadlines, budgets, meetings, file sharing and task assignments in one place, with an AI assistant for engineering Q&A and project analysis.

**Live at [engisync.co.zw](https://engisync.co.zw)**

## What it does

Engineering students work in groups of 4–8 on capstone and semester projects. They currently juggle WhatsApp, Google Drive, spreadsheets and memory. EngiSync replaces that with a single workspace per project:

- **Tasks** — assign work, set priorities and deadlines, track dependencies, log time, handle recurring items
- **Calendar** — month view with events, deadline countdowns, in-app and desktop reminders
- **Meetings** — schedule with Google Meet / Zoom / Teams links, self check-in attendance, rosters
- **File sharing** — resource library with uploads, temporary expiring share links, download caps, audit trail
- **Budget tracking** — contributions via EcoCash, OneMoney, InnBucks, cash or bank transfer; expenses, targets, per-member breakdown
- **AI assistant** — summarise documents, generate task lists, flag risks, answer engineering questions (Claude or GPT, admin-toggled)
- **Project Hub** — a browsable catalog of past and reference projects with parts lists, budgets and documentation, organised by engineering discipline
- **Supervisor view** — lecturers can review progress and leave feedback without joining the group

### Installable as a phone app

EngiSync is a PWA. On Android the browser offers an install prompt; on iOS it guides users to Safari's Add to Home Screen. Once installed it opens without browser chrome, caches build assets to save mobile data, and delivers push notifications for deadlines.

### Theming

20 visual styles (Midnight, Aero Glass, Neo-Brutalism, etc.) with light and dark modes. Every style is contrast-checked to WCAG 2.2 AA across all surfaces — body text, buttons, sidebars, banners. Students pick a personality in Settings → Appearance; the choice persists to their account.

## Tech stack

| Layer | What |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5.7 |
| Styling | Tailwind CSS 3.4, CSS custom properties as design tokens, next-themes |
| Auth | Auth.js v5 — credentials, Google OAuth, Microsoft Entra |
| Database | PostgreSQL on Neon, Prisma 6 ORM |
| Hosting | Vercel (with deploy-time migrations) |
| Testing | Vitest — 25 test files, 600+ assertions |
| PWA | Custom service worker, web app manifest, push notifications |

## Getting started

**Prerequisites:** Node.js 22+, a PostgreSQL database.

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and AUTH_SECRET at minimum
npx prisma migrate dev
npm run db:seed
npm run dev             # http://localhost:3000
```

See `.env.example` for the full list of environment variables. At minimum you need `DATABASE_URL` and `AUTH_SECRET` (generate one with `openssl rand -base64 32`).

### Seed accounts

The seed script (`npm run db:seed`) creates test accounts for local development. See `prisma/seed.ts` for the credentials — they are not listed here.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Prisma generate + Next.js production build |
| `npm run vercel-build` | Build with deploy-time database migration (Vercel only) |
| `npm test` | Run all tests |
| `npm run typecheck` | TypeScript type check (tsc does not run during vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run db:seed` | Seed sample data |
| `npm run db:anonymise` | Anonymise production data for local dev (never runs against prod by design) |

## Project layout

```
src/
  app/
    (auth)/                 # Login, register (public)
    (public)/               # Landing page, offline fallback
    dashboard/
      my-work/              # Personal task view
      tasks/                # Full task board
      calendar/             # Month calendar + events
      meetings/             # Scheduling, attendance
      repository/           # File sharing + resource library
      departments/          # Discipline pages (Civil, Electrical, etc.)
      assistant/            # AI chat
      settings/appearance/  # Theme picker
      supervisor/           # Lecturer feedback view
      admin/                # System administration
      profile/              # User profile
    api/                    # Auth handler, health check
  components/               # Navbar, sidebar, install prompt, UI primitives
  lib/
    themes.ts               # 20 theme definitions + contrast utilities
    contrast.ts             # WCAG contrast computation
    prisma.ts               # Database client singleton
    rbac.ts                 # Role-based access control
    validations.ts          # Zod schemas
prisma/
  schema.prisma             # Data model
  migrations/               # Migration history
public/
  icons/                    # PWA icons (192, 512, maskable)
  img/                      # Discipline hero images
  sw.js                     # Service worker
docs/                       # Full documentation set (SRS, user manual, maintenance, etc.)
```

## Security

- HTTPS with strict security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- JWT sessions via Auth.js, RBAC enforced on every server action
- bcrypt password hashing (cost 12), bcrypt-hashed workspace PINs
- Zod validation on all inputs
- Audit log table for sensitive actions
- Rate limiting on registration, file downloads, and AI requests
- Temporary file-share links with expiry, download caps, and revocation
- Service worker caches only immutable build assets — no user data, no HTML — to prevent data leakage on shared devices
- Health probe at `/api/health`

## Testing

```bash
npx tsc --noEmit       # type check first — vitest does not typecheck
npx next lint
npm test
npm run build
```

Run them in this order. Twice in this project a change passed lint and all tests while failing typecheck, because vitest executes TypeScript without checking it.

Do not run `npm run build` while `npm run dev` is running — the dev server locks `query_engine-windows.dll.node` and `prisma generate` fails.

25 test files covering RBAC, input validation, rate limiting, AI response parsing, recurrence logic, theme contrast (every style × every mode × every surface), motion tokens, typography wiring, hero image scrim compositing, and CSS regression checks.

## Deployment

Production runs on **Vercel** with a **Neon** PostgreSQL database. Pushing to `main` triggers a build that runs `prisma migrate deploy` before `next build` — migrations happen during the build, before the new deployment is promoted. See [docs/DEPLOY.md](docs/DEPLOY.md) for the full runbook including rollback procedures.

The domain **engisync.co.zw** is registered through Webzim (ZISPA registrar), with DNS pointing at Vercel.

## Documentation

The `docs/` directory has the full documentation set:

1. [SRS & Technical Documentation](docs/01-SRS-and-Technical-Documentation.md)
2. [Development Journal](docs/02-Development-Journal.md)
3. [System Configuration Guide](docs/03-System-Configuration-Guide.md)
4. [User Manual](docs/04-User-Manual.md)
5. [Maintenance Manual](docs/05-Maintenance-Manual.md)
6. [Security & Architecture Audit](docs/06-Security-and-Architecture-Audit.md)
7. [Product Specification](docs/07-Product-Specification.md)
8. [Architecture Continuation](docs/08-Architecture-Continuation.md)

## License

MIT
