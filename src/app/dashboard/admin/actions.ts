"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plan, SystemRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setSetting } from "@/lib/app-settings";

export type AdminState = { error?: string; success?: string } | null;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.systemRole !== SystemRole.ADMIN) {
    return null;
  }
  return session.user;
}

export async function setAiEnabled(enabled: boolean): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };
  await setSetting("ai_enabled", enabled ? "true" : "false");
  await prisma.auditLog.create({
    data: { userId: admin.id, action: enabled ? "AI_ENABLED_ADMIN" : "AI_DISABLED_ADMIN" },
  });
  revalidatePath("/dashboard/admin");
  return { success: enabled ? "AI enabled." : "AI disabled." };
}

export async function setUserPlan(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "") as Plan;
  if (!["FREE", "STUDENT_PREMIUM", "UNIVERSITY"].includes(plan)) {
    return { error: "Pick a valid plan." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: `No user found with email ${email}.` };

  await prisma.user.update({ where: { id: user.id }, data: { plan } });
  await prisma.auditLog.create({
    data: { userId: admin.id, action: "USER_PLAN_SET", target: user.id, metadata: { plan } },
  });
  revalidatePath("/dashboard/admin");
  return { success: `${email} is now on the ${plan.replace("_", " ")} plan.` };
}
