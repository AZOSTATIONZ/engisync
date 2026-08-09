"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The one and only time recovery codes are readable.
 *
 * They are stored as hashes, so this panel cannot be re-rendered later from
 * the server — if the user closes it without saving the codes, they are gone
 * for good and the account is one lost phone away from being unrecoverable.
 *
 * Hence the acknowledgement gate. It is deliberately a small piece of
 * friction on an otherwise smooth flow: the alternative is a user who
 * believes they are protected and is in fact one step from lockout, which is
 * the exact failure this whole feature exists to remove. Copy and download
 * are offered because "select ten codes with a fingertip" is not a real
 * option on the phones most of these students use.
 */
export function RecoveryCodes({
  codes,
  onAcknowledge,
}: {
  codes: string[];
  onAcknowledge: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const asText =
    `EngiSync recovery codes\n` +
    `Generated ${new Date().toISOString().slice(0, 10)}\n\n` +
    codes.join("\n") +
    `\n\nEach code works once. Keep them somewhere you can reach ` +
    `WITHOUT your phone.\n`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, permission, older Android).
      // The codes are on screen and downloadable — no need to raise an error.
    }
  }

  function download() {
    // Built and revoked locally; nothing leaves the device.
    const url = URL.createObjectURL(new Blob([asText], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "engisync-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }

  return (
    <div className="space-y-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium">Save your recovery codes now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            These are shown once and cannot be retrieved later. If you lose
            your phone, they are the only way back into your account. Each one
            works a single time.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-background/70 p-3 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="select-all tracking-wider">
            {c}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy
            </>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={download}>
          <Download className="h-4 w-4" /> Download
        </Button>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-input"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        <span>
          I&apos;ve saved these somewhere I can reach without my phone.
        </span>
      </label>

      <Button size="sm" disabled={!saved} onClick={onAcknowledge}>
        Done
      </Button>
    </div>
  );
}
