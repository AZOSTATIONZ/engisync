"use client";

import { useState, useTransition } from "react";
import type { AvatarPresentation } from "@prisma/client";
import type { Discipline } from "@/lib/project-hub";
import { AvatarScene } from "@/components/avatar/avatar-scene";
import { setAvatarPresentation } from "./avatar-actions";

const OPTIONS: { value: AvatarPresentation; label: string }[] = [
  { value: "NEUTRAL", label: "Neutral" },
  { value: "FEMININE", label: "Feminine" },
  { value: "MASCULINE", label: "Masculine" },
];

/**
 * Choosing the figure in the dashboard scene.
 *
 * THE PREVIEW IS THE CONTROL. Three live scenes, and you pick the one that
 * looks like you — no radio buttons describing something you cannot see, and
 * no reload to find out what you chose. It costs nothing to render all three
 * because each is a few kilobytes of inline SVG sharing one stylesheet.
 *
 * WORDED AS APPEARANCE, NOT IDENTITY. The question is "which figure would you
 * like?", not "what is your gender?". That is not squeamishness: the product
 * genuinely does not need to know anything about a person to draw a cartoon,
 * and asking the broader question would mean holding a sensitive answer about
 * a real student in order to pick an SVG. Neutral is first and is the default,
 * so nobody has to answer at all.
 */
export function AvatarPresentationPicker({
  initial,
  discipline,
}: {
  initial: AvatarPresentation;
  discipline: Discipline;
}) {
  const [value, setValue] = useState<AvatarPresentation>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function choose(next: AvatarPresentation) {
    const previous = value;
    setValue(next); // Optimistic — the preview should move with the click.
    setMsg(null);
    startTransition(async () => {
      const res = await setAvatarPresentation(next);
      if (res?.error) {
        setValue(previous);
        setMsg(res.error);
      } else {
        setMsg("Saved.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The engineer on your dashboard comes from your department. Choose the
        figure you&apos;d like to see — this only changes the drawing.
      </p>

      <fieldset disabled={pending}>
        <legend className="sr-only">Avatar appearance</legend>
        <div className="grid grid-cols-3 gap-3">
          {OPTIONS.map((o) => {
            const active = value === o.value;
            return (
              <label
                key={o.value}
                className={`cursor-pointer rounded-xl border p-2 text-center transition-colors ${
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="avatarPresentation"
                  value={o.value}
                  checked={active}
                  onChange={() => choose(o.value)}
                  className="sr-only"
                />
                {/* The scene itself, at the size it will actually appear.
                    `describe={false}` because this label already says which
                    option it is — see the note on the prop. */}
                <AvatarScene
                  discipline={discipline}
                  presentation={o.value}
                  describe={false}
                />
                <span className="mt-1 block text-xs font-medium">{o.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p aria-live="polite" className="text-sm text-green-600 empty:hidden">
        {msg ?? ""}
      </p>
    </div>
  );
}
