"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
// TYPE-ONLY. A value import here pulls the generated Prisma client into the
// BROWSER bundle, and the page dies at runtime with a webpack module error
// ("Cannot read properties of undefined (reading 'call')") that names
// neither Prisma nor this file. The enum is only ever used as a type in this
// component; `import type` is erased at compile time and keeps the server
// runtime on the server.
import type { NotificationCategory } from "@prisma/client";
import { setNotificationPreference, setQuietHours } from "./notification-actions";
import { Button } from "@/components/ui/button";

type Row = {
  category: NotificationCategory;
  label: string;
  hint: string;
  email: boolean;
  push: boolean;
  locked: boolean;
};

/**
 * Per-category notification controls.
 *
 * SIX ROWS, NOT TWENTY-THREE. The brief listed 23 notification kinds and it
 * would be easy to render 23 switches. Nobody configures 23 switches; they
 * either leave the defaults or turn everything off, and turning everything off
 * is how a deadline reminder stops arriving. Six categories is a set a person
 * can hold in their head long enough to make a real decision.
 *
 * IN-APP IS NOT A COLUMN HERE. The bell always records everything. Letting it
 * be silenced would allow a student to reach a state where a supervisor's
 * rejection is invisible with nothing indicating anything was hidden — muting
 * belongs on the channels that interrupt you, not on the log.
 */
export function NotificationPreferences({
  rows,
  quietStart,
  quietEnd,
  emailConfigured,
}: {
  rows: Row[];
  quietStart: number | null;
  quietEnd: number | null;
  emailConfigured: boolean;
}) {
  const [state, setState] = useState(rows);
  const [start, setStart] = useState<number | "">(quietStart ?? "");
  const [end, setEnd] = useState<number | "">(quietEnd ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(category: NotificationCategory, channel: "email" | "push") {
    const row = state.find((r) => r.category === category);
    if (!row || row.locked) return;

    const next = !row[channel];
    const other = channel === "email" ? row.push : row.email;

    // Optimistic: a checkbox that waits ~300ms for Neon before moving feels
    // broken, and the failure path below puts it back.
    setState((s) =>
      s.map((r) => (r.category === category ? { ...r, [channel]: next } : r)),
    );

    startTransition(async () => {
      const res = await setNotificationPreference(category, channel, next, other);
      if (res?.error) {
        setErr(res.error);
        setState((s) =>
          s.map((r) => (r.category === category ? { ...r, [channel]: !next } : r)),
        );
      }
    });
  }

  function saveQuiet(clear = false) {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const res = clear
        ? await setQuietHours(null, null)
        : await setQuietHours(
            start === "" ? null : Number(start),
            end === "" ? null : Number(end),
          );
      if (res?.error) setErr(res.error);
      else {
        setMsg(res?.success ?? "Saved.");
        if (clear) {
          setStart("");
          setEnd("");
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">What</th>
              <th className="pb-2 text-center font-medium">Email</th>
              <th className="pb-2 text-center font-medium">Push</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {state.map((r) => (
              <tr key={r.category}>
                <td className="py-3 pr-4">
                  <p className="font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.hint}</p>
                </td>
                {(["email", "push"] as const).map((channel) => (
                  <td key={channel} className="py-3 text-center">
                    {r.locked ? (
                      <Lock
                        className="mx-auto h-4 w-4 text-muted-foreground"
                        aria-label="Always on"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        // 20px on a touch screen inside a 44px-tall row —
                        // the row height is what makes this tappable.
                        className="h-5 w-5 rounded border-input align-middle"
                        checked={r[channel]}
                        disabled={pending || (channel === "email" && !emailConfigured)}
                        onChange={() => toggle(r.category, channel)}
                        aria-label={`${r.label} — ${channel}`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!emailConfigured && (
        <p className="text-xs text-muted-foreground">
          Email delivery isn&apos;t configured on this server yet, so those
          boxes are disabled. Your choices are saved and will apply once it is.
        </p>
      )}

      <div className="border-t pt-4">
        <p className="text-sm font-medium">Quiet hours</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Non-urgent email waits until morning and arrives in your daily
          summary. Overdue work and security alerts still come through — those
          are worse to learn late than to be woken by.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">From</span>
            <select
              className="h-11 rounded-md border border-input bg-background px-2 text-sm sm:h-10"
              value={start}
              onChange={(e) => setStart(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">—</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">To</span>
            <select
              className="h-11 rounded-md border border-input bg-background px-2 text-sm sm:h-10"
              value={end}
              onChange={(e) => setEnd(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">—</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" disabled={pending} onClick={() => saveQuiet(false)}>
            Save
          </Button>
          {(quietStart !== null || quietEnd !== null) && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => saveQuiet(true)}
            >
              Turn off
            </Button>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {msg && <p className="text-sm text-green-600">{msg}</p>}
    </div>
  );
}
