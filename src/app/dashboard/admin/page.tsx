import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SystemRole } from "@prisma/client";
import { ShieldCheck } from "lucide-react";
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
import { AiToggle, SetPlanForm } from "./admin-ui";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await auth();
  if (session!.user.systemRole !== SystemRole.ADMIN) redirect("/dashboard");

  const [aiEnabled] = await Promise.all([isAiEnabledByAdmin()]);
  const configured = isAIConfigured();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin panel</h1>
          <p className="text-muted-foreground">University-wide AI and plans.</p>
        </div>
      </div>

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
    </div>
  );
}
