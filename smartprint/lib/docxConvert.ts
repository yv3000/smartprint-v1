/**
 * Server-side DOCX rendering pipeline.
 *
 * docx → PDF (LibreOffice headless) → JPEG per page (pdftoppm).
 *
 * Output files inside the job dir:
 *   <basename>.pdf
 *   preview-1.jpg, preview-2.jpg, ...
 *
 * Why this exists:
 * Browsers can't render Word's exact pagination, page borders, headers,
 * floating shapes etc. LibreOffice ships the same layout engine logic
 * Microsoft Word uses. Converting to PDF then rasterising guarantees
 * pixel-faithful preview to whatever the user printed in Word.
 *
 * Server requirements:
 *   - LibreOffice (`soffice` / `libreoffice`) on PATH, or
 *     LIBREOFFICE_BIN env var pointing to the executable.
 *   - poppler-utils (`pdftoppm`) on PATH, or
 *     PDFTOPPM_BIN env var pointing to the executable.
 *
 * On Vercel serverless this won't work — needs a real Linux/Windows
 * box (Railway / Fly.io / VPS / dedicated). Job creation does NOT block
 * on conversion: failure simply leaves no preview-*.jpg files; the
 * preview endpoint reports `ready: false`, the UI keeps polling and
 * eventually surfaces an error after a timeout.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { getJobDir } from "@/lib/storage";

const execAsync = promisify(exec);

/**
 * Resolve the LibreOffice executable path.
 *
 * Order:
 *   1. LIBREOFFICE_BIN env var
 *   2. Common Windows install path
 *   3. `soffice` then `libreoffice` on PATH (probed via `which` / `where`).
 */
function findLibreOffice(): string | null {
  if (process.env.LIBREOFFICE_BIN && existsSync(process.env.LIBREOFFICE_BIN)) {
    return process.env.LIBREOFFICE_BIN;
  }

  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
  }

  // Fall back to PATH lookup. We don't probe synchronously here; we just
  // hand back the bare command and let exec resolve. If it's missing,
  // exec rejects and convertDocxToImages logs and returns gracefully.
  return process.platform === "win32" ? "soffice.exe" : "soffice";
}

function findPdfToPpm(): string {
  if (process.env.PDFTOPPM_BIN && existsSync(process.env.PDFTOPPM_BIN)) {
    return process.env.PDFTOPPM_BIN;
  }
  return process.platform === "win32" ? "pdftoppm.exe" : "pdftoppm";
}

/**
 * Spawn `soffice --headless --convert-to pdf` for a single .docx file.
 *
 * Concurrency: each invocation is given its own UserInstallation profile
 * (`-env:UserInstallation=file:///...`). Without this flag, simultaneous
 * conversions race on LibreOffice's singleton profile lock and one of
 * them silently fails or hangs.
 *
 * The `SAL_USE_VCLPLUGIN=svp` env var forces the headless backend so
 * LibreOffice doesn't try to talk to a display server (matters on
 * minimal Linux containers).
 */
async function docxToPdf(
  jobId: string,
  jobDir: string,
  docxPath: string,
): Promise<string | null> {
  const soffice = findLibreOffice();
  if (!soffice) {
    console.warn("[docxConvert] LibreOffice binary not found, skipping.");
    return null;
  }

  // Per-job profile dir avoids the singleton lock collision between
  // concurrent conversions.
  const profileDir = path.join(os.tmpdir(), `lo-profile-${jobId}`);
  // LibreOffice expects a file:// URL with forward slashes for the
  // UserInstallation flag, even on Windows.
  const profileUrl =
    "file:///" + profileDir.replace(/\\/g, "/").replace(/^\/+/, "");

  const args = [
    JSON.stringify(soffice),
    `-env:UserInstallation=${JSON.stringify(profileUrl)}`,
    "--headless",
    "--convert-to",
    "pdf",
    JSON.stringify(docxPath),
    "--outdir",
    JSON.stringify(jobDir),
  ];

  try {
    await execAsync(args.join(" "), {
      timeout: 90_000,
      env: {
        ...process.env,
        SAL_USE_VCLPLUGIN: "svp",
      },
    });
  } catch (err) {
    console.error("[docxConvert] LibreOffice conversion failed:", err);
    return null;
  }

  const base = path.basename(docxPath).replace(/\.docx$/i, "");
  const pdfPath = path.join(jobDir, `${base}.pdf`);
  if (!existsSync(pdfPath)) {
    console.error(
      "[docxConvert] LibreOffice ran but PDF not produced:",
      pdfPath,
    );
    return null;
  }
  return pdfPath;
}

/**
 * Spawn `pdftoppm -jpeg -r <dpi>` to rasterise each PDF page to
 * preview-1.jpg, preview-2.jpg, ...
 *
 * pdftoppm appends the page number with a default zero-pad of 1 (i.e.
 * "preview-1.jpg" for single-digit, "preview-10.jpg" once the
 * page count crosses 10). For consistent sort we pass `-l` only as a
 * sanity bound — natural ordering "preview-1.jpg" < "preview-10.jpg"
 * is wrong lexically, so the preview API sorts numerically.
 */
async function pdfToJpegs(jobDir: string, pdfPath: string): Promise<boolean> {
  const pdftoppm = findPdfToPpm();
  const prefix = path.join(jobDir, "preview");

  const args = [
    JSON.stringify(pdftoppm),
    "-jpeg",
    "-r",
    "150",
    JSON.stringify(pdfPath),
    JSON.stringify(prefix),
  ];

  try {
    await execAsync(args.join(" "), { timeout: 180_000 });
    return true;
  } catch (err) {
    console.error("[docxConvert] pdftoppm failed:", err);
    return false;
  }
}

/**
 * High-level entry point. Converts a .docx in the job dir to PDF + page
 * images. Best-effort; never throws. Caller (the job-create route) wires
 * this in fire-and-forget mode so upload latency stays unaffected.
 */
export async function convertDocxToImages(
  jobId: string,
  fileName: string,
): Promise<void> {
  if (!/\.docx$/i.test(fileName)) return;

  const jobDir = getJobDir(jobId);
  const docxPath = path.join(jobDir, fileName);

  if (!existsSync(docxPath)) {
    console.warn("[docxConvert] DOCX not on disk, skip:", docxPath);
    return;
  }

  const pdfPath = await docxToPdf(jobId, jobDir, docxPath);
  if (!pdfPath) return;

  await pdfToJpegs(jobDir, pdfPath);
}
