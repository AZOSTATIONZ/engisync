import {
  KeyRound,
  LogIn,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Smartphone,
} from "lucide-react";
import { describeDevice } from "@/lib/device";
import { describeSecurityAction, recentSecurityEvents } from "@/lib/security-events";
import { SignOutEverywhere } from "./sign-out-everywhere";

/**
 * The account's own security history.
 *
 * `AuditLog` has been written to since the beginning and read by NOTHING —
 * 31 action types recorded and no screen anywhere that showed them. A trail
 * nobody can see is indistinguishable from no trail at the moment you need
 * one, which is why "can a student tell whether someone else has been in
 * their account?" had the answer "no" despite the data existing.
 *
 * Deliberately shows FAILED attempts alongside successful ones. A run of
 * failures followed by a success is the signature of someone guessing their
 * way in, and it is the single most useful thing a person can notice about
 * their own account.
 */

const ICONS: Record<string, typeof LogIn> = {
  LOGIN_SUCCEEDED: LogIn,
  LOGIN_FAILED: ShieldX,
  LOGIN_BLOCKED_RATE_LIMIT: ShieldAlert,
  LOGIN_NEW_DEVICE: Smartphone,
  LOGIN_BACKUP_CODE_USED: KeyRound,
  PASSWORD_RESET: KeyRound,
  "2FA_ENABLED": ShieldCheck,
  "2FA_DISABLED": ShieldAlert,
  "2FA_BACKUP_CODES_REGENERATED": KeyRound,
};

/** Events that deserve visual weight — the ones worth a second look. */
const NOTABLE = new Set([
  "LOGIN_FAILED",
  "LOGIN_BLOCKED_RATE_LIMIT",
  "LOGIN_NEW_DEVICE",
  "LOGIN_BACKUP_CODE_USED",
  "2FA_DISABLED",
]);

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export async function AccountActivity({ userId }: { userId: string }) {
  const events = await recentSecurityEvents(userId, 20);

  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing recorded yet. Sign-ins, failed attempts and security changes
          will appear here from now on.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {events.map((e) => {
            const Icon = ICONS[e.action] ?? LogIn;
            const notable = NOTABLE.has(e.action);
            return (
              <li key={e.id} className="flex items-start gap-3 p-3 text-sm">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    notable ? "text-amber-600" : "text-muted-foreground"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={notable ? "font-medium" : ""}>
                    {describeSecurityAction(e.action)}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {describeDevice(e.userAgent)}
                    {e.ipAddress && e.ipAddress !== "unknown" && ` · ${e.ipAddress}`}
                    {" · "}
                    {when.format(e.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-md border p-3">
        <p className="text-sm font-medium">Don&apos;t recognise something?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Signing out everywhere ends every session on every device,
          including this one, so you&apos;ll need to log in again. If you
          think someone else knows your password, reset it instead — that
          signs everyone out AND stops them getting back in.
        </p>
        <div className="mt-3">
          <SignOutEverywhere />
        </div>
      </div>
    </div>
  );
}
