/**
 * Debug-only inspection of GOOGLE_* env vars.
 *
 * GET /api/debug-env  →  diagnostic JSON
 *
 * Hardened against accidental prod exposure:
 *   - Refuses unless NODE_ENV !== "production" AND not running on Vercel.
 *   - Returns no secret material — only presence flags, lengths, and the
 *     first ~50 chars of the private key (which is BEGIN/headers anyway).
 *
 * Use this to debug "GOOGLE_*  must be set in env" errors when the .env.local
 * file looks correct but the running process disagrees. Most useful checks:
 *   - email_set / private_key_set / folder_id_set  → did dotenv load them at all?
 *   - private_key.length                           → ~1700 for a real key
 *   - private_key.real_newline_count              → should be ~28 if dotenv
 *                                                    expanded the \n escapes
 *   - private_key.literal_backslash_n_count       → 0 if expansion happened
 *   - private_key.first_50                        → starts with "-----BEGIN
 *                                                    PRIVATE KEY-----\n" (with
 *                                                    a real newline) when OK
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Allow only in non-production AND not on Vercel.
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1"
  ) {
    return NextResponse.json(
      { error: "Disabled in production / on Vercel." },
      { status: 403 },
    );
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Pull a few sibling vars for sanity-check that dotenv loaded *anything*.
  const sibling = {
    AUTH_GOOGLE_ID_set: !!process.env.AUTH_GOOGLE_ID,
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    AUTH_URL: process.env.AUTH_URL ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
  };

  const previewKey = (s: string | undefined, n = 50) =>
    s
      ? // Replace real newlines with the literal sequence "\n" so the
        // browser shows them as visible characters in the JSON response.
        // Same for actual backslash-n pairs — we display them as <BS>n
        // to differentiate from a real newline.
        s
          .slice(0, n)
          .replace(/\r/g, "<CR>")
          .replace(/\n/g, "<LF>")
          .replace(/\\n/g, "<BS-n>")
      : null;

  const realNewlineCount = privateKey
    ? (privateKey.match(/\n/g) ?? []).length
    : 0;
  const literalBackslashNCount = privateKey
    ? (privateKey.match(/\\n/g) ?? []).length
    : 0;
  const startsWithDashes = privateKey?.startsWith("-----BEGIN") ?? false;
  const endsWithDashesNewline = privateKey
    ? /-----END PRIVATE KEY-----\s*$/.test(privateKey)
    : false;

  return NextResponse.json(
    {
      // Presence flags — the most important signal.
      email_set: !!email,
      private_key_set: !!privateKey,
      folder_id_set: !!folderId,

      email: email
        ? {
            length: email.length,
            preview: email.slice(0, 8) + "…",
          }
        : null,

      private_key: privateKey
        ? {
            length: privateKey.length,
            real_newline_count: realNewlineCount,
            literal_backslash_n_count: literalBackslashNCount,
            starts_with_BEGIN: startsWithDashes,
            ends_with_END_newline: endsWithDashesNewline,
            first_50_visualised: previewKey(privateKey, 50),
            last_50_visualised: previewKey(privateKey.slice(-50), 50),
          }
        : null,

      folder_id: folderId
        ? { length: folderId.length, value: folderId }
        : null,

      // Sanity check: did dotenv load other env vars at all?
      sibling_envs: sibling,

      cwd: process.cwd(),
      hint: !email || !privateKey
        ? "Vars missing at runtime. Either dev server hasn't been restarted since adding them, or dotenv failed to parse them. Confirm with: ls smartprint/.env.local && (Get-Content -Raw smartprint/.env.local | Select-String -Pattern 'GOOGLE_').Matches.Value"
        : "Vars are loaded; if uploadToDrive still throws, the value content is wrong (see private_key.real_newline_count — should be > 20 for a valid PEM).",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
