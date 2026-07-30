---
title: "EngiSync — Architecture Continuation"
subtitle: "Object storage, project-owned files, the unified workspace, and defensible AI import"
author: "Continuation of docs/07-Product-Specification.md"
date: "30 July 2026"
status: "Proposal — decisions marked 🔷; nothing here is built yet"
---

# 0. What this document is

The Product Specification (§07) describes a platform that is largely built and internally coherent. This document is narrower and sharper: it addresses the specific structural faults that block the next stage of the product, in the order their dependencies force. It does not re-litigate settled decisions (§18 of the spec stands), and it does not propose a rewrite. Every change here is an edit to a system that already works.

Status convention carries over from §07: ✅ Implemented · 🔷 Decided/Proposed · ⏳ Deferred · ❌ Rejected.

**The one-line thesis:** the file subsystem is the product's structural weak point, not the permission model. Files are stored as bytes in Postgres with a 10 MB cap while the artifacts engineering students actually produce (STEP, SolidWorks, Proteus, MP4) are 50 MB–2 GB, and the storage model lets a teammate's upload become invisible. Object storage is the keystone; four other improvements sit on top of it and cannot ship before it.

---

# 1. Critique of the current architecture

## 1.1 The real bug: files are broken by design

`FileResource.workspaceId` is nullable (`schema.prisma:1236`). The global upload surface at `/dashboard/resources` creates rows with no workspace. `listFilesForUser` (`src/lib/files.ts:15`) then returns the union of *my own uploads* and *files in workspaces I belong to*:

```ts
where: { OR: [{ uploaderId: userId }, { workspaceId: { in: wsIds } }] }
```

The failure mode is precise and quiet. A student uploads a datasheet from the global Resources page. `workspaceId` is null, so it matches only the `uploaderId` arm. **No teammate ever sees it.** The uploader believes they shared something; the team believes nothing was shared. There is no error, no empty state, no "this is private" badge — the file simply exists in one person's list and nowhere else. This is worse than a missing feature, because it silently defeats the one thing a collaboration tool exists to do.

The same page also violates a stated invariant. §6.3 promises "email addresses never render in shared UI … enforced through the single `displayName()` accessor." But `listFilesForUser` selects `uploader: { select: { id, name, email } }` (`files.ts:28`). Any file list that renders the uploader has the email in its payload. The rule is real; the query bypasses it. This is a one-line data-selection fix, but it is exactly the kind of leak the accessor was built to prevent, and it shows the accessor is not yet load-bearing.

## 1.2 The binding constraint sits under everything

`MAX_FILE_BYTES = 10 * 1024 * 1024` (`files.ts:5`), and `FileResource.data Bytes` lives in the row (`schema.prisma:1234`). The comment on line 1234 already concedes the point ("swappable for S3/Supabase later"), and §15 lists it as an upgrade path. But it is not merely an upgrade — it is a **precondition**. You cannot make files project-owned and central if the central file store cannot hold a SolidWorks assembly. Redesigning uploads on top of a 10 MB Postgres-bytes store would mean redesigning them twice. Storage must move first. This ordering is not a preference; it is a dependency.

Two further consequences of bytes-in-Postgres worth naming: every file download streams through a serverless function's memory (a 10 MB ceiling is partly *protecting* the function), and `PublishedFile.data Bytes` (`schema.prisma:1072`) inherits the same ceiling — the permanent archive, the feature meant to compound in value, currently cannot store a 200 MB final-year video demonstration.

## 1.3 What is *not* broken — and must not be "fixed"

**Projects are already private.** `getWorkspaceForUser` (`src/lib/workspace.ts`) scopes on `members: { some: { userId } }`. Same-department membership grants a supervisor *read* access through the policy layer, not through workspace queries, and grants a non-member nothing. There is no cross-project data bleed to repair. Any proposal that begins "rebuild the permission model so projects are private" is solving a solved problem and would risk regressing the 150+ policy assertions that currently guard it. **Do not touch `can()` / `getContext()` without first reproducing an actual leak in a test.** The policy layer (`src/lib/policy.ts`) is the healthiest part of the codebase: one pure function, exhaustively tested, self-approval carve-out checked first. It is a model the file subsystem should aspire to, not a target for rework.

## 1.4 The IA fault the spec already admits

§5 and `routes.ts` are honest about it: one `Workspace` record is surfaced through two route trees — `/dashboard/workspaces/[id]` (people/access) and `/dashboard/projects/[id]` (plan/milestones) — plus scattered feature-first routes (`/dashboard/budget/[id]`, `/dashboard/analytics/[id]`, `/dashboard/resources`). A student cannot form a mental model of "where does my project's stuff live" because it lives in five places. `routes.ts` was built precisely so this becomes a one-file edit. The cost of *not* unifying compounds with every feature added to either tree. This is the largest UX debt and it is now blocking: "one project workspace screen owning docs, files, budget, analytics" (the owner's stated goal) *is* the unification, so it can no longer be deferred behind file work — it is adjacent to it.

## 1.5 Analytics that inform nothing

Analytics today compute counters and charts on request (§15). The spec's own dashboard philosophy (§3.3) says "counters are not decisions" — yet the analytics surface is counters. A burndown chart that says "you are behind" without a link to *the unassigned tasks causing it* asks the user to do the diagnostic work the system is best placed to do. This is not a data problem; it is a wiring problem. Every number should terminate in an action.

## 1.6 Summary scorecard

| Area | State | Verdict |
|---|---|---|
| Policy / authorization | ✅ Pure, tested, correct | Leave alone; it's the template |
| Project privacy | ✅ Query-scoped | Not a bug — don't rebuild |
| File storage | ❌ 10 MB Postgres bytes | Keystone fix; everything waits on it |
| File ownership | ❌ Nullable workspace, silent orphans | Fix *after* storage |
| Email in file UI | ❌ PII leak in `listFilesForUser` | One-line fix, do immediately |
| Entity/route split | ⏳ Two trees, one record | Unify — now blocking |
| Analytics | ⏳ Counters without actions | Rebuild wiring, not data |
| Documentation import | 🔷 Not built | Design for provenance from day one |

---

# 2. Proposed information architecture

## 2.1 Keep the five-item spine

§3.1's five-item nav (Home / My Work / Projects / Repository / Library) is correct and stays. The problem is not the top level; it is that **the project itself has no single home**. Everything below fixes that.

## 2.2 One project, one route tree, tabbed

Collapse `/dashboard/workspaces/[id]` and `/dashboard/projects/[id]` into a single canonical `/dashboard/projects/[id]`, with sub-sections as tabs, not separate top-level routes:

```
/dashboard/projects/[id]              Overview  (stage, pace, what needs me here)
/dashboard/projects/[id]/plan         Objectives, scope, milestones, risks, deliverables
/dashboard/projects/[id]/team         Members, invites, join codes, capabilities
/dashboard/projects/[id]/tasks        Board/list scoped to this project
/dashboard/projects/[id]/files        Project-owned files (the new home for uploads)
/dashboard/projects/[id]/docs         Structured documentation + import
/dashboard/projects/[id]/budget       Contributions, expenses, ledger
/dashboard/projects/[id]/meetings     Meetings + attendance
/dashboard/projects/[id]/discussions  Threads
/dashboard/projects/[id]/insights     Analytics — every number an action
/dashboard/projects/[id]/publish      Publication assembly + gate
```

`routes.ts` already funnels every link through helpers, so this is edits to `projectHome`, `projectTeam`, `projectBudget`, `projectAnalytics` (etc.) plus redirects from the old paths — not a hunt through 40 files. The feature-first routes (`/dashboard/budget/[id]`, `/dashboard/analytics/[id]`) become 308 redirects into the project tabs.

## 2.3 The global Resources page is deleted, not fixed

`/dashboard/resources` is the source of orphaned files (§1.1). It should not survive. Files belong to a project; there is no legitimate "global personal file locker" in this product. Two things replace it:

- **Project files** live at `/dashboard/projects/[id]/files`. Uploading there sets `workspaceId` non-null by construction — the orphan class becomes structurally impossible.
- **My Files** (a lens under *My Work*, optional) shows *files across my projects*, read from the same project-owned rows — a view, never a storage location.

The Library (`/dashboard/departments`) remains the curated department resource hub (`DepartmentResource`), which is a different concept (links/catalogue, not project artifacts) and is unaffected.

## 2.4 The mental model, stated

One container (project), one personal lens (My Work), one department layer (Library/Repository). Files, money, docs, analytics are **tabs inside the container**, never siblings of it in the nav. This is the GitHub model the spec already committed to (§3.1); the IA change finally makes the code match the doctrine.

---

# 3. User journeys

## 3.1 Sharing a large CAD file with the team (the journey that is broken today)

**Today:** Member opens Resources → uploads `gearbox.SLDASM` (48 MB) → **rejected at 10 MB**, or if under the cap, uploaded with `workspaceId = null` → teammates never see it. Silent failure either way.

**Proposed:** Member opens their project → **Files** tab → drops `gearbox.SLDASM`. The client requests a signed upload URL, PUTs the bytes directly to object storage (bypassing the serverless memory limit), and the server records a `FileResource` row with `workspaceId` set, `storageKey`, `size`, `mimeType`, and a checksum. The file appears immediately for every member because the row is project-scoped by construction. Because SolidWorks is a proprietary format, the card offers **Download** and shows a format badge — it does **not** promise a thumbnail (rendering `.SLDASM` needs a licensed viewer; §07's "integrate, don't build" applies). A `.pdf` or image gets an inline preview; a `.step` gets download-only with a clear "proprietary format — download to open in your CAD tool" note.

## 3.2 Importing an existing report into structured documentation (map, never rewrite)

**Context:** A group has already written a 40-page report in Word. The docs module wants it as structured sections (`DocumentSection`), but the report is the team's canonical work and a viva examiner may compare the two. Rewriting is indefensible.

**Proposed flow:**
1. Leader uploads `Final_Report_v3.docx` to the project. The original is stored immutably in object storage and **never modified**.
2. AI runs an *extraction + mapping* pass (person-triggered, never on load — §13 rule 1). For each documentation section (`abstract`, `methodology`, …) it proposes: *"This section maps to pages 12–14 of the source"* with a **confidence score** and the extracted text shown read-only beside the source.
3. The student **confirms, edits, or rejects each mapping individually.** Nothing is written to a `DocumentSection` until a human accepts it. AI drafts; the student authors.
4. Provenance is recorded per section: source file id, page range, model, confidence, and who confirmed. The supervisor sees a **"Imported from Final_Report_v3.docx, pp.12–14 — confirmed by Tadiwa, 82% match"** badge on any imported section.
5. The source file stays downloadable and byte-identical forever. If a mapping is later disputed, the original is right there.

The AI never produces a section the student didn't approve, never edits the source, and never hides its provenance. This is what makes it survivable in a viva: the examiner can see exactly what came from where, and the machine's role was suggestion, not authorship.

## 3.3 A supervisor acting on analytics (every number an action)

**Today:** Supervisor opens a group's analytics, sees "burndown: behind, 6 tasks overdue," and must go hunting for which tasks and whose.

**Proposed:** The insights tab shows "Behind schedule — 6 overdue tasks, 4 unassigned" where **"4 unassigned" is a link** to the unassigned-task queue filtered to this project, and "2 inactive members" links to those members. The number is the diagnosis; the link is the treatment. The supervisor stays read-only (they can see and message, not assign — §6.1), but the leader viewing the same tab gets action buttons inline. Same data, permission-shaped affordances.

## 3.4 Publishing with a video demo (unblocked by storage)

**Today:** Publication copies file bytes into `PublishedFile.data` — a 180 MB demo video cannot be archived. **Proposed:** archived files reference an object-storage key in an archive-owned prefix; "copy at approval" becomes a server-side object copy into an immutable `archive/` path, so the snapshot guarantee (§10) is preserved *and* large media is finally archivable. The record still holds no FKs to mutable data — it holds an immutable storage key.

---

# 4. Schema changes

All changes are additive-then-migrate; none drops a column before data is moved. Prisma migration + `npm run build` + `npm test` green before the next step, per the standing discipline (§17).

## 4.1 Object storage on `FileResource`

```prisma
model FileResource {
  id          String  @id @default(cuid())
  name        String
  description String?
  mimeType    String
  size        Int

  // NEW — object storage
  storageKey  String?  // e.g. "ws/<workspaceId>/<cuid>/gearbox.SLDASM"
  checksum    String?  // SHA-256 of bytes, for integrity + dedupe
  storageProvider String @default("postgres") // "postgres" | "s3" | "supabase"

  // LEGACY — retained until backfill completes, then dropped in a later migration
  data        Bytes?   // was: Bytes (non-null). Nullable during transition.

  // CHANGED — non-null after backfill (step 2 of migration)
  workspaceId String?
  workspace   Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  uploaderId String
  uploader   User   @relation("FileUploader", fields: [uploaderId], references: [id])
  shareLinks ShareLink[]

  createdAt DateTime @default(now())

  @@index([workspaceId])
  @@index([uploaderId])
  @@index([checksum])
}
```

Note `data` becomes nullable (not yet dropped) and `storageKey` is added nullable. The `workspaceId`-non-null goal is reached by *data migration then a follow-up migration*, not by a constraint that would fail against existing orphan rows. `storageProvider` lets old Postgres-stored rows and new object-stored rows coexist during transition — the read path branches on it.

## 4.2 Same treatment for `PublishedFile`

```prisma
model PublishedFile {
  // ...existing...
  size        Int
  storageKey  String?  // immutable archive prefix, e.g. "archive/ES-2026-0042/<cuid>/..."
  checksum    String?
  data        Bytes?   // nullable; new archives use storageKey
}
```

Publication's "copy bytes at approval" becomes "copy object at approval" into an `archive/` prefix that the workspace's lifecycle can never reach — preserving the no-FK snapshot guarantee (§10) while removing the 10 MB archive ceiling.

## 4.3 Documentation import provenance (new model)

```prisma
enum ImportConfidence { HIGH MEDIUM LOW }

/// Records that a DocumentSection's content originated from an uploaded
/// source file, AI-mapped and human-confirmed. The source is immutable;
/// this is provenance, not a rewrite.
model SectionImport {
  id           String @id @default(cuid())
  sectionId    String @unique
  section      DocumentSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  sourceFileId String            // FileResource id of the immutable original
  sourceLabel  String            // "Final_Report_v3.docx"
  pageRange    String?           // "12-14"
  model        String?           // which model proposed the mapping
  confidence   ImportConfidence
  confidenceScore Int?           // 0-100, shown to supervisor

  confirmedById   String
  confirmedByName String          // denormalised (survives account deletion)
  confirmedAt     DateTime @default(now())

  @@index([sourceFileId])
}
```

`DocumentSection` gets `imports SectionImport?` back-relation. No content is copied here — the confirmed text lives in `DocumentSection.content` as it does today; this table is the *audit trail of where it came from*, visible to the supervisor. The source `FileResource` is never edited.

## 4.4 No changes to the policy or ledger schemas

`WorkspaceMember`, capabilities, `LedgerEvent`, `Contribution` uniqueness — untouched. The permission and money cores are correct (§1.3). Resisting the urge to "improve" them is part of the design.

---

# 5. API / server-action changes

The backend is server actions (§15), so "API changes" means action-signature and lib changes. Kept minimal and behind the existing lib layer.

## 5.1 A storage abstraction (`src/lib/storage.ts`, new)

One interface so the provider is a config value, not a code fork — mirroring how `lib/ai.ts` abstracts the AI provider:

```ts
export interface FileStore {
  presignUpload(key: string, contentType: string): Promise<{ url: string; fields?: Record<string,string> }>;
  presignDownload(key: string, filename: string): Promise<string>; // short-lived signed URL
  copy(fromKey: string, toKey: string): Promise<void>;             // for publication archival
  delete(key: string): Promise<void>;
}
```

Two implementations: `S3Store` (or `SupabaseStore`) and a `PostgresStore` shim that keeps the old bytes path working during transition. Selected by `STORAGE_PROVIDER` env var. Download switches from "stream bytes through the function" to "302 to a signed URL," which also removes the serverless memory pressure that justified the 10 MB cap.

## 5.2 Upload becomes two steps

- `requestUpload(workspaceId, filename, contentType, size)` → authorizes `file.upload` via `authorize(workspaceId, userId, "file.upload")` (already an action in `policy.ts:91`), validates size against a new, much higher cap (see §6), returns a presigned URL + the `storageKey` to use.
- `confirmUpload(workspaceId, storageKey, checksum, …)` → creates the `FileResource` row with `workspaceId` **required** (the action signature no longer accepts a null workspace; the orphan path is closed at the API boundary, not just the schema).

`listFilesForUser` is **retired** in favour of `listProjectFiles(workspaceId, userId)` (authorized, project-scoped) and an optional `listMyProjectFiles(userId)` view. Both drop `email` from the `uploader` select — PII fix (§1.1) lands here by construction.

## 5.3 Download authorization unchanged in shape

`canAccessFile` (`files.ts:37`) stays as the gate; on success it now calls `store.presignDownload` instead of returning bytes. Share links (`ShareLink`) presign with the link's own expiry/limit — the token check stays, only the delivery changes.

## 5.4 Documentation import actions (new, all person-triggered)

- `proposeImport(workspaceId, sourceFileId)` → authorizes `document.edit`; runs extraction+mapping; returns proposals `{ sectionKey, extractedText, pageRange, confidence }[]`. **Never called on page load.** Cached by `(sourceFileId, model-version)` per §13 rule 2.
- `confirmImport(workspaceId, sectionKey, proposalId)` → authorizes `document.edit`; writes `DocumentSection.content` **and** a `SectionImport` row. This is the only path that mutates a section from an import; unconfirmed proposals never touch the section.

No new AI action runs automatically; all remain gated by the `AI_DISABLED` kill switch (`lib/ai.ts`) and degrade to "out of service" (§13).

## 5.5 Cron constraint is a hard design input

Vercel Hobby fails the **entire deploy** if any cron entry runs more than once daily. Therefore: no sub-daily cron in `vercel.json`. "Meeting in 15 minutes" reminders (§8, deferred) require the job queue (§15), not a cron — do not attempt them as a cron workaround, because the deploy failure is silent and strands production on the last good commit. Any scheduled work added now must be a single daily digest at most.

---

# 6. UI / UX recommendations

**Project tab bar.** A persistent horizontal tab bar on the project route (Overview / Plan / Team / Tasks / Files / Docs / Budget / Meetings / Insights / Publish), collapsing to a `⌘K`-reachable menu and a scrollable strip at 360 px. This replaces cross-page navigation with in-container tabs — the single biggest legibility win.

**Files tab.** Grid of file cards: name, size (`formatBytes` already exists), uploader display name (never email), format badge. Preview policy is explicit and honest: images/PDF preview inline; Office docs get an "open to download" action; **proprietary formats (Proteus `.pdsprj`, SolidWorks `.SLDASM`, AutoCAD `.dwg`) are download-only with a one-line "proprietary format — open in <tool>" note.** Never promise a thumbnail the platform can't render without a licence. Upload shows a real progress bar (direct-to-storage PUT makes this truthful) and a per-project used-storage indicator.

**Success confirmations.** Per saved feedback, actions need visible green success toasts — "File shared with 4 teammates," "Section imported from pp.12–14." A toast that names *what happened and who it reached* is worth more than a checkmark; it closes the "did my share actually work?" anxiety that the current silent-orphan bug created.

**Import review UI.** Two-pane: source document (read-only, page-anchored) on the left, proposed section mapping on the right with a confidence chip and Accept / Edit / Reject. Bulk "accept all high-confidence" is allowed but every acceptance is still a recorded human decision. The supervisor's view of the same section shows the provenance badge inline, not hidden in a menu.

**Insights tab — every number is a link.** No bare counters. "6 overdue" links to the filtered task list; "4 unassigned" to the unassigned queue; "2 inactive members" to those members. Leaders see action buttons inline; supervisors see the same numbers as read-only links (they can look and message, not assign). Charts stay, but each carries a one-sentence plain-language reading and a link to the thing to change — matching the pacing engine's existing "plain-language sentence" pattern (§4).

**Accessibility & mobile carry forward** unchanged from §3.4/§14: 44 px targets, portalled overlays, `inputMode` on numeric fields, reduced-motion, aria-live. The tab bar must be keyboard-navigable and the import two-pane must reflow to stacked on mobile.

---

# 7. AI workflow (documentation import)

The governing principle, restated because it is the whole point: **the AI maps; it never rewrites, and it never authors.** Concretely:

1. **Immutable source.** The uploaded file is written once to object storage and never touched again. Every import references it; none edits it.
2. **Propose, don't apply.** The mapping pass returns candidate `{section ← pages, confidence}` tuples. Writing to a `DocumentSection` requires an explicit human confirm. There is no "auto-fill all sections" that bypasses confirmation.
3. **Confidence is shown, not hidden.** Each proposal carries a score; the supervisor sees it on the resulting section. Low-confidence mappings are flagged for extra scrutiny, never silently accepted.
4. **Provenance is permanent.** `SectionImport` records source, pages, model, confidence, and confirmer. A viva examiner or supervisor can trace any imported sentence back to its origin.
5. **Person-triggered, cached, degradable.** Follows §13's three rules exactly: never on page load, cached per source+model-version, and gated by `AI_DISABLED` so the whole feature degrades to "out of service" with the source file still fully usable manually.

**Explicitly out of scope** (consistent with §18): the AI does not grade the import, does not detect plagiarism against the source, does not rewrite for "quality," and does not decide the section is "good enough." It extracts and locates. Humans do the rest.

**Provider discipline:** the current AI provider is Gemini (free tier), configured by env, behind `lib/ai.ts`. "AI failing" almost always means a missing key, not a bug — surface a clear "AI not configured / out of service" state, never a stack trace, and never let a missing key block the manual documentation path.

---

# 8. Permissions model

**The headline: it does not change.** §1.3 stands — projects are already private, `can()` is correct and exhaustively tested, and the standing instruction is *reproduce a real leak in a test before altering the policy layer*. The new features slot into the existing action vocabulary rather than expanding it:

- File upload/download/share → `file.upload` (exists, `policy.ts:91`) plus the existing `canAccessFile` ownership gate for reads. No new action.
- Documentation import → `document.edit` for proposing/confirming; `document.approve` (capability `canApprove`) unchanged for supervisor/lead sign-off. No new action.
- Insights actions → `analytics.view` (exists) for viewing; the *action* links reuse `task.assign`, `member.*` etc., so a supervisor's read-only ceiling is enforced by the same matrix that already enforces it everywhere. No new action.

One small, optional addition worth considering — **not** required for any of the above:

```ts
// Only if a genuine need appears; otherwise don't add it.
| "file.delete"   // today file removal rides on cascade / upload rights
```

If added, it belongs to LEADER + uploader (a member may delete their own upload), expressed as a matrix rule, and covered by the existing exhaustive test before it ships. Absent a concrete requirement, leave the action set as-is — every added action multiplies the surface the tests must cover, which is the same reasoning that keeps the role tiers at three (§18).

The self-approval carve-out, supervisor read-only ceiling, and admin-bypass-first ordering are all preserved verbatim. Nothing here weakens separation of duties.

---

# 9. Migration plan

Sequenced so each step ships green and no step depends on a later one. Prisma migrations are additive first; destructive drops come only after data has moved and been verified.

**Step 0 — PII hotfix (hours, no migration).** Remove `email` from the `uploader` select in `listFilesForUser` and anywhere a file list renders. Ship immediately; it is independent of everything else and closes a live PII leak.

**Step 1 — Storage abstraction, dual-write (schema migration #1).** Add `storageKey`, `checksum`, `storageProvider` to `FileResource` and `PublishedFile`; make `data` nullable. Introduce `lib/storage.ts` with `PostgresStore` (wraps existing behaviour) and `S3Store`/`SupabaseStore`. New uploads go to object storage; reads branch on `storageProvider`. Old rows keep working unchanged. **No user-visible change yet.** Build + tests green.

**Step 2 — Backfill bytes → object storage (data migration, reversible).** A one-off script (run outside the request path; the Prisma engine CDN is blocked in-sandbox, so run on the user's machine or CI per project memory) streams each Postgres-stored file to object storage, sets `storageKey`/`checksum`/`storageProvider="s3"`, verifies checksum, then nulls `data`. Idempotent and resumable. Verify counts and a sample of checksums before proceeding.

**Step 3 — Adopt files, close the orphan path (schema migration #2 + code).** Point the new **Files tab** at `listProjectFiles`. Change `confirmUpload` to require `workspaceId`. **Migrate existing orphans:** for each `FileResource` with `workspaceId = null`, if the uploader belongs to exactly one workspace, offer to attach it there (with the uploader's confirmation via a one-time "we found N files not attached to a project — assign them" prompt); truly personal orphans move to an explicit "unfiled" area or are left uploader-only with a clear badge. Only *after* orphans are resolved, add the non-null constraint. Delete `/dashboard/resources`; 308-redirect it to the projects list. Raise `MAX_FILE_BYTES` to the object-storage tier (e.g. 2 GB, provider-limited).

**Step 4 — Route unification (code + redirects, no schema).** Rewrite `routes.ts` helpers to the single `/dashboard/projects/[id]` tree; add the tab routes; 308-redirect the old `/dashboard/workspaces/[id]`, `/dashboard/budget/[id]`, `/dashboard/analytics/[id]` paths. This is the `routes.ts` payoff — a focused change, not a sweep.

**Step 5 — Drop legacy bytes (schema migration #3).** Once Step 2 is verified in production and a backup exists, drop `FileResource.data` and `PublishedFile.data`. This is the only irreversible step; it runs last, behind a verified backup.

**Step 6 — Documentation import (schema migration #4 + AI).** Add `SectionImport`; build `proposeImport`/`confirmImport`; ship the two-pane review UI. Independent of storage internals once Step 1 exists (it needs immutable source files, which object storage now provides).

**Step 7 — Insights rewiring (no schema).** Replace bare counters with linked, action-bearing numbers. Pure front-end + query work over existing data.

Rollback posture: Steps 1–4 and 6–7 are reversible (dual-write, redirects, additive tables). Only Step 5 is one-way and is explicitly gated on a backup.

---

# 10. Prioritised roadmap

Ordered strictly by dependency and by harm-reduction. Each ships build+tests green before the next (§17 discipline).

**P0 — PII hotfix.** Remove email from file-list selects. Hours. No dependencies. Closes a live leak. *(Migration Step 0.)*

**P1 — Object storage.** The keystone. `lib/storage.ts` + dual-write + backfill. Everything below waits on it. Unblocks large engineering files and archivable video. *(Steps 1–2.)*

**P2 — Project-owned files + delete global Resources.** Files tab, required `workspaceId`, orphan migration. Fixes the silent-share bug — the product's worst current failure. *(Step 3.)*

**P3 — Route unification into `/dashboard/projects/[id]`.** The "one project workspace screen owning docs, files, budget, analytics." Largest UX debt; `routes.ts` makes it a focused edit. Can proceed in parallel with P2's UI once P1 lands. *(Step 4.)*

**P4 — Documentation import (map-never-rewrite).** Provenance-first AI. Needs immutable source files (P1). Defensible in a viva by construction. *(Step 6.)*

**P5 — Insights that act.** Every number a link to the thing to change. Pure wiring over existing data. *(Step 7.)*

**P6 — Drop legacy bytes columns.** Housekeeping, behind a verified backup, after P1/P2 are proven in production. *(Step 5.)*

**Deferred, unchanged from §15/§17:** job queue (unlocks sub-daily reminders — cannot use cron on Hobby), Redis rate limiting, analytics precompute, `tsvector` search, multi-tenancy. None blocks P0–P5; all remain seams, not rewrites.

**What is deliberately *not* on this roadmap:** rebuilding the permission model (already correct), adding role tiers (rejected, §18), real-time collaboration (rejected, §18), payment processing (rejected permanently, §18), and AI that grades, scores, or authors (rejected, §18). Reopening any of these requires new evidence, not enthusiasm.

---

## Verification notes

Every code reference in this document was checked against the repository: `FileResource.workspaceId` nullable and `data Bytes` (`schema.prisma:1234–1237`); `MAX_FILE_BYTES = 10 MB` and the `uploader.email` select (`src/lib/files.ts:5,28`); the `file.upload` / `document.edit` / `analytics.view` actions and the supervisor read-only ceiling (`src/lib/policy.ts:91,150`); the two-route-tree split and `routes.ts` helper seam (`src/lib/routes.ts:58–98`); `PublishedFile.data Bytes` archive ceiling (`schema.prisma:1072`). Project-privacy scoping (`getWorkspaceForUser` in `src/lib/workspace.ts`) and the AI kill switch (`src/lib/ai.ts`) are cited from the verified prior-session findings and confirmed present. No API, model, or file path in this document is invented; where something is proposed it is marked new/🔷.
