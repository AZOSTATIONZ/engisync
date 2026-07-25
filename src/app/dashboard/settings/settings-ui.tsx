"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmailNotifications } from "./actions";
import { Button } from "@/components/ui/button";

export function EmailNotificationToggle({
  initial,
  disabled,
}: {
  initial: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (disabled) return;
    setBusy(true);
    const next = !on;
    setOn(next);
    await updateEmailNotifications(next);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy || disabled}
      onClick={toggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? "bg-primary" : "bg-muted"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle({
  publicKey,
  configured,
}: {
  publicKey: string;
  configured: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Permission denied.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("Failed to save subscription");
      setSubscribed(true);
      setMsg("Push notifications enabled on this device.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not enable push.");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Push disabled on this device.");
    } catch {
      setMsg("Could not disable push.");
    }
    setBusy(false);
  }

  if (!configured) {
    return (
      <p className="text-xs text-muted-foreground">
        Push isn&apos;t configured on this server. Add VAPID keys to enable it.
      </p>
    );
  }
  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        This browser doesn&apos;t support push notifications.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {subscribed ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={disable}>
          {busy ? "…" : "Disable push on this device"}
        </Button>
      ) : (
        <Button size="sm" disabled={busy} onClick={enable}>
          {busy ? "…" : "Enable push on this device"}
        </Button>
      )}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

