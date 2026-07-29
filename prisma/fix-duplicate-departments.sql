-- One-off cleanup: students enrolled in more than one department.
--
-- WHY THIS EXISTS
-- The rule is ONE DEPARTMENT PER STUDENT. It was enforced inline inside the
-- `joinDepartment` server action only, so it was possible for MEMBER rows to
-- accumulate — and rows created before the rule existed at all are still
-- present. Enforcement now lives in `assertSingleDepartment()`
-- (src/lib/department.ts), which every write path calls.
--
-- IMPORTANT — THIS ONLY TOUCHES `role = 'MEMBER'`.
-- Department ADMINs are staff and are SUPPOSED to span departments: the seed
-- alone makes admin@engisync.dev the ADMIN of eight. Deleting those would
-- leave those departments with nobody able to post announcements or manage
-- members. An earlier draft of this script did exactly that; running STEP 1
-- first is what caught it.
--
-- Run in the Neon SQL Editor against the production branch, then
-- `npx prisma migrate dev`.

-- ── STEP 1: look before you delete ──────────────────────────────────────
SELECT
  u.email,
  u.name,
  d.name  AS department,
  dm.role,
  dm."joinedAt",
  CASE
    WHEN dm.id = FIRST_VALUE(dm.id) OVER (
      PARTITION BY dm."userId" ORDER BY dm."joinedAt" ASC
    ) THEN 'KEEP'
    ELSE 'REMOVE'
  END AS action
FROM "DepartmentMember" dm
JOIN "User" u       ON u.id = dm."userId"
JOIN "Department" d ON d.id = dm."departmentId"
WHERE dm.role = 'MEMBER'
  AND dm."userId" IN (
    SELECT "userId" FROM "DepartmentMember"
    WHERE role = 'MEMBER'
    GROUP BY "userId" HAVING COUNT(*) > 1
  )
ORDER BY u.email, dm."joinedAt";

-- ── STEP 2: keep each student's FIRST department, drop the rest ─────────
-- Oldest membership wins: that is the department they actually enrolled in,
-- and it is the one their existing groups and coursework hang off.
--
-- Only MEMBER rows are considered. No ADMIN row, user, department, group,
-- task or financial record is touched.
DELETE FROM "DepartmentMember"
WHERE role = 'MEMBER'
  AND id NOT IN (
    SELECT DISTINCT ON ("userId") id
    FROM "DepartmentMember"
    WHERE role = 'MEMBER'
    ORDER BY "userId", "joinedAt" ASC
  );

-- ── STEP 3: confirm — must return zero rows ─────────────────────────────
SELECT "userId", COUNT(*)
FROM "DepartmentMember"
WHERE role = 'MEMBER'
GROUP BY "userId"
HAVING COUNT(*) > 1;
