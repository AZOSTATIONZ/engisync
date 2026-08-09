import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.$queryRaw`
  SELECT
    count(*)::int AS files,
    count(*) FILTER (WHERE "data" IS NOT NULL)::int AS with_bytes,
    COALESCE(sum(octet_length("data")),0)::bigint AS total_bytes,
    COALESCE(max(octet_length("data")),0)::int AS largest,
    COALESCE(avg(octet_length("data")),0)::int AS average
  FROM "FileResource";`;
const r = rows[0];
const mb = (n) => (Number(n) / 1048576).toFixed(2) + " MB";
console.log("  file rows        :", r.files);
console.log("  rows with bytes  :", r.with_bytes);
console.log("  total in Postgres:", mb(r.total_bytes));
console.log("  largest single   :", mb(r.largest));
console.log("  average          :", mb(r.average));

const db = await p.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database())) AS size;`;
console.log("  whole database   :", db[0].size);
const tbl = await p.$queryRaw`SELECT pg_size_pretty(pg_total_relation_size('"FileResource"')) AS size;`;
console.log("  FileResource tbl :", tbl[0].size);
await p.$disconnect();
