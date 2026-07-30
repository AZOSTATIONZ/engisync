import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessFile } from "@/lib/files";

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

  const file = await prisma.fileResource.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Link evidence (e.g. a GitHub repository) has no bytes to serve. Redirecting
  // would turn this authenticated endpoint into an open redirector, so the
  // caller is told to use the link directly instead.
  if (!file.data) {
    return NextResponse.json(
      { error: "This evidence is a link, not a stored file.", url: file.externalUrl },
      { status: 409 },
    );
  }

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "FILE_DOWNLOADED", target: id },
  });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      "Content-Length": String(file.size),
    },
  });
}
