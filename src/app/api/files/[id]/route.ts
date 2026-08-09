import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessFile } from "@/lib/files";
import { fileLocation, readFileBytes } from "@/lib/file-bytes";

/** Authenticated download of a file the user has access to. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await canAccessFile(id, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Metadata only — `data` is deliberately NOT selected. The previous version
  // used a bare `findUnique`, which pulls every column, so even a LINK with no
  // bytes at all paid to drag the blob column across the connection. Bytes are
  // fetched below, and only if this file actually has some.
  const file = await prisma.fileResource.findUnique({
    where: { id },
    select: {
      name: true,
      mimeType: true,
      size: true,
      storageKey: true,
      externalUrl: true,
    },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Link evidence (e.g. a GitHub repository) has no bytes to serve. Redirecting
  // would turn this authenticated endpoint into an open redirector, so the
  // caller is told to use the link directly instead.
  if (fileLocation(file) === "link") {
    return NextResponse.json(
      { error: "This evidence is a link, not a stored file.", url: file.externalUrl },
      { status: 409 },
    );
  }

  const bytes = await readFileBytes(id);
  if (!bytes) {
    // The row exists but its bytes do not. Says so plainly instead of serving
    // an empty file that looks like a corrupt download.
    return NextResponse.json(
      { error: "This file's contents could not be retrieved." },
      { status: 502 },
    );
  }

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "FILE_DOWNLOADED", target: id },
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
