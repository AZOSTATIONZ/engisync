import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Web push via the free VAPID scheme (no third-party service required).
 * Generate keys once with:  npx web-push generate-vapid-keys
 * and put them in .env as NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY.
 */

export function isPushConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@engisync.dev",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  configured = true;
}

export type PushPayload = { title: string; body?: string; url?: string };

/** Send a push to all of a user's subscriptions; prune dead ones. */
export async function sendPush(userId: string, payload: PushPayload) {
  if (!isPushConfigured()) return;
  configure();

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          // Subscription expired/unsubscribed — remove it.
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }),
  );
}
