import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Save a browser push subscription for the current user. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await req.json().catch(() => null);
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth_ = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth_) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth: auth_, userId: session.user.id },
    update: { p256dh, auth: auth_, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}

/** Remove a push subscription (on unsubscribe). */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint, userId: session.user.id } })
      .catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
