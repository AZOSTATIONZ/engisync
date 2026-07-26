import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessDocument, compileDocumentHtml } from "@/lib/documentation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canAccessDocument(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const compiled = await compileDocumentHtml(id);
  if (!compiled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(compiled.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${compiled.filename}"`,
    },
  });
}
