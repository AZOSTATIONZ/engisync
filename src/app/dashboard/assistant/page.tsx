import type { Metadata } from "next";
import { Sparkles, KeyRound } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";
import { isAIConfigured, providerLabel } from "@/lib/ai";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Assistant, type Option } from "./assistant-ui";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  const session = await auth();
  const wsIds = await userWorkspaceIds(session!.user.id);
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: wsIds } },
    select: { id: true, name: true },
  });
  const workspaceOptions: Option[] = workspaces.map((w) => ({
    id: w.id,
    label: w.name,
  }));

  const configured = isAIConfigured();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="text-muted-foreground">
            Summarize notes, generate tasks, spot risks, and get engineering
            guidance.
          </p>
        </div>
      </div>

      {!configured ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-5 w-5 text-primary" /> Configure AI to get started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Add an API key to your <code>.env</code> file, then{" "}
              <strong>restart the server</strong> — environment variables are
              only read at startup, so editing <code>.env</code> while the app
              is running changes nothing.
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
{`# Free tier, no card required — recommended:
GEMINI_API_KEY="AIza…"         # from aistudio.google.com/apikey

# Or a paid provider:
ANTHROPIC_API_KEY="sk-ant-…"   # from console.anthropic.com
OPENAI_API_KEY="sk-…"          # from platform.openai.com

AI_DISABLED="false"            # must also be false`}
            </pre>
            <p>
              Google issues keys in more than one format (<code>AIza…</code>{" "}
              and <code>AQ.…</code>) — either works. When several keys are set,{" "}
              <code>AI_PROVIDER</code>{" "}
              (gemini | anthropic | openai) decides, and <code>AI_MODEL</code>{" "}
              overrides the default model.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Provider: <span className="font-medium">{providerLabel()}</span>
          </p>
          <Assistant workspaces={workspaceOptions} />
        </>
      )}
    </div>
  );
}
