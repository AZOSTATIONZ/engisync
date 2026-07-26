# EngiSync — Development Journal

**Purpose:** Explain the project from its beginning to today so a new engineer can understand *why* everything exists and *how* it fits together — not just *what* the code does.
**Last updated:** 26 July 2026

---

## Why this project was created

University engineering students run serious, multi-week group projects but coordinate them across disconnected tools: chat for talking, spreadsheets for money, email for files, and word processors for reports. None of these link effort to outcomes, none give a supervisor a live view, and none make individual contribution measurable. EngiSync was created to be the single place where engineering teams plan, build, document, and submit — and where supervisors review and sign off.

## The engineering problem it solves

The core problem is **coordination and accountability across a project lifecycle**. EngiSync ties together the whole chain: a department contains groups; a group has tasks, meetings, files, a budget, and a structured report; participation in those feeds analytics; and a supervisor reviews the structured report and approves milestones, the final report, and completion. Everything a lecturer needs to assess fairly is generated as a by-product of the team simply doing its work.

## Major features implemented (in the order they were built)

1. **Foundation** — Next.js App Router scaffold, TypeScript, Tailwind, base UI, theming, Docker, env, README.
2. **Authentication** — Auth.js with credentials + OAuth scaffolding, JWT sessions.
3. **Group workspaces** — create/join with codes, PINs, QR, invites; member management.
4. **Task & routine management** — priorities, deadlines, assignments, dependencies, recurring tasks, live time tracking.
5. **Calendar & notifications** — unified deadlines/meetings/countdowns and an in-app notification centre.
6. **Secure file sharing** — uploads with expiring/one-time links and download audit logs.
7. **Meetings & attendance** — provider links, quick-start, check-in/attendance.
8. **Budget** — EcoCash and other contributions, expenses, budget health.
9. **AI assistant** — provider-agnostic layer with summaries, task generation, and guidance.
10. **Mobile optimisation, testing, security & deployment** — responsive polish, rate limiting, tests, Vercel + Neon deploy.

**Enhancement backbone (after the 10 phases):** departments layer and department-scoped isolation; secure group access (caps, approval, invites, duplicate detection); advanced analytics; email (SMTP/Resend); web push (VAPID); auth hardening (password UX, reset, verification, 2FA/TOTP); cross-department collaboration; premium UI with toasts and animated backgrounds; discussions; quizzes; group-leader coordination tools; one-department-per-user rule; projects module; AI foundation (multi-provider + admin toggle + subscription plans + gating); AI Mentor, Meeting Assistant, and Supervisor Q&A; onboarding checklist and project templates.

**Latest work (v1.0):** the Supervisor Project Review module (22-section documentation, per-section approvals/comments/corrections, document lock, report versioning, revision compare, downloads); Lecturer Analytics with printable reports; the AI provider fix (Google Gemini free tier); inactive-member detection; a larger responsive menu; and this documentation set.

## Technologies introduced and why

- **Next.js App Router + React 19** — one framework for UI, server rendering, actions, and API routes; minimises moving parts for a small team.
- **TypeScript** — end-to-end type safety catches errors before runtime.
- **Prisma + PostgreSQL** — typed schema, migrations, and a single safe data gateway; Postgres is robust and free-tier friendly (Neon).
- **Auth.js (NextAuth v5)** — batteries-included auth with providers, sessions, and adapters.
- **Tailwind + shadcn-style primitives** — fast, consistent, accessible UI without a heavy component runtime.
- **Zod** — declarative validation shared between actions.
- **recharts** — charts for analytics with minimal glue.
- **web-push / nodemailer / otpauth / qrcode** — focused libraries for push, email, TOTP, and QR, each optional.
- **Vitest** — fast unit testing aligned with the Vite/TS ecosystem.

## How the modules communicate

The UI (server components) reads data through domain libraries in `src/lib`. User actions call **Server Actions** which authenticate, authorize, validate, then call the same domain libraries, which use the Prisma client. Modules connect through shared entities: participation reads tasks and time logs; analytics reads tasks, meetings, files, budget, and documentation; the supervisor module reads the same workspace a member edits, but through supervisor-role checks. Notifications are a shared service any module can call. Nothing in the UI touches the database directly.

## Database evolution

The schema grew feature-by-feature through 21 migrations, from users/workspaces/tasks to departments, meetings, budget, collaboration, AI evaluation, the projects module, and finally structured documentation and review (ProjectDocument, DocumentSection, SectionComment, ReportVersion) plus milestone/completion approval fields. It now holds 41 models. Each schema change shipped as its own migration so history is reproducible.

## Authentication implementation

Credentials are hashed with bcrypt; sessions use the JWT strategy with `trustHost`. Email verification and password reset use single-use, expiring tokens. Optional TOTP two-factor adds a second step at login. OAuth (Google, Microsoft) is wired for future enablement. Every server page and action reads the session via `auth()`.

## User roles

Guest, Individual User, Group Member, Group Leader, Department Admin, Supervisor/Lecturer, and Administrator. Roles are enforced per resource on the server (membership, department role, supervisor check, or admin flag) — never trusted from the client.

## Folder structure

Feature-sliced: each feature is a route folder under `src/app/dashboard/<feature>` with colocated actions and client components, backed by a `src/lib/<feature>.ts` domain module. Shared UI lives in `src/components`; ambient types in `src/types`; auth config in `src/auth.ts`; database schema and migrations in `prisma/`.

## API integrations

- **AI** — a single provider-agnostic HTTP layer (`src/lib/ai.ts`) speaks to Gemini, OpenAI, Anthropic, or a local OpenAI-compatible endpoint; the provider is chosen by env.
- **Email** — SMTP (e.g., Gmail app password) or Resend.
- **Web push** — VAPID keys for browser notifications.
- **Meeting providers** — Google Meet/Zoom/Teams links are stored and launched (link-based integration).

## AI integration

AI is deliberately swappable and optional. `getProvider()` auto-detects whichever key is present (or honours `AI_PROVIDER`), and `chatComplete()` calls the right HTTP API. A central gate (`canUseAI`) checks an admin switch, provider configuration, and the user's subscription plan/usage before any call. The current free provider is **Google Gemini** (`gemini-1.5-flash`); switching to a paid provider is an environment change with no code edits.

## Notification system

In-app notifications are created by any module (e.g., approvals, nudges, join requests) via a shared `createNotification`. Optional channels layer on top: web push (VAPID) and email. Due-soon reminders are generated on a throttled schedule to avoid heavy repeated queries.

## Budget module

Tracks member **contributions** (EcoCash and other methods) and **expenses** against an optional target, and computes budget health (healthy / underfunded / over budget) that feeds the analytics report.

## Meeting system

Meetings carry a provider and join URL, start/end times, optional AI-generated minutes, and per-member attendance with check-in. Attendance feeds participation and the lecturer report.

## Analytics

Two layers: the student/group analytics dashboard, and the **lecturer analytics report** (`src/lib/lecturer-analytics.ts`) which computes overall, team, and per-individual metrics and scores across selectable time ranges and renders a printable report.

## Security implementation

HTTPS, bcrypt, JWT, TOTP, Zod validation, Prisma-parameterised queries, output escaping in generated HTML, in-memory rate limiting, audit logging, expiring secure file links, and strict department/group isolation enforced at the data layer.

## Deployment progress

Deployed to Vercel with a Neon PostgreSQL database and live at the project's Vercel URL. Builds run `prisma generate && next build`; `git push` redeploys. Migrations are applied with Prisma.

## Current development status

Phases 1–4 of the current roadmap are complete: (1) AI unblock + responsive menu + inactive-member detection; (2) Supervisor Review core; (3) Supervisor Review advanced (versioning, approvals, compare, downloads); (4) Lecturer Analytics + printable reports. Phase 5 (this documentation set) is being finalised.

## Outstanding tasks

- Apply the pending database migrations on the deployment (documentation/review models).
- Add a real Gemini key to `.env` and Vercel to activate AI.
- Optional: split dev/prod databases; move file storage to object storage; add a shared rate-limit store.

## Next milestones

Real payments (Stripe/Paynow), multi-university tenancy, a RAG knowledge base over project files, richer diff visualisation, and native mobile clients.

## A note for new engineers

Start by reading `prisma/schema.prisma` (the domain), then `src/lib/` (the logic), then a feature slice under `src/app/dashboard/` to see how a page, its actions, and its library connect. The golden rules: UI never touches the database; every action authenticates, authorizes, and validates; and no user ever sees data for a group or department they are not part of.
