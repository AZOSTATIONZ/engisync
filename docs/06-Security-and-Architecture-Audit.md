# EngiSync — Security & Architecture Audit

**Date:** 26 July 2026 · **Scope:** full stack (frontend, server actions, route handlers, database, auth, AI, files, notifications, analytics, workspaces, supervisor portal)
**Perspective:** senior architect + ethical hacker ("where would I attack first?")
**Verdict:** No critical secret exposure found. One **Critical** privacy defect and several **High** hardening gaps were found and fixed. Remaining items are listed as recommendations before large-scale production rollout.

---

## Executive summary

I attacked the app the way an outsider would: hunt for leaked credentials, then look for data belonging to other people, then try to bypass permissions, then try to burn the owner's money.

**The good news, verified not assumed:**
- `.env` is git-ignored and **has never been committed** (`git log -- .env` empty, not in `git ls-files`).
- **Zero** `NEXT_PUBLIC_*` secrets. **Zero** `process.env` references inside `"use client"` components — so no key can reach the browser bundle.
- AI keys were only ever read server-side. The architecture (server actions → domain libs → Prisma) already prevents client-side data access by construction.
- Authorization is consistently enforced at the **data layer** (`getMembership`, `isWorkspaceLeader`, `canSuperviseWorkspace`, `isDeptAdmin`), not in the UI — so hiding a button was never the security control.

**The bad news:** every user's **email address was rendered to every other member** of their department and group. That is the highest-severity finding and is now fixed.

---

## Findings

### CRITICAL

**C-1 — Personal data exposure: email addresses shown to all peers**
*Exploit:* Any student joins a department, opens the member list or a group page, and harvests the full name + email of every classmate and lecturer. No hacking required — just a browser. That is a mass-harvest vector for phishing and credential-stuffing, and for many institutions a data-protection breach.
*Where:* `departments/[id]/page.tsx` rendered `{m.email}` for every member; `workspaces/[id]/page.tsx` rendered `{m.user.email}`; a dozen more places used the pattern `user.name ?? user.email`, which silently leaked the address of anyone who hadn't set a display name.
*Fix:* Added `src/lib/identity.ts` with a single `displayName()` helper that **never** falls back to a raw address (it degrades to a masked handle). Replaced every unsafe fallback across departments, workspaces, meetings and tasks; removed the two literal email lines, replacing them with role/title text. Email is now visible **only** on the owner's own Settings page. Verified by grep: zero raw email renders remain in shared UI.

### HIGH

**H-1 — Missing Content-Security-Policy and HSTS**
*Exploit:* Without CSP, any successful XSS (e.g. via a future rich-text field) can exfiltrate session data to an attacker domain. Without HSTS, a first-visit request over HTTP is downgrade/MITM-able.
*Fix:* Added a strict CSP in `next.config.mjs` — `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` (modern clickjacking defence, alongside the legacy `X-Frame-Options`), plus HSTS (2 years, `includeSubDomains; preload`), `X-DNS-Prefetch-Control: off`, and an extended `Permissions-Policy`.

**H-2 — Authenticated API responses cacheable by shared caches**
*Exploit:* A CDN or corporate proxy could serve one student's authenticated response to another.
*Fix:* `Cache-Control: no-store, max-age=0` on all `/api/*` routes.

**H-3 — No account deletion; identity recycling possible (privacy/GDPR-class gap)**
*Exploit:* Users could not exercise deletion rights. Worse, had deletion existed naively, a deleted email could be re-registered immediately by anyone — inheriting the old identity in group histories (impersonation).
*Fix:* Full lifecycle in `src/lib/account-lifecycle.ts` — see "Account lifecycle" below.

**H-4 — Silent email-verification failure (previously fixed this session)**
*Exploit:* Unverified accounts accumulate; `.catch(() => {})` hid all failures, so operators had no signal.
*Fix:* Structured results, real logging, honest UI messaging.

### MEDIUM

**M-1 — AI cost/abuse exposure**
*Exploit:* An authenticated student could repeatedly trigger AI endpoints to burn the owner's API quota (a denial-of-wallet attack). Recommendations previously ran an AI call on **every page load** of the Resource Hub.
*Fix (already applied):* Recommendations no longer auto-spend — AI runs only on explicit user action. All AI passes through the central `canUseAI()` gate (admin switch → provider configured → plan/day quota via `rateLimit`). A master `AI_DISABLED` kill switch now hard-stops every provider call, and the key has been removed. **Current AI cost exposure: zero.**
*Note:* Prompt-injection risk is inherently limited here because AI output is never executed and never used to make authorization decisions — it only produces text and metadata that a human or a strict enum coercion consumes.

**M-2 — In-memory rate limiting doesn't hold across serverless instances**
*Exploit:* On Vercel, each instance keeps its own counter, so a distributed attacker gets N× the intended limit on login/register/AI endpoints.
*Recommendation (not yet implemented):* Move `src/lib/rate-limit.ts` to a shared store (Upstash Redis) before large-scale rollout. Acceptable at current scale; **required** at thousands of users.

**M-3 — File storage model**
*Exploit:* Files are stored as `Bytes` in PostgreSQL and served through authenticated routes. Positively, this means **uploaded files can never be executed** — there is no filesystem path and no static serving, which structurally eliminates the classic upload-to-RCE and path-traversal/overwrite classes. However it inflates DB size and memory per request.
*Recommendation:* Migrate to object storage (S3/Supabase) with signed URLs; add explicit MIME allow-listing and a per-file size cap (the global server-action limit is currently 10 MB).

### LOW

**L-1 — Session/device management not user-visible.** Users can't see or revoke other active sessions. *Recommendation:* add a session list in Settings. (Deletion already revokes everything.)
**L-2 — No account lockout after repeated failed logins.** Rate limiting mitigates but does not lock. *Recommendation:* progressive backoff + optional lockout with email alert.
**L-3 — Audit log coverage is partial.** Good on auth/workspace events; extend to documentation approvals and resource moderation.

### INFORMATIONAL

- **SQL injection:** Not applicable in practice — all access goes through Prisma's parameterised query builder; no raw SQL string concatenation exists in the codebase.
- **XSS:** React escapes by default. The two places that generate raw HTML (documentation download, printable report) use an explicit `esc()` escaper on all interpolated content — verified.
- **CSRF:** Next.js Server Actions are POST-only with same-origin enforcement and non-guessable action IDs; combined with `form-action 'self'` and same-site session cookies this is adequately mitigated.
- **SSRF:** No server-side fetch takes a user-supplied URL. Resource Hub submissions store URLs as data and render them as links — the server never fetches them. This is a deliberate design choice; if link-preview/validation is added later, it **must** use an allow-list and block private IP ranges.
- **IDOR:** Systematically tested by reading every `getX(id, userId)` accessor — each resolves the caller's membership/role before returning data, and returns `null`/empty rather than leaking existence. Supervisor access is a separate, explicitly checked path.
- **Dependency risk:** Run `npm audit` on a schedule; `next` and `next-auth` are the highest-value upgrade targets.

---

## Account lifecycle & identity security (new)

Implemented in `src/lib/account-lifecycle.ts` + Settings "Danger zone":

1. **Re-authentication** — password required; **TOTP also required** if 2FA is enabled.
2. **Explicit intent** — the user must type `DELETE`.
3. **Email confirmation** — a single-use token (1-hour expiry) is emailed; the account is destroyed only when that link is opened. Deletion is rate-limited (3 / 15 min) because a hijacked session is exactly when this gets abused.
4. **Orphan protection** — if the user is the **only leader** of a group that still has members, deletion is blocked until they promote a co-leader or delete the group. Re-checked at execution time to close the race window.
5. **Anonymise vs. delete** — personal data (sessions, OAuth accounts, push subscriptions, reset/verification tokens, learner profile) is destroyed. Shared academic records (report versions, supervisor feedback, section comments, submitted resources) are **anonymised to "Deleted user"** rather than removed, so a departing student cannot silently rewrite a group's assessment history. Audit-log targets are redacted.
6. **Session revocation** — all sessions and credentials are deleted, then the user is signed out.
7. **Anti-recycling** — the email is reserved for **30 days**, stored as a **SHA-256 hash, never plaintext**, so a third party cannot immediately re-register it and inherit the old identity. Registration now rejects reserved emails; active accounts already enforce email uniqueness.

---

## Mobile-first improvements

The app was desktop-shaped. Changes made:

- **Bottom navigation** (`src/components/bottom-nav.tsx`) — thumb-reachable access to Home / Tasks / Groups / Calendar on phones, with 56px touch targets (above the 44px guideline) and `env(safe-area-inset-bottom)` so it clears the iOS home indicator. Hidden at `md:` and up where the sidebar takes over.
- **Drawer fix** — the mobile menu was trapped inside the blurred header because `backdrop-filter` creates a containing block for fixed children; it now renders through a **portal** on `document.body`.
- **Responsive data** — the supervisor analytics table (10 columns) now renders as **one card per student** on mobile and a full table on desktop. This is the pattern to apply to any future wide table.
- **Layout breathing room** — main content gets `pb-24` on mobile so the bottom bar never covers content.
- Earlier in this engagement: larger sidebar/menu targets and typography scaling by breakpoint.

---

## Architecture review

**Scalable?** Mostly. The stateless Next.js app scales horizontally on Vercel; PostgreSQL/Neon is the bottleneck to watch. Two changes are needed before thousands of concurrent users: shared-store rate limiting (M-2) and object storage for files (M-3). Queries already use targeted `select`s, batch with `Promise.all`, and index hot foreign keys.

**Maintainable?** Yes, and deliberately so. The one-way dependency rule — UI → server action → domain library → Prisma — is consistently followed, and the feature-slice layout means a new engineer can find everything for a feature in two places. `src/lib/identity.ts` is a good example of the pattern to keep using: centralise a cross-cutting rule so it can't be violated file-by-file.

**Unnecessary complexity / duplication?** Some overlap exists between the group **Analytics** dashboard and the supervisor **Analytics report**; they serve different audiences but share concepts. Worth consolidating the metric computation into one module later rather than maintaining two definitions of "productivity".

**Secure?** After this pass, materially yes for a university deployment. The defence-in-depth story is now: authenticate → authorize at the data layer → validate with Zod → rate limit → CSP/HSTS headers → audit log.

---

## Recommended before production rollout

| Priority | Action |
|---|---|
| 1 | Move rate limiting to Redis/Upstash (M-2) |
| 2 | Configure email (deletion + verification depend on it) |
| 3 | Split dev and production databases |
| 4 | Migrate file storage to object storage with signed URLs (M-3) |
| 5 | Add session/device management and login lockout (L-1, L-2) |
| 6 | Schedule `npm audit` + dependency updates in CI |
| 7 | Add error tracking (Sentry) and uptime monitoring on `/api/health` |
| 8 | Penetration test with real student accounts before institution-wide launch |
