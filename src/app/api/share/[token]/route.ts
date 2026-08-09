import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { fileLocation, readFileBytes } from "@/lib/file-bytes";

/**
 * Public download via a temporary access key (no auth required).
 * Enforces expiry, download limits, and revocation, and logs access.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Throttle public download attempts: 30 per minute per IP.
  const limit = rateLimit(`share:${clientIp(req.headers)}`, 30, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  // `include: { file: true }` pulled the whole blob column on EVERY request,
  // including the ones rejected below for expiry or revocation. Selecting the
  // metadata means an expired link now costs kilobytes instead of megabytes,
  // on a public endpoint anyone can hammer.
  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      fileId: true,
      revoked: true,
      expiresAt: true,
      maxDownloads: true,
      downloadCount: true,
      file: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          storageKey: true,
          externalUrl: true,
        },
      },
    },
  });

  if (!link || link.revoked) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }
  if (link.maxDownloads !== null && link.downloadCount >= link.maxDownloads) {
    return NextResponse.json(
      { error: "This link has reached its download limit." },
      { status: 410 },
    );
  }

  // Link evidence has no bytes. Checked BEFORE the download counter is
  // incremented, so a share of link-only evidence cannot burn down its
  // download allowance without ever serving anything.
  if (fileLocation({ ...link.file, data: null }) === "link") {
    return NextResponse.json(
      { error: "This evidence is a link, not a stored file." },
      { status: 409 },
    );
  }

  // Fetched before the counter is incremented, for the same reason the link
  // check is: a download that cannot be served must not consume the
  // allowance. Handles object storage and legacy database rows alike.
  const bytes = await readFileBytes(link.file.id);
  if (!bytes) {
    return NextResponse.json(
      { error: "This file's contents could not be retrieved." },
      { status: 502 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await prisma.$transaction([
    prisma.shareLink.update({
      where: { id: link.id },
      data: { downloadCount: { increment: 1 } },
    }),
    prisma.auditLog.create({
      data: {
        action: "SHARE_LINK_ACCESSED",
        target: link.fileId,
        ipAddress: ip,
        metadata: { token: link.token },
      },
    }),
  ]);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": link.file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(link.file.name)}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
