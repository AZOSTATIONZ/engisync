import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readPublishedFileBytes } from "@/lib/file-bytes";

/**
 * Download an archived file.
 *
 * Only files of PUBLISHED records are served — a pending submission's bytes
 * are placeholders and its content is not yet public. Authentication is
 * required (the archive is departmental knowledge, not the open internet),
 * and each download increments the project's counter.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.publishedFile.findUnique({
    where: { id },
    // Metadata only; bytes are fetched below and may live in object storage.
    select: {
      name: true,
      mimeType: true,
      published: { select: { id: true, status: true } },
    },
  });

  if (!file || file.published.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const bytes = await readPublishedFileBytes(id);
  if (!bytes) {
    // Counted only once the bytes are in hand, so a download that cannot be
    // served does not inflate the archive's download figure.
    return NextResponse.json(
      { error: "This archived file could not be retrieved." },
      { status: 502 },
    );
  }

  await prisma.publishedProject.update({
    where: { id: file.published.id },
    data: { downloads: { increment: 1 } },
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
