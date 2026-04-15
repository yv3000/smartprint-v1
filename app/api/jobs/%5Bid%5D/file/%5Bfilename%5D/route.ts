import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { join } from "path";
import { readFile } from "fs/promises";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string, filename: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Verify job ownership (admin)
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { admin: true }
  });

  if (!job || job.admin.email !== session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 2. Security check (status)
  if (['expired', 'deleted'].includes(job.status)) {
    return NextResponse.json({ error: "File expired" }, { status: 410 });
  }

  // 3. Serve file
  const filePath = join(process.cwd(), "tmp", "smartprint", params.id, decodeURIComponent(params.filename));
  
  try {
    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    let contentType = "application/octet-stream";
    if (params.filename.endsWith(".pdf")) contentType = "application/pdf";
    else if (params.filename.includes(".jp")) contentType = "image/jpeg";
    else if (params.filename.endsWith(".png")) contentType = "image/png";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${params.filename}"`,
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
