import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/verification";
import { isEmailReserved } from "@/lib/account-lifecycle";

export async function POST(req: Request) {
  try {
    // Throttle signups: 5 per 10 minutes per IP.
    const ip = clientIp(req.headers);
    const limit = rateLimit(`register:${ip}`, 5, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // Identity security: block re-registration of a recently deleted account's
    // email during the cooling-off window (anti account-recycling/impersonation).
    if (await isEmailReserved(email)) {
      return NextResponse.json(
        {
          error:
            "This email was recently used by a deleted account and is temporarily reserved. Please try again later or contact support.",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "USER_REGISTERED", target: user.email },
    });

    // Send a verification email. Never blocks registration, but the outcome is
    // logged and reported so a misconfiguration is visible instead of silent.
    let verification: { sent: boolean; reason?: string } = { sent: false };
    try {
      const res = await sendVerificationEmail(user.id, user.email);
      verification = res.ok ? { sent: true } : { sent: false, reason: res.reason };
    } catch (e) {
      console.error("[register] verification email threw:", e);
      verification = { sent: false, reason: "send-failed" };
    }

    return NextResponse.json({ user, verification }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
