/**
 * Preview-only Drive upload endpoint for the user-side live preview.
 *
 * POST   /api/preview/docx        multipart with `file` -> { fileId, previewUrl }
 * DELETE /api/preview/docx?id=ID  -> { success: true }
 *
 * Used by app/user/page.tsx step-2 docx preview flow:
 *   1. User selects a .docx in the file picker.
 *   2. Browser POSTs the blob here, gets a Drive previewUrl back.
 *   3. UI embeds the previewUrl in an iframe.
 *   4. If the user swaps / removes the file or toggles encryption ON,
 *      the UI calls DELETE here to clean up the orphan.
 *   5. When the user actually submits, the existing Drive id is passed
 *      to /api/jobs/create which reuses it instead of double-uploading.
 *
 * No auth on this endpoint by design (the user hasn't authenticated to a
 * shop yet at the time they trigger preview). To limit abuse we cap the
 * accepted body size at 25 MB and reject anything that isn't a .docx.
 *
 * Privacy note: this endpoint causes the user's selected document to
 * land on Google Drive *before* they click submit. End users should be
 * informed of this in the UI. SmartPrint's existing privacy posture is
 * already a known trade-off for the docx preview path (see lib/googleDrive.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadToDrive, deleteFromDrive } from "@/lib/googleDrive";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid multipart body" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing `file` field" },
      { status: 400 },
    );
  }

  if (!file.name.toLowerCase().endsWith(".docx") && file.type !== DOCX_MIME) {
    return NextResponse.json(
      { error: "Only .docx is supported for preview" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileId, previewUrl } = await uploadToDrive(buffer, file.name);
    return NextResponse.json({ fileId, previewUrl });
  } catch (err: any) {
    console.error("[Preview API] Drive upload failed:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          err?.errors?.[0]?.message ||
          "Drive upload failed",
      },
      { status: 502 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("id");
  if (!fileId) {
    return NextResponse.json({ error: "Missing `id`" }, { status: 400 });
  }
  await deleteFromDrive(fileId);
  return NextResponse.json({ success: true });
}
