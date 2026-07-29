"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Check, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePublicProfile, type ProfileState } from "./profile-actions";

function SaveButton({ publishing }: { publishing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={publishing ? "default" : "outline"}>
      {pending ? "Saving…" : publishing ? "Publish profile" : "Make private"}
    </Button>
  );
}

/**
 * Publish the portfolio at /p/&lt;handle&gt;.
 *
 * The URL is shown live as the handle is typed, and the list of what becomes
 * public is stated plainly BEFORE the button rather than in a tooltip after
 * it. Someone publishing their work to the open internet should be able to
 * predict exactly what a stranger will see.
 */
export function PublicProfileForm({
  initialHandle,
  initialPublic,
  suggestion,
}: {
  initialHandle: string;
  initialPublic: boolean;
  /** Derived from their name — a handle nobody has to invent. */
  suggestion: string;
}) {
  const [state, action] = useActionState<ProfileState, FormData>(
    updatePublicProfile,
    null,
  );
  const [handle, setHandle] = useState(initialHandle || suggestion);
  const [isPublic, setIsPublic] = useState(initialPublic);

  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="publicProfile"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">
            Publish my engineering portfolio
          </span>
          <span className="block text-xs text-muted-foreground">
            Anyone with the link can see it, including employers. Off by
            default.
          </span>
        </span>
      </label>

      {isPublic && (
        <>
          <div className="space-y-2">
            <Label htmlFor="handle">Your link</Label>
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-sm text-muted-foreground">
                engisync.vercel.app/p/
              </span>
              <Input
                id="handle"
                name="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                maxLength={30}
                className="max-w-[14rem]"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Letters, numbers and hyphens. 3–30 characters.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs">
            <p className="mb-1 font-medium">What a visitor will see</p>
            <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
              <li>Your name, headline, department, bio and skills</li>
              <li>Projects your supervisor approved and published</li>
              <li>Badges earned from that work</li>
            </ul>
            <p className="mb-1 mt-2 font-medium">What stays private</p>
            <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
              {/* Financial participation is excluded by `publicBadges()` — a
                  visitor cannot infer whether you could afford to contribute. */}
              <li>Your email address, always</li>
              <li>Anything about money — contributions and budgets</li>
              <li>Tasks, deadlines and day-to-day activity</li>
              <li>Unpublished or unapproved projects</li>
            </ul>
          </div>
        </>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="flex items-center gap-1.5 text-sm text-green-600">
          <Check className="h-4 w-4" /> {state.success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton publishing={isPublic} />
        {initialPublic && initialHandle && (
          <Link
            href={`/p/${initialHandle}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Globe className="h-4 w-4" /> View live
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </form>
  );
}
