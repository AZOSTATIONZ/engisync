import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/identity";
import { userDepartmentIds } from "@/lib/department";
import { routes } from "@/lib/routes";
import { HUB_PROJECTS } from "@/lib/project-hub-catalog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreateWorkspaceForm,
  JoinWorkspaceForm,
} from "@/app/dashboard/projects/project-forms";

export const metadata: Metadata = { title: "New project" };

/**
 * Start a project.
 *
 * WHY THIS PAGE EXISTS
 * Creating a project is the primary purpose of EngiSync, and until now it had
 * no address of its own — it was buried on the old workspaces list, a route
 * that appeared in none of the navigation items and was reachable only via an
 * empty-state link that vanished as soon as you had one project. The product's
 * main action was, in practice, unreachable.
 *
 * It now lives at a predictable, linkable URL under Projects, where someone
 * would actually look for it, and both entry points — create and join — sit on
 * one page because a student arriving here knows they want to start working
 * but often not which of the two applies to them.
 */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; join?: string }>;
}) {
  const session = await auth();
  const { from, join } = await searchParams;

  const deptIds = await userDepartmentIds(session!.user.id);
  const myDepartments = await prisma.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  const departmentOptions = myDepartments.map((d) => ({
    id: d.id,
    label: `${d.name} (${d.code})`,
  }));

  // Staff the student could name as supervisor, grouped by department so the
  // picker can follow the department they choose without another round trip.
  // Only departments the user is already in, so this exposes nothing they
  // could not already see.
  const staff = await prisma.departmentMember.findMany({
    where: { departmentId: { in: deptIds }, role: { in: ["SUPERVISOR", "ADMIN"] } },
    select: {
      departmentId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  const supervisorsByDepartment: Record<string, { id: string; name: string }[]> = {};
  for (const s of staff) {
    (supervisorsByDepartment[s.departmentId] ??= []).push({
      id: s.user.id,
      name: displayName(s.user),
    });
  }

  // Arriving from a Project Hub brief pre-fills the form. Resolved from the
  // catalogue rather than trusting text in the URL.
  const seed = from ? HUB_PROJECTS.find((p) => p.slug === from) : undefined;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={routes.projects}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Projects
        </Link>
        <h1 className="text-2xl font-bold">Start a project</h1>
        <p className="text-muted-foreground">
          Create a new one and invite your team, or join an existing project
          with a code from your project leader.
        </p>
      </div>

      {seed && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
          Starting from the Project Hub brief:{" "}
          <span className="font-medium">{seed.title}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a project</CardTitle>
          <CardDescription>
            You become the project leader — you can invite members, assign tasks
            and manage the budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm
            departments={departmentOptions}
            supervisorsByDepartment={supervisorsByDepartment}
            seedName={seed?.title}
            seedDescription={seed?.summary}
          />
        </CardContent>
      </Card>

      {/* `id="join"` so Quick Actions can deep-link straight to this half. */}
      <Card id="join">
        <CardHeader>
          <CardTitle className="text-base">Join a project</CardTitle>
          <CardDescription>
            Enter the join code your project leader shared. Some projects also ask
            for a PIN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Pre-filled when arriving from a QR code or shared join link. */}
          <JoinWorkspaceForm defaultCode={join ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-primary" />
            Not sure what to build?
          </CardTitle>
          <CardDescription>
            The Project Hub has {HUB_PROJECTS.length} projects with parts lists,
            budgets and prerequisites — filtered by your discipline and year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={routes.projectHub}
            className="text-sm font-medium text-primary hover:underline"
          >
            Browse the Project Hub →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
