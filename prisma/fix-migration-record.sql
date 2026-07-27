-- One-off recovery.
--
-- The `project_finance` migration failed part-way (a NOT NULL column added to
-- a non-empty table), and was then corrected. Postgres runs DDL inside a
-- transaction, so the failed attempt rolled itself back completely — no schema
-- change was ever committed.
--
-- What remains is only Prisma's bookkeeping row, whose checksum no longer
-- matches the corrected file. Removing that row lets Prisma apply the fixed
-- migration as if for the first time, instead of demanding a full database
-- reset.
--
-- Safe to run once, then delete this file.

DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260727152907_project_finance';
