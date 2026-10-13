"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

/**
 * Copy / share controls for the install link.
 *
 * Split out of the page so the page itself stays a server component — the QR
 * code is generated on the server and there is no reason to ship the whole
 * page's markup to the client for two buttons.
 *
 * Web Share is offered first where it exists, because it opens WhatsApp
 * directly, which is how this link will actually travel between students.
 */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked. The URL is printed next to this button anyway.
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "EngiSync",
        text: "Install our engineering project app:",
        url,
      });
    } catch {
      // Cancelled or unsupported — copy remains.
    }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-accent"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-accent"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      )}
    </div>
  );
}
