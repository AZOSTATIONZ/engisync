import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The bridge from "this looks interesting" to an actual group project.
 *
 * Without this the hub is a reading list. The slug is passed rather than the
 * title and summary, so the workspace page resolves the content from the
 * catalogue itself — a link someone shares cannot inject arbitrary text into
 * the create form.
 *
 * Deliberately a plain server-rendered link, not a client component: there is
 * no state here, and shipping JavaScript for a hyperlink is waste on a mobile
 * data bundle.
 */
export function StartFromHub({ slug }: { slug: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="min-w-0">
        <p className="font-medium">Build this with your group</p>
        <p className="text-sm text-muted-foreground">
          Creates a group pre-filled with this brief — then plan tasks, track
          contributions and publish it when you&apos;re done.
        </p>
      </div>
      <Button asChild>
        <Link href={`/dashboard/workspaces?from=${encodeURIComponent(slug)}`}>
          <Rocket className="h-4 w-4" />
          Start this project
        </Link>
      </Button>
    </div>
  );
}
