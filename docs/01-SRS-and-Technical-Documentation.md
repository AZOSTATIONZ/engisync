# EngiSync — Software Requirements Specification & Technical Documentation

**Version:** 1.0
**Last updated:** 26 July 2026
**Status:** Living document
**Audience:** Engineers, reviewers, supervisors, and technical stakeholders

---

## 1. Executive Summary

EngiSync is a production web application that helps university engineering students plan, execute, document, and submit individual and group projects, and helps lecturers/supervisors review and grade that work. It unifies task management, calendars, meetings, secure file sharing, budgeting (including Zimbabwe EcoCash contributions), analytics, an AI assistant, structured project documentation, and a supervisor review workflow in a single, role-aware platform.

The system is built on a modern TypeScript stack (Next.js App Router, React 19, Prisma, PostgreSQL, Auth.js) and is deployed to Vercel with a Neon Postgres database. It is modular: every advanced capability (AI, email, push notifications) degrades gracefully when its provider is not configured, so the core product runs with zero paid dependencies.

## 2. Problem Statement

Engineering students coordinate complex, multi-week group projects across fragmented tools — chat apps for discussion, spreadsheets for budgets, email for files, separate calendars for deadlines, and word processors for reports. Nothing links participation to deliverables, supervisors have no live view of progress, and contribution is hard to measure fairly. EngiSync consolidates this into one system where work, communication, documentation, and assessment are connected and auditable.

## 3. Purpose

The purpose of EngiSync is to provide a single, secure, role-based platform that:

- lets students organise individual and group engineering work end to end;
- gives group leaders coordination and access-control tools;
- gives supervisors a live, read-only review surface with structured sign-off; and
- produces evidence (analytics, version history, audit logs) that supports fair assessment.

## 4. Objectives

1. Reduce tool fragmentation by unifying tasks, calendar, meetings, files, budget, and documentation.
2. Make project progress and individual contribution measurable and transparent.
3. Provide a formal supervisor review and approval workflow with document versioning.
4. Keep the platform affordable to operate (free tiers throughout; AI optional).
5. Enforce strict data isolation between departments and groups.
6. Remain production-grade: typed, tested, secure, documented, and deployable via CI/CD.

## 5. Scope

**In scope:** authentication and account security, departments and group workspaces, task and routine management, calendar and notifications, secure file sharing, meetings and attendance, budgeting, analytics, AI assistant features, structured 22-section project documentation, supervisor review/approval/versioning, lecturer analytics reports, and an admin panel.

**Out of scope (current release):** native mobile apps, real payment processing/settlement, multi-university tenancy, and a retrieval-augmented AI knowledge base. These are noted in Future Improvements.

## 6. Functional Requirements

**Accounts & auth.** Email/password registration with email verification; login with optional TOTP two-factor; password reset; OAuth (Google, Microsoft) scaffolding; secure JWT sessions.

**Departments.** Users join one engineering department; admins manage members and roles (Admin, Member, Supervisor); department announcements; strict non-member isolation.

**Group workspaces.** Create/join via code, PIN, invite link, or QR; member caps and approval mode; leader coordination tools (roles, promote/demote, nudges); duplicate-membership detection; optional starter templates seeding milestones/deliverables.

**Tasks & routines.** Priorities, deadlines, assignments, dependencies, recurring tasks, and live time tracking.

**Calendar & notifications.** Unified deadlines/meetings/countdowns; in-app notifications; optional email and web-push reminders.

**Files.** Upload, share with expiring/one-time secure links, download with audit logging.

**Meetings & attendance.** Schedule sessions with provider links (Meet/Zoom/Teams), quick-start, and attendance/check-in tracking.

**Budget.** Contribution tracking (EcoCash and others), expenses, and budget health.

**Analytics.** Project health, workload, burndown, participation, and AI insights.

**AI assistant.** Provider-agnostic summaries, task generation, risk detection, document summarisation, mentor alerts, meeting minutes, project evaluation, and supervisor Q&A — all gated by an admin switch and subscription plan.

**Project documentation.** A fixed 22-section engineering document per group, editable by members.

**Supervisor review.** Per-section comments, approvals, and correction requests; document lock/unlock; report version snapshots with revision comparison; milestone, final-report, and completion approval; document download.

**Lecturer analytics reports.** On-demand overall/team/individual metrics with daily/weekly/monthly/semester/final ranges and printable PDF output.

**Admin panel.** Global AI toggle and app settings.

## 7. Non-Functional Requirements

- **Security:** HTTPS, hashed passwords (bcrypt), JWT sessions, RBAC, input validation (Zod), rate limiting, audit logging, and per-request authorization checks.
- **Performance:** server components and targeted queries; throttled background work (e.g., due-soon notification generation).
- **Reliability:** graceful degradation when optional providers are absent; idempotent document seeding.
- **Accessibility:** semantic HTML, keyboard-operable controls, dark/light themes, responsive layouts.
- **Maintainability:** clean architecture, SOLID-oriented libs, typed end to end, unit tests for critical logic.
- **Portability:** Dockerfile provided; environment-variable driven configuration.

## 8. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3, shadcn-style UI primitives, lucide-react icons |
| Auth | Auth.js (NextAuth v5 beta), bcryptjs, otpauth (TOTP) |
| ORM / DB | Prisma 6 / PostgreSQL (Neon) |
| Server logic | Next.js Server Actions + Route Handlers |
| Realtime/notify | in-app notifications, web-push (VAPID), nodemailer/Resend email |
| AI | provider-agnostic HTTP layer (Gemini/OpenAI/Anthropic/local) |
| Charts | recharts |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Vercel (app) + Neon (DB) |

## 9. Software Architecture

EngiSync follows a layered, modular monolith pattern inside a single Next.js application:

1. **Presentation** — React Server Components render pages; small Client Components handle interactivity (forms, toasts, charts).
2. **Application/actions** — Server Actions and Route Handlers accept input, authenticate, authorize, validate (Zod), and orchestrate.
3. **Domain libraries** (`src/lib/*`) — pure, testable functions encapsulating business logic per module (workspace, task, documentation, supervisor, analytics, participation, etc.). Actions call these; UI never talks to the database directly.
4. **Data** — Prisma client (`src/lib/prisma.ts`) is the single database gateway; PostgreSQL is the store.

Cross-cutting concerns (RBAC, rate limiting, audit logging, notifications, AI gating) live in dedicated libraries and are composed into actions. Optional integrations are feature-flagged by environment presence.

## 10. System Design

Each feature is a vertical slice: a route folder under `src/app/dashboard/<feature>` (pages + colocated `actions.ts` + client components) backed by a `src/lib/<feature>.ts` domain module. Isolation is enforced at the data layer — every read/write first resolves the caller's membership/role for the target resource and returns empty/denied results otherwise. Supervisors access group data through `canSuperviseWorkspace` checks rather than membership, keeping student and supervisor paths separate.

## 11. Database Design

The schema contains 41 models. Core aggregates:

- **User** — identity, credentials, plan, 2FA, verification.
- **Department / DepartmentMember** — org unit and role (Admin/Member/Supervisor).
- **Workspace / WorkspaceMember** — group project and membership (Leader/Member), with join codes, PINs, caps, approval mode.
- **Task / TimeLog** — work items, dependencies, and logged time.
- **CalendarEvent, Meeting, Attendance** — scheduling and presence.
- **FileResource, ShareLink** — files and secure links.
- **Contribution, Expense** — budget.
- **Milestone, ProjectRisk, Deliverable, ProjectFeedback** — project management.
- **ProjectDocument, DocumentSection, SectionComment, ReportVersion** — structured documentation and review.
- **DiscussionThread/Message, Quiz/Question/Attempt** — collaboration.
- **AIEvaluation, AppSetting, Notification, AuditLog, PushSubscription** — supporting concerns.

## 12. ER Diagram (textual)

```
User 1─* WorkspaceMember *─1 Workspace *─1 Department
User 1─* DepartmentMember *─1 Department
Workspace 1─* Task *─1 User(assignee)
Task 1─* TimeLog *─1 User
Workspace 1─* Meeting 1─* Attendance *─1 User
Workspace 1─* FileResource 1─* ShareLink
Workspace 1─* Contribution / Expense
Workspace 1─* Milestone / ProjectRisk / Deliverable / ProjectFeedback
Workspace 1─1 ProjectDocument 1─* DocumentSection 1─* SectionComment
ProjectDocument 1─* ReportVersion
User 1─* Notification / AuditLog / PushSubscription
```

## 13. Folder Structure

```
engisync/
├─ prisma/                 # schema.prisma, migrations/, seed.ts
├─ src/
│  ├─ app/
│  │  ├─ (auth)/           # login, register, forgot, reset, verify
│  │  ├─ api/              # route handlers: auth, files, share, push, health, register
│  │  └─ dashboard/        # feature slices (workspaces, tasks, supervisor, …)
│  ├─ components/          # shared UI + feature components
│  ├─ lib/                 # domain logic (one module per feature)
│  ├─ types/               # ambient types (next-auth.d.ts)
│  └─ auth.ts              # Auth.js configuration
├─ public/                 # static assets (images, service worker)
├─ Dockerfile, docker-compose.yml
├─ docs/                   # this documentation set
└─ package.json, tsconfig.json, tailwind.config.ts
```

## 14. API Architecture

Two server-side mechanisms:

- **Server Actions** (colocated `actions.ts`) handle mutations invoked from forms/UI: create/join workspace, task CRUD, documentation edits/approvals, budget entries, etc. Each begins with authentication (`auth()`), authorization (membership/role check), and Zod validation.
- **Route Handlers** (`src/app/api/**` and feature `route.ts`) serve non-page responses: `GET /api/health`, authenticated file downloads, public share downloads, push subscription, documentation/report downloads, and the printable analytics report.

## 15. Authentication Flow

1. User registers → password hashed (bcrypt) → optional verification email sent.
2. Login → credentials verified → if 2FA enabled, TOTP code required → JWT session issued (`trustHost`, JWT strategy).
3. Session is read server-side via `auth()` in every page/action.
4. Password reset and email verification use single-use, expiring tokens.

## 16. Authorization Model (RBAC)

Roles: **Guest**, **Individual User**, **Group Member**, **Group Leader**, **Department Admin**, **Supervisor/Lecturer**, **Administrator**. Authorization is enforced per resource: workspace actions check `getMembership`/`isWorkspaceLeader`; department actions check department role; supervisor actions check `canSuperviseWorkspace`; admin actions check the admin flag. There is no client-trusted authorization — every mutation re-checks on the server.

## 17. Security Features

HTTPS everywhere; bcrypt password hashing; JWT sessions; TOTP 2FA; Zod validation on all inputs; parameterized queries via Prisma (SQL-injection safe); output escaping in generated HTML/report/download routes (XSS safe); CSRF mitigated by same-site/session model and action semantics; in-memory rate limiting on sensitive endpoints; audit logging of significant actions; expiring/one-time secure file links; strict department/group isolation.

## 18. Deployment Architecture

```
Browser ⇄ Vercel (Next.js app: SSR + Server Actions + Route Handlers)
                     │
                     └─⇄ Neon PostgreSQL (pooled connection)
Optional: Gemini API (AI), SMTP/Resend (email), Web Push (VAPID)
```

`git push` to the connected branch triggers a Vercel build (`prisma generate && next build`) and deploy. Database migrations are applied with `prisma migrate deploy` (CI) or `prisma migrate dev` (local).

## 19. Hosting

- **Application:** Vercel (serverless/edge Node runtime).
- **Database:** Neon (serverless PostgreSQL) — the same instance is used for dev and prod in the current setup; splitting is recommended (see Maintenance Manual).

## 20. Environment Variables

Configuration is entirely environment-driven. Keys are documented in `.env.example` and in the System Configuration Guide. **No secrets are committed.** Categories: database URL, Auth secret + OAuth client IDs/secrets, AI provider key (`GEMINI_API_KEY` + `AI_PROVIDER`), email (SMTP or Resend), and web-push VAPID keys.

## 21. Installation Guide

```
git clone <repo> && cd engisync
npm install
cp .env.example .env          # fill DATABASE_URL and AUTH_SECRET at minimum
npx prisma migrate dev        # create schema + generate client
npm run db:seed               # optional demo data
npm run dev                   # http://localhost:3000
```

## 22. Testing Strategy

Vitest covers the highest-risk pure logic: AI provider selection, rate limiting, RBAC, task rules, and validation schemas (see `src/lib/*.test.ts`). The testing pyramid favours fast unit tests on domain libraries, with server actions exercised via their libraries. Type-checking (`tsc --noEmit`) and linting (`next lint`) act as static gates. See the Maintenance Manual for the full strategy and how to extend coverage.

## 23. CI/CD

Vercel provides continuous deployment on push. The recommended pipeline runs, in order: install → `typecheck` → `lint` → `test` → `prisma migrate deploy` → build. Preview deployments are created for pull requests.

## 24. Future Improvements

Real payment processing (Stripe/Paynow), multi-university tenancy, a retrieval-augmented AI knowledge base over project files, native mobile apps, richer diff visualisation, and moving file storage from Postgres bytes to S3/Supabase Storage.

## 25. Known Limitations

- File binaries are stored in Postgres (`Bytes`) — fine for coursework scale, not for large media.
- AI features require a provider key; without one they are cleanly disabled, not broken.
- Rate limiting is in-memory (per instance) — a shared store (Redis) is advised at scale.
- Dev and prod currently share one database.

## 26. Maintenance Guide

See `05-Maintenance-Manual.md` for dependency updates, migrations, monitoring, troubleshooting, backups, disaster recovery, and the release process.

## 27. Backup Strategy

Neon provides automated backups and point-in-time restore. In addition, take a logical dump (`pg_dump`) before each production migration. Details in the Maintenance Manual.

## 28. Recovery Procedures

Restore from Neon PITR or the latest `pg_dump`, re-run `prisma migrate deploy`, redeploy the app, and verify `/api/health`. Full runbook in the Maintenance Manual.

## 29. Change Log

- **v1.0 (Jul 2026):** Supervisor Project Review module (22-section docs, approvals, versioning, compare, downloads); Lecturer Analytics + printable reports; AI unblocked on Google Gemini free tier; inactive-member detection; responsive menu enlargement; documentation set authored.
- **Earlier:** Foundation through deployment (10 phases) plus enhancement backbone — departments, secure access, analytics, email, push, auth hardening (2FA/verification/reset), collaboration, premium UI, discussions, quizzes, projects module, AI foundation.

## 30. Appendices

- **A. Glossary** — Workspace = group project; Department = engineering discipline; Supervisor = lecturer reviewer.
- **B. Related documents** — Development Journal, System Configuration Guide, User Manual, Maintenance Manual.
- **C. Standards** — Clean Architecture, SOLID, WCAG-aware UI, Conventional-style commits.
