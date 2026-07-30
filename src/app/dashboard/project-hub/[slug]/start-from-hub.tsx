import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

/**
 * The bridge from "this looks interesting" to an actual group project.
 *
 * Without this the hub is a reading list. The slug is passed rather than the
 * title and summary, so this page resolves the content from the
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
        <p className="font-medium">Build this with your team</p>
        <p className="text-sm text-muted-foreground">
          Creates a project pre-filled with this brief — then plan tasks, track
          contributions and publish it when you&apos;re done.
        </p>
      </div>
      <Button asChild>
        <Link href={`${routes.newProject}?from=${encodeURIComponent(slug)}`}>
          <Rocket className="h-4 w-4" />
          Start this project
        </Link>
      </Button>
    </div>
  );
}
