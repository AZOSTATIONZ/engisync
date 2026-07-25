import { prisma } from "@/lib/prisma";

/** Read an admin-controlled setting. */
export async function getSetting(key: string): Promise<string | null> {
  const s = await prisma.appSetting.findUnique({ where: { key } });
  return s?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Whether AI features are switched on by the administrator (default: on). */
export async function isAiEnabledByAdmin(): Promise<boolean> {
  const v = await getSetting("ai_enabled");
  return v === null ? true : v === "true";
}
