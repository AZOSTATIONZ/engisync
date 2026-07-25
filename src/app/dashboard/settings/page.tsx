import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, providerName } from "@/lib/email";
import { isPushConfigured } from "@/lib/push";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmailNotificationToggle, PushToggle } from "./settings-ui";
import { TwoFactor } from "./twofactor-ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      name: true,
      email: true,
      emailNotifications: true,
      systemRole: true,
      twoFactorEnabled: true,
    },
  });

  const emailReady = isEmailConfigured();
  const pushReady = isPushConfigured();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and notification preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{user?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span>{user?.systemRole}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            In-app notifications are always on. Email delivery is optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email me notifications</p>
              <p className="text-xs text-muted-foreground">
                {emailReady
                  ? `Delivered via ${providerName()}.`
                  : "Email isn't configured on this server yet."}
              </p>
            </div>
            <EmailNotificationToggle
              initial={user?.emailNotifications ?? false}
              disabled={!emailReady}
            />
          </div>
          {!emailReady && (
            <p className="text-xs text-muted-foreground">
              Add <code>RESEND_API_KEY</code> or SMTP settings to your{" "}
              <code>.env</code> to enable email.
            </p>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-medium">Browser push notifications</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Get desktop/mobile push alerts even when EngiSync isn&apos;t open.
            </p>
            <PushToggle publicKey={vapidPublicKey} configured={pushReady} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>
            Two-factor authentication (2FA) with an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactor enabled={user?.twoFactorEnabled ?? false} />
        </CardContent>
      </Card>

      {user?.systemRole === "ADMIN" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Administration</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="/dashboard/admin"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open the admin panel (AI & plans) →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
