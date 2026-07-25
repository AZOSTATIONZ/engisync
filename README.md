# EngiSync

A collaboration & productivity platform purpose-built for **university engineering students** — manage individual work, group projects, resources, meetings, budgets, and more, with an AI assistant on top.

> **Status:** Phase 1 (Foundation) complete — project scaffold, authentication, role-based access control, data model, and the base UI shell with dark/light mode. Later phases (workspaces, tasks, calendar, files, meetings, budget, AI) build on this base.

## Tech stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Framework  | Next.js 15 (App Router) + React 19 + TypeScript         |
| Styling    | Tailwind CSS + shadcn/ui-style primitives + next-themes |
| Auth       | Auth.js (NextAuth v5) — Credentials, Google, Microsoft  |
| Database   | PostgreSQL + Prisma ORM                                 |
| Security   | bcrypt hashing, RBAC, security headers, audit logs      |
| Testing    | Vitest                                                  |
| Tooling    | ESLint, Prettier, Docker, GitHub Actions CI             |

## Getting started

### 1. Prerequisites

- Node.js 22+
- A PostgreSQL database (local, or Docker via `docker-compose`, or Supabase/Railway)

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# then edit .env — at minimum set DATABASE_URL and AUTH_SECRET
# generate a secret:  openssl rand -base64 32
```

### 4. Database

```bash
# Option A — spin up Postgres with Docker
docker compose up -d db

# Create tables and generate the Prisma client
npx prisma migrate dev --name init
npm run prisma:generate

# Seed sample users + a workspace
npm run db:seed
```

Seeded accounts (all share the password `Password123!`):

| Role         | Email                  |
| ------------ | ---------------------- |
| Admin        | admin@engisync.dev     |
| Group leader | leader@engisync.dev    |
| Member       | member@engisync.dev    |

### 5. Run

```bash
npm run dev
# http://localhost:3000
```

## Available scripts

| Script              | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the dev server                 |
| `npm run build`     | Generate Prisma client + build       |
| `npm start`         | Run the production build             |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | TypeScript type check                |
| `npm test`          | Run unit tests (Vitest)              |
| `npm run db:seed`   | Seed the database                    |
| `npm run format`    | Prettier                             |

## Project structure

```
prisma/
  schema.prisma        # Data model (users, roles, workspaces, audit log)
  seed.ts              # Seed data
src/
  app/
    (auth)/            # Login & register (public)
    dashboard/         # Protected app shell + module routes
    api/
      auth/[...nextauth]/  # Auth.js handler
      register/            # Registration endpoint
  components/          # Navbar, sidebar, theming, UI primitives
    ui/                # Button, Input, Label, Card
  lib/
    prisma.ts          # Prisma client singleton
    rbac.ts            # Role-based access control helpers
    validations.ts     # Zod schemas
    utils.ts           # Helpers
  auth.ts / auth.config.ts   # Auth.js configuration
  middleware.ts        # Route protection
```

## Roles

- **Guest** — unauthenticated, landing page only.
- **Individual** — standard authenticated user.
- **Group Leader / Member** — workspace-scoped roles (per-workspace membership).
- **Admin** — system administration.

## Security

HTTPS-ready with strict security headers, JWT sessions, RBAC on every mutation,
bcrypt password hashing (cost 12) and bcrypt-hashed workspace PINs, Zod input
validation everywhere, an `AuditLog` table for sensitive actions, and in-memory
rate limiting on registration, public file-share downloads, and AI requests.
Temporary file-share links enforce expiry, download caps, and revocation. 2FA
fields are modelled for a future phase.

A liveness/readiness probe is available at `/api/health`.

## Testing

```bash
npm test        # Vitest unit tests (RBAC, validations, rate limiting, AI parsing, recurrence)
npm run typecheck
```

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for a step-by-step Vercel + Neon guide
(also covers Railway/Render via the included Dockerfile).

## Deployment

- **Frontend/app:** Vercel (or Docker via the included `Dockerfile`).
- **Database:** Supabase / Railway / Render PostgreSQL.
- Set the environment variables from `.env.example` in your hosting provider.

## Roadmap

1. ✅ Foundation — auth, roles, data model, UI shell
2. ✅ Group Workspaces — create/join, join codes, PINs, QR codes, member management
3. ✅ Task Management — priorities, deadlines, assignments, dependencies, recurring tasks, time tracking
4. ✅ Calendar & Notifications — month calendar, events, deadline countdowns, in-app + desktop reminders
5. ✅ Secure File Sharing — resource library, uploads, temporary expiring share links, audit logs
6. ✅ Meetings & Attendance — scheduled meetings, Meet/Zoom/Teams links, self check-in, attendance rosters
7. ✅ Budget Management — per-workspace contributions (EcoCash/OneMoney/InnBucks/cash/bank), expenses, targets, per-member breakdown
8. ✅ AI Assistant — summarize, generate tasks, detect risks, engineering Q&A (Anthropic or OpenAI)
9. ✅ Mobile Optimization — mobile drawer nav, responsive polish, live Start/Stop task timer
10. ✅ Testing, Security & Deployment — unit tests, rate limiting, health check, Vercel + Neon guide

## License

MIT
