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
import {
  EmailNotificationToggle,
  EssentialEmailToggle,
  PushToggle,
} from "./settings-ui";
import { ProfileForm } from "./profile-form";
import { TwoFactor } from "./twofactor-ui";
import { DeleteAccountSection } from "./delete-account";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      name: true,
      email: true,
      emailNotifications: true,
      essentialEmails: true,
      systemRole: true,
      twoFactorEnabled: true,
      headline: true,
      bio: true,
      skills: true,
      accentColor: true,
      avatarStyle: true,
      image: true,
    },
  });

  const emailReady = isEmailConfigured();
  const pushReady = isPushConfigured();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and notification preferences.
        </p>
      </div>

      {/* Profile leads: it is the only section that is genuinely about the
          person rather than about configuration. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile &amp; appearance</CardTitle>
          <CardDescription>
            How you appear to your team, and the accent colour used across
            EngiSync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            userId={session!.user.id}
            initial={{
              name: user?.name ?? "",
              headline: user?.headline ?? "",
              bio: user?.bio ?? "",
              skills: user?.skills ?? [],
              accentColor: user?.accentColor ?? null,
              avatarStyle: user?.avatarStyle ?? null,
              image: user?.image ?? null,
            }}
          />
        </CardContent>
      </Card>

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
          {/* Essential first — it is on by default and the one most people
              should leave alone. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Announcements and deadlines
              </p>
              <p className="text-xs text-muted-foreground">
                Announcements from your leader, tasks assigned to you, and
                deadline reminders. Recommended.
              </p>
            </div>
            <EssentialEmailToggle initial={user?.essentialEmails ?? true} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Everything else</p>
              <p className="text-xs text-muted-foreground">
                {emailReady
                  ? `Activity, discussions and other updates. Delivered via ${providerName()}.`
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

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanent actions that affect your whole account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountSection
            twoFactorEnabled={user?.twoFactorEnabled ?? false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
