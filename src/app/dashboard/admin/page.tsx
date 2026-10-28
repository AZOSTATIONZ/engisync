import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SystemRole } from "@prisma/client";
import {
  ShieldCheck,
  Users,
  Activity,
  Building,
  FolderKanban,
  GraduationCap,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { auth } from "@/auth";
import { isAiEnabledByAdmin } from "@/lib/app-settings";
import { isAIConfigured, providerLabel } from "@/lib/ai";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiToggle, SetPlanForm, UserManagement, AuditLogViewer } from "./admin-ui";
import { getAdminMetrics } from "./actions";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await auth();
  if (session!.user.systemRole !== SystemRole.ADMIN) redirect("/dashboard");

  const [aiEnabled, metrics] = await Promise.all([
    isAiEnabledByAdmin(),
    getAdminMetrics(),
  ]);
  const configured = isAIConfigured();

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="page-title">Admin panel</h1>
          <p className="text-muted-foreground">
            Platform overview, user management and system configuration.
          </p>
        </div>
      </div>

      {/* ── Metrics ────────────────────────────────────────────── */}
      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Users} label="Total users" value={metrics.totalUsers} />
          <MetricCard icon={Activity} label="Active (30d)" value={metrics.activeUsers} />
          <MetricCard icon={Building} label="Departments" value={metrics.departments} />
          <MetricCard icon={FolderKanban} label="Projects" value={metrics.activeProjects} />
          <MetricCard icon={GraduationCap} label="Eligible supervisors" value={metrics.eligibleSupervisors} />
          <MetricCard
            icon={AlertTriangle}
            label="Without supervisor"
            value={metrics.unsupervisedProjects}
            alert={metrics.unsupervisedProjects > 0}
          />
          <MetricCard icon={ClipboardList} label="Pending join requests" value={metrics.pendingJoinRequests} />
        </div>
      )}

      {/* ── User management ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User management</CardTitle>
          <CardDescription>
            Search users, change system roles and subscription plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagement />
        </CardContent>
      </Card>

      {/* ── AI features ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI features</CardTitle>
          <CardDescription>
            Turn the whole AI module on or off for everyone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">AI enabled</p>
              <p className="text-xs text-muted-foreground">
                Provider: {configured ? providerLabel() : "no API key set"}
              </p>
            </div>
            <AiToggle initial={aiEnabled} />
          </div>
          {!configured && (
            <p className="text-xs text-muted-foreground">
              Add one of <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>,{" "}
              <code>GEMINI_API_KEY</code>, or <code>LOCAL_AI_URL</code> to activate AI.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Subscription plans ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription plans</CardTitle>
          <CardDescription>
            Assign a user&apos;s plan. Free has a daily AI limit; Premium and
            University are unlimited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetPlanForm />
        </CardContent>
      </Card>

      {/* ── Audit log ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit log</CardTitle>
          <CardDescription>
            Recent administrative and security events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogViewer />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  alert = false,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-destructive/40" : ""}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${alert ? "bg-destructive/10" : "bg-primary/10"}`}>
          <Icon className={`h-5 w-5 ${alert ? "text-destructive" : "text-primary"}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
