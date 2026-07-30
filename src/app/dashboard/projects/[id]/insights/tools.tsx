"use client";

import { useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { generateAnalyticsInsights } from "./actions";
import { Button } from "@/components/ui/button";

type Row = { name: string; openTasks: number; completed: number; hours: number };

export function ExportCsvButton({
  workspaceName,
  rows,
}: {
  workspaceName: string;
  rows: Row[];
}) {
  function download() {
    const header = "Member,Open tasks,Completed,Hours\n";
    const body = rows
      .map((r) => `"${r.name.replace(/"/g, '""')}",${r.openTasks},${r.completed},${r.hours}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workspaceName.replace(/[^a-z0-9]+/gi, "_")}_analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download}>
      <Download className="h-4 w-4" /> Export CSV
    </Button>
  );
}

export function InsightsPanel({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Button
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await generateAnalyticsInsights(workspaceId);
          setLoading(false);
          if (res?.error) setError(res.error);
          else setResult(res?.result ?? "");
        }}
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "Analyzing…" : "Generate AI insights"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-sm">
          {result}
        </div>
      )}
    </div>
  );
}
