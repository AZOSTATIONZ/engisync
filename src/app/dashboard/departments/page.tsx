import Link from "next/link";
import type { Metadata } from "next";
import { SystemRole } from "@prisma/client";
import { Users, FolderKanban } from "lucide-react";
import { auth } from "@/auth";
import { listDepartments } from "@/lib/department";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateDepartmentForm, JoinLeaveButton } from "./departments-ui";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const session = await auth();
  const departments = await listDepartments(session!.user.id);
  const isSystemAdmin = session!.user.systemRole === SystemRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-muted-foreground">
            Join your engineering department to access and create project groups.
          </p>
        </div>
        {isSystemAdmin && <CreateDepartmentForm />}
      </div>

      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No departments yet.
          {isSystemAdmin
            ? " Create the first one."
            : " Ask your administrator to set them up."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Card key={d.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                      {d.code}
                    </span>
                    <CardTitle className="text-base">
                      <Link
                        href={`/dashboard/departments/${d.id}`}
                        className="hover:underline"
                      >
                        {d.name}
                      </Link>
                    </CardTitle>
                  </div>
                  <JoinLeaveButton
                    departmentId={d.id}
                    isMember={d.myRole !== null}
                    isAdmin={d.myRole === "ADMIN"}
                  />
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> {d.memberCount}
                </span>
                <span className="flex items-center gap-1">
                  <FolderKanban className="h-4 w-4" /> {d.groupCount} groups
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
