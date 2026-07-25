import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Construction className="h-10 w-10 text-primary" />
          <p className="font-medium">Coming in {phase}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            This module is part of the EngiSync roadmap. The foundation
            (auth, roles, data model, and UI shell) is in place and ready to
            build on.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
