import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, FileText, BarChart3 } from "lucide-react";
import { auth } from "@/auth";
import { getSupervisedProject } from "@/lib/supervisor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackForm } from "../feedback-form";
import { MilestoneApproveButton } from "./milestone-approve";

export const metadata: Metadata = { title: "Supervise project" };

export default async function SuperviseProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const p = await getSupervisedProject(id, session!.user.id);
  if (!p) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/supervisor"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All supervised projects
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{p.name}</h1>
            {p.department && <p className="text-muted-foreground">{p.department}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/supervisor/${id}/documentation`}>
                <FileText className="h-4 w-4" /> Review documentation
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/supervisor/${id}/report`}>
                <BarChart3 className="h-4 w-4" /> Analytics report
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Completion", value: `${p.completionPct}%` },
          { label: "Tasks done", value: `${p.done}/${p.total}` },
          { label: "Overdue", value: p.overdue },
          { label: "Members", value: p.members.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Objectives &amp; scope</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Objectives</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{p.objectives || "Not set."}</p>
            </div>
            <div>
              <p className="font-medium">Scope</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{p.scope || "Not set."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {p.members.map((m, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.role === "LEADER" ? "Leader" : "Member"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Milestones</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {p.milestones.length === 0 && <li className="text-muted-foreground">None.</li>}
              {p.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span className={m.done ? "text-muted-foreground line-through" : ""}>
                    {m.done ? "✓" : "○"} {m.title}
                  </span>
                  <MilestoneApproveButton milestoneId={m.id} approved={m.approved} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Deliverables</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {p.deliverables.length === 0 && <li className="text-muted-foreground">None.</li>}
              {p.deliverables.map((d, i) => (
                <li key={i} className={d.done ? "text-muted-foreground line-through" : ""}>
                  {d.done ? "✓" : "○"} {d.title}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Risks</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {p.risks.length === 0 && <li className="text-muted-foreground">None.</li>}
              {p.risks.map((r, i) => (
                <li key={i}>{r.title} <span className="text-xs text-muted-foreground">· {r.severity}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-primary" /> Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeedbackForm workspaceId={p.id} />
          {p.feedback.length > 0 && (
            <ul className="space-y-2">
              {p.feedback.map((f) => (
                <li key={f.id} className="rounded-md border p-3 text-sm">
                  <p className="whitespace-pre-wrap">{f.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.authorName} · {new Date(f.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
