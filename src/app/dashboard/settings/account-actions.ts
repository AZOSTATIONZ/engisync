"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, emailLayout, isEmailConfigured } from "@/lib/email";
import { getBaseUrl } from "@/lib/qr";
import {
  verifyOwnership,
  createDeletionToken,
  getDeletionBlockers,
  executeDeletion,
} from "@/lib/account-lifecycle";

export type DeleteState = { error?: string; success?: string } | null;

/**
 * Step 1 of account deletion: re-authenticate, check for orphaned groups,
 * then email a single-use confirmation link. Nothing is destroyed here.
 */
export async function requestAccountDeletion(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Throttle: deletion is a high-value target for a hijacked session.
  const limit = rateLimit(`delete-account:${userId}`, 3, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many attempts. Please wait 15 minutes and try again." };
  }

  const password = String(formData.get("password") ?? "");
  const totpCode = String(formData.get("totpCode") ?? "").trim() || undefined;
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (confirm !== "DELETE") {
    return { error: 'Type DELETE in the confirmation box to continue.' };
  }
  if (!password) return { error: "Enter your password." };

  const auth1 = await verifyOwnership(userId, password, totpCode);
  if (!auth1.ok) return { error: auth1.error };

  const blockers = await getDeletionBlockers(userId);
  if (blockers.length > 0) {
    return {
      error: `You're the only leader of ${blockers
        .map((b) => `"${b.name}"`)
        .join(", ")}. Promote another member to co-leader, or delete the group, then try again.`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return { error: "Account not found." };

  if (!isEmailConfigured()) {
    return {
      error:
        "Account deletion requires email confirmation, which isn't configured on this server. Contact the administrator.",
    };
  }

  const token = await createDeletionToken(userId);
  const url = `${await getBaseUrl()}/dashboard/settings/delete/${token}`;

  const res = await sendEmail({
    to: user.email,
    subject: "Confirm your EngiSync account deletion",
    html: emailLayout(
      "Confirm account deletion",
      `<p>You asked to permanently delete your EngiSync account.</p>
       <p><strong>This cannot be undone.</strong> Your projects, tasks, files and personal data will be removed.</p>
       <p><a href="${url}">Confirm deletion</a> — this link expires in 1 hour and can be used once.</p>
       <p style="color:#64748b;font-size:12px">If you did not request this, ignore this email and change your password immediately.</p>`,
    ),
  });
  if (!res.sent) {
    return { error: `Couldn't send the confirmation email: ${res.error ?? "unknown error"}.` };
  }

  await prisma.auditLog.create({
    data: { userId, action: "ACCOUNT_DELETION_REQUESTED", target: "self" },
  });

  return {
    success:
      "Confirmation email sent. Open the link within 1 hour to permanently delete your account.",
  };
}

/** Step 2: consume the emailed token, delete, then sign out. */
export async function confirmAccountDeletion(token: string): Promise<DeleteState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await executeDeletion(token);
  if (!result.ok) return { error: result.error };

  await signOut({ redirectTo: "/?deleted=1" });
  return { success: "Account deleted." };
}
