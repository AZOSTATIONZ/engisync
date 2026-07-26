import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  generateProjectReport,
  RANGE_LABELS,
  type ReportRange,
} from "@/lib/lecturer-analytics";

const RANGES: ReportRange[] = ["daily", "weekly", "monthly", "semester", "final"];
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const rp = url.searchParams.get("range");
  const range = (RANGES.includes(rp as ReportRange) ? rp : "final") as ReportRange;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await generateProjectReport(id, session.user.id, range);
  if (!report) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const o = report.overall;

  const overallRows = [
    ["Overall score", `${o.overallScore}/100`],
    ["Progress", `${o.progressPct}%`],
    ["Completion", `${o.completionPct}%`],
    ["Documentation", `${o.documentationScore}%`],
    ["Engineering quality", `${o.engineeringQuality}/100`],
    ["Innovation", `${o.innovationScore}/100`],
    ["Project health", o.projectHealth],
    ["Risk level", o.riskLevel],
    ["Budget health", o.budgetHealth],
  ];
  const teamRows = [
    ["Members", report.team.memberCount],
    ["Participation", `${report.team.participationPct}%`],
    ["Attendance", `${report.team.attendancePct}%`],
    ["Productivity", `${report.team.productivityPct}%`],
    ["Tasks completed", report.team.tasksCompleted],
    ["Missed deadlines", report.team.missedDeadlines],
    ["Late tasks", report.team.lateTasks],
    ["Time logged", `${report.team.timeSpentHours}h`],
  ];

  const kv = (rows: (string | number)[][]) =>
    `<table class="kv">${rows
      .map((r) => `<tr><td>${esc(String(r[0]))}</td><td><b>${esc(String(r[1]))}</b></td></tr>`)
      .join("")}</table>`;

  const indHead = ["Student", "Assigned", "Done", "Attend.", "Product.", "Files", "Comments", "Meetings", "Avg days", "Contrib."];
  const indBody = report.individuals
    .map(
      (s) =>
        `<tr><td>${esc(s.name)}</td><td>${s.tasksAssigned}</td><td>${s.tasksCompleted}</td><td>${s.attendancePct}%</td><td>${s.productivityScore}</td><td>${s.filesUploaded}</td><td>${s.commentsMade}</td><td>${s.meetingsAttended}</td><td>${s.avgCompletionDays ?? "—"}</td><td><b>${s.contributionPct}%</b></td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${esc(report.workspaceName)} — ${esc(RANGE_LABELS[range])} report</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;max-width:840px;margin:32px auto;padding:0 24px;color:#111;line-height:1.5}
  h1{font-size:26px;margin-bottom:2px;border-bottom:3px solid #0d9488;padding-bottom:10px}
  h2{font-size:17px;margin-top:28px;color:#0f766e}
  .meta{color:#666;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  table.kv td{padding:4px 8px;border-bottom:1px solid #eee;width:50%}
  table.grid th,table.grid td{border:1px solid #ddd;padding:6px 8px;text-align:left}
  table.grid th{background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#475569}
  .cols{display:flex;gap:24px}.cols>div{flex:1}
  @media print{body{margin:0}.noprint{display:none}}
  .btn{display:inline-block;margin:16px 0;padding:8px 14px;background:#0d9488;color:#fff;border-radius:6px;text-decoration:none;cursor:pointer;border:0}
</style></head>
<body>
  <button class="btn noprint" onclick="window.print()">Print / Save as PDF</button>
  <h1>${esc(report.workspaceName)}</h1>
  <p class="meta">${esc(RANGE_LABELS[range])} · ${report.department ? esc(report.department) + " · " : ""}generated ${new Date(report.generatedAt).toLocaleString("en-GB")} · EngiSync</p>

  <div class="cols">
    <div><h2>Overall performance</h2>${kv(overallRows)}</div>
    <div><h2>Team performance</h2>${kv(teamRows)}</div>
  </div>

  <h2>Individual performance</h2>
  <table class="grid">
    <thead><tr>${indHead.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${indBody}</tbody>
  </table>

  <script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
