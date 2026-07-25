import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Liveness/readiness probe: verifies the app and DB connection. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "degraded", db: "down" },
      { status: 503 },
    );
  }
}
