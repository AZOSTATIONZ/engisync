"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import {
  ACCENTS,
  ACCENT_KEYS,
  AVATAR_CATEGORIES,
  AVATAR_STYLES,
  LIMITS,
  resolveAccent,
  resolveAvatarStyle,
  type AccentKey,
  type AvatarStyle,
} from "@/lib/personalization";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile, type ProfileState } from "./profile-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save profile"}
    </Button>
  );
}

/**
 * Profile and appearance.
 *
 * The avatar and accent preview LIVE as you click, before saving. Personalizing
 * is one of the few genuinely enjoyable moments in an academic tool, and a
 * choice you can't see until after a page reload isn't a choice — it's a form
 * field.
 */
export function ProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    name: string;
    headline: string;
    bio: string;
    skills: string[];
    accentColor: string | null;
    avatarStyle: string | null;
    image: string | null;
  };
}) {
  const [state, action] = useActionState<ProfileState, FormData>(
    saveProfile,
    null,
  );

  const [accent, setAccent] = useState<AccentKey>(
    resolveAccent(initial.accentColor),
  );
  const [style, setStyle] = useState<AvatarStyle>(
    resolveAvatarStyle(initial.avatarStyle, userId),
  );
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);

  return (
    <form action={action} className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar
          userId={userId}
          name={name}
          image={initial.image}
          accentColor={accent}
          avatarStyle={style}
          size="xl"
        />
        <div className="min-w-0">
          <p className="font-semibold">{name || "Your name"}</p>
          <p className="text-sm text-muted-foreground">
            {initial.image
              ? "Using the picture from your sign-in provider."
              : "Generated from your account — no upload, no data cost."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          name="headline"
          defaultValue={initial.headline}
          maxLength={LIMITS.headline}
          placeholder="Electronic Engineering · Year 3"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">About</Label>
        <Textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, LIMITS.bio))}
          placeholder="What you're working on, what you'd like to work on."
        />
        <p className="text-xs text-muted-foreground">
          {bio.length}/{LIMITS.bio}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skills">Skills</Label>
        <Input
          id="skills"
          name="skills"
          defaultValue={initial.skills.join(", ")}
          placeholder="MATLAB, KiCad, SolidWorks, Python"
        />
        <p className="text-xs text-muted-foreground">
          Separate with commas — up to {LIMITS.skills}.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Accent colour</legend>
        <input type="hidden" name="accentColor" value={accent} />
        <div className="flex flex-wrap gap-2">
          {ACCENT_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setAccent(k)}
              aria-pressed={accent === k}
              aria-label={ACCENTS[k].label}
              title={ACCENTS[k].label}
              className="flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110"
              style={{
                backgroundColor: ACCENTS[k].swatch,
                boxShadow: accent === k ? `0 0 0 2px ${ACCENTS[k].swatch}` : undefined,
              }}
            >
              {/* A tick, not colour alone — the selected state must be visible
                  to someone who cannot distinguish these hues. */}
              {accent === k && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
      </fieldset>

      {!initial.image && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Avatar</legend>
          <input type="hidden" name="avatarStyle" value={style} />
          {/* Grouped by category — eleven ungrouped swatches is a wall, and
              someone who wants an animal shouldn't have to scan past gears. */}
          {AVATAR_CATEGORIES.map((cat) => (
            <div key={cat} className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {cat}
              </p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_STYLES.filter((s) => s.category === cat).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStyle(s.key)}
                    aria-pressed={style === s.key}
                    title={s.label}
                    className={`rounded-xl border p-1.5 transition-colors hover:bg-accent ${
                      style === s.key ? "border-primary bg-accent" : ""
                    }`}
                  >
                    <Avatar
                      userId={userId}
                      name={name}
                      accentColor={accent}
                      avatarStyle={s.key}
                      size="md"
                    />
                    <span className="sr-only">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="flex items-center gap-1.5 text-sm text-green-600">
          <Check className="h-4 w-4" /> {state.success}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
