/**
 * Google Drive integration for DOCX preview.
 *
 * Architecture decision (round 13): the original .docx is uploaded to
 * Google Drive at job-create time, made `anyone-with-link readable but
 * NOT discoverable via Drive search`, and the file's
 * `https://drive.google.com/file/d/<id>/preview` URL is embedded as an
 * iframe in the admin preview UI. The Drive copy is deleted when the
 * job is deleted.
 *
 * Privacy posture (admin-acknowledged trade-off):
 *   - Original file lives on Google Drive until the job is deleted.
 *   - Anyone with the link can view it (allowFileDiscovery: false stops
 *     it appearing in Drive search results, but the link itself is
 *     unguessable but not rotated).
 *   - The signed-token, ephemeral-storage privacy promises in the
 *     SmartPrint UI no longer hold for the .docx case.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL   - service-account email
 *   GOOGLE_PRIVATE_KEY             - PEM private key (\n-escaped or raw)
 *
 * Optional but strongly recommended for non-Workspace setups:
 *   GOOGLE_DRIVE_FOLDER_ID         - id of a folder you own and have
 *                                    shared with the service account
 *                                    as Editor. Without this, uploads
 *                                    go to the service account's own
 *                                    Drive (which has 0 quota on
 *                                    free/personal Google) and fail
 *                                    with `storageQuotaExceeded`.
 */

import { google } from "googleapis";
import { Readable } from "stream";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

let cachedDrive: ReturnType<typeof google.drive> | null = null;

function getDrive() {
  if (cachedDrive) return cachedDrive;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be set in env.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  cachedDrive = google.drive({ version: "v3", auth });
  return cachedDrive;
}

export interface DriveUploadResult {
  fileId: string;
  /** Embeddable URL for `<iframe>` (Drive's native preview chrome). */
  previewUrl: string;
}

/**
 * Upload a Buffer as a .docx file to Drive and return the embeddable
 * preview URL. The file is shared as `anyone with link can read`,
 * `allowFileDiscovery: false` (link-only access).
 *
 * If GOOGLE_DRIVE_FOLDER_ID is set, the file is created inside that
 * folder. The service account must have edit access to the folder.
 */
export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
): Promise<DriveUploadResult> {
  const drive = getDrive();

  // ── DEBUG (round 21) ────────────────────────────────────────────────
  // Tracking why GOOGLE_DRIVE_FOLDER_ID is undefined at runtime even
  // though it's present in .env.local. Compare logged value with what's
  // hit by /api/debug-env.
  // eslint-disable-next-line no-console
  console.log(
    "[Drive] FOLDER_ID env var:",
    process.env.GOOGLE_DRIVE_FOLDER_ID ?? "(undefined)",
  );

  // TEMPORARY: hardcoded parent folder so uploads work while we
  // diagnose the env-loading issue. **REVERT** to env-only resolution
  // (the commented line below) before committing to a shared branch:
  //   const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;
  const folderId =
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    "15OoqJUwol4uqhvmcng0aEgys0yzUz1oR";

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: DOCX_MIME,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType: DOCX_MIME,
      body: Readable.from(buffer),
    },
    fields: "id",
    // If the parent folder lives inside a Workspace shared drive, the
    // upload requires this acknowledgement. Harmless for personal Drive.
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error("Drive create returned no file id.");
  }

  // Link-only access: anyone with the URL can read; Drive search will
  // not surface this file to other users.
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
      allowFileDiscovery: false,
    },
    supportsAllDrives: true,
  });

  return {
    fileId,
    previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
  };
}

/**
 * Best-effort delete. Errors are logged, not thrown, so a Drive outage
 * doesn't block the local job-delete flow. NOTE: this is a known leak
 * vector — files that fail to delete persist on Drive until the job is
 * manually purged or you implement a retry queue.
 */
export async function deleteFromDrive(fileId: string): Promise<void> {
  try {
    const drive = getDrive();
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Drive] delete failed for", fileId, err);
  }
}
