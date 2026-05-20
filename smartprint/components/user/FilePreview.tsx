"use client";

/**
 * Universal preview component (round 29).
 *
 * Routes by file extension:
 *   - Office docs   (docx/doc/odt/rtf)            → MS Word viewer
 *   - Spreadsheets  (xlsx/xls/ods/csv)            → client-side
 *       converted to PDF via SheetJS + jsPDF/autoTable, embedded as
 *       a blob-URL <iframe>. No upload, no MS viewer dependency.
 *       Fixes "File not found" from view.officeapps.live.com on
 *       xlsx — MS rejects unknown query params and /tmp is per-
 *       instance on Vercel anyway. Empty rows are skipped, each
 *       sheet gets its own page with a header row.
 *   - Presentations (pptx/ppt/odp)                → MS PowerPoint viewer
 *       MS viewer types are uploaded to /api/preview/upload, then
 *       embedded in https://view.officeapps.live.com/op/embed.aspx
 *   - PDF  → object URL via blob, embedded in <iframe>
 *   - Image (jpg/jpeg/png/gif/webp/bmp/svg) → object URL via blob in <img>
 *   - TXT  → read with file.text(), shown in <pre>
 *
 * Privacy posture: only docs / slides ever leave the browser (to MS).
 * Spreadsheets, PDFs, images, txt — all fully local.
 *
 * IMPORTANT: Microsoft's viewer cannot reach `localhost:3000` from
 * its public servers, so this component only embeds the iframe in
 * production builds. On localhost we display a placeholder.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertCircle, FileText } from "lucide-react";

interface FilePreviewProps {
  /** Local File blob (user-side pre-upload). */
  file?: File;
  /** Pre-signed URL pointing at a stored file (admin-side post-upload).
   *  When provided, the component fetches the URL into a Blob and
   *  treats it like a local File. */
  fileUrl?: string;
  /** Filename hint, used when only `fileUrl` is given (extension drives
   *  the dispatch). Required if `fileUrl` is set. */
  fileName?: string;
  /**
   * Public base URL of this Next.js app. Required for Office preview
   * because Microsoft's servers fetch this URL.  Set
   * `NEXT_PUBLIC_APP_URL` in the environment, e.g. for prod:
   *   NEXT_PUBLIC_APP_URL=https://smartprint-tau.vercel.app
   */
  appBaseUrl?: string;
}

// Per-bucket extension sets. Spreadsheets (incl. CSV) are converted
// client-side to PDF — we don't rely on MS Excel viewer because it
// 404s xlsx via view.officeapps.live.com on Vercel /tmp paths. CSV
// goes through the same SheetJS pipeline.
const DOC_EXTS = new Set(["doc", "docx", "odt", "rtf"]);
const SHEET_EXTS = new Set(["xls", "xlsx", "ods", "csv"]);
const SLIDE_EXTS = new Set(["ppt", "pptx", "odp"]);

/** Spreadsheets we convert to PDF in the browser (no server). */
const EXCEL_PDF_EXTS = new Set(["xls", "xlsx", "ods", "csv"]);

/** Types that go through /api/preview/upload + MS Office Online. */
const MS_OFFICE_EXTENSIONS = new Set<string>([
  ...DOC_EXTS,
  ...SLIDE_EXTS,
]);

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg",
]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const TEXT_EXTENSIONS = new Set(["txt"]);

/**
 * Per-file-type preview viewport size.
 *
 * - Documents (docx/doc/odt/rtf) and PDFs are tall: 85vh.
 * - Spreadsheets (incl. csv) are wide and shorter: 70vh.
 * - Slides have 16:9 ratio so much shorter: 60vh.
 * - Plain text: 60vh.
 * - Images: handled separately (auto height + max-height: 70vh).
 */
function previewSizeForExt(
  ext: string,
): { height: string; minHeight: number } {
  if (DOC_EXTS.has(ext)) return { height: "85vh", minHeight: 600 };
  if (SHEET_EXTS.has(ext)) return { height: "70vh", minHeight: 500 };
  if (SLIDE_EXTS.has(ext)) return { height: "60vh", minHeight: 420 };
  if (PDF_EXTENSIONS.has(ext)) return { height: "85vh", minHeight: 600 };
  if (TEXT_EXTENSIONS.has(ext)) return { height: "60vh", minHeight: 400 };
  return { height: "70vh", minHeight: 500 };
}

type Status = "idle" | "uploading" | "ready" | "error";

const isLocalHost = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\b/i.test(url) ||
  url.startsWith("/");

export default function FilePreview({ file: fileProp, fileUrl, fileName, appBaseUrl }: FilePreviewProps) {
  // Resolve the File we'll preview. If `file` was passed directly,
  // use it. Otherwise fetch `fileUrl` once and wrap as a File so the
  // rest of the component can stay file-blob-shaped.
  const [resolvedFile, setResolvedFile] = useState<File | null>(
    fileProp ?? null,
  );
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (fileProp) {
      setResolvedFile(fileProp);
      setFetchError(null);
      return;
    }
    if (!fileUrl) {
      setResolvedFile(null);
      return;
    }
    let cancelled = false;
    setResolvedFile(null);
    setFetchError(null);
    fetch(fileUrl, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const blob = await r.blob();
        if (cancelled) return;
        const name = fileName || new URL(fileUrl, "http://x/").searchParams.get("name") || "document";
        const f = new File([blob], name, { type: blob.type });
        setResolvedFile(f);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(err?.message || "Failed to fetch file");
      });
    return () => {
      cancelled = true;
    };
  }, [fileProp, fileUrl, fileName]);

  if (fetchError) return <PreviewError message={fetchError} />;
  if (!resolvedFile) return <PreviewSpinner label="Loading file…" />;
  return <FilePreviewInner file={resolvedFile} appBaseUrl={appBaseUrl} />;
}

function FilePreviewInner({ file, appBaseUrl }: { file: File; appBaseUrl?: string }) {
  const ext = useMemo(
    () => (file.name.split(".").pop() || "").toLowerCase(),
    [file.name],
  );
  const isMsOffice = MS_OFFICE_EXTENSIONS.has(ext);
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const isPdf = PDF_EXTENSIONS.has(ext);
  const isText = TEXT_EXTENSIONS.has(ext);
  const isExcelPdf = EXCEL_PDF_EXTS.has(ext);

  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [excelPdfUrl, setExcelPdfUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const excelPdfUrlRef = useRef<string | null>(null);

  // Resolve the base URL once. Falls back to window.location.origin on
  // the client when env var isn't set.
  const baseUrl = useMemo(() => {
    if (appBaseUrl) return appBaseUrl.replace(/\/+$/, "");
    if (process.env.NEXT_PUBLIC_APP_URL)
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, [appBaseUrl]);

  /* ─── Effect 1: blob URL for image / pdf ─── */
  useEffect(() => {
    if (!isImage && !isPdf) return;
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      blobUrlRef.current = null;
      setBlobUrl(null);
    };
  }, [file, isImage, isPdf]);

  /* ─── Effect 2: read text content for txt/csv ─── */
  useEffect(() => {
    if (!isText) return;
    let cancelled = false;
    setTextContent(null);
    file
      .text()
      .then((t) => {
        if (!cancelled) setTextContent(t);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to read file");
      });
    return () => {
      cancelled = true;
    };
  }, [file, isText]);

  /* ─── Effect 3: upload to /api/preview/upload for MS-Office files ─── */
  useEffect(() => {
    if (!isMsOffice) return;
    let cancelled = false;
    const ctrl = new AbortController();

    setStatus("uploading");
    setError(null);
    setToken(null);

    const fd = new FormData();
    fd.append("file", file);

    fetch("/api/preview/upload", {
      method: "POST",
      body: fd,
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: { token: string }) => {
        if (cancelled) return;
        setToken(data.token);
        setStatus("ready");
      })
      .catch((err: any) => {
        if (cancelled || err?.name === "AbortError") return;
        setError(err?.message || "Upload failed");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [file, isMsOffice]);

  /* ─── Effect 4: client-side Excel/CSV → PDF ───
   *
   * SheetJS reads the workbook (xlsx/xls/ods/csv), jsPDF +
   * jspdf-autotable render each sheet on its own A4 landscape page.
   * Empty rows are skipped so the output is dense, not full of blank
   * grid. PDF held as in-memory blob URL, embedded in <iframe>.
   * Heavy libs are dynamically imported.
   */
  useEffect(() => {
    if (!isExcelPdf) return;
    let cancelled = false;

    setExcelPdfUrl(null);
    setError(null);

    (async () => {
      try {
        const [XLSX, jsPDFMod] = await Promise.all([
          import("xlsx"),
          import("jspdf"),
          import("jspdf-autotable"),
        ]);
        const jsPDF = jsPDFMod.default;

        const buf = await file.arrayBuffer();
        if (cancelled) return;

        const wb = XLSX.read(buf, { type: "array" });
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        wb.SheetNames.forEach((sheetName, idx) => {
          if (idx > 0) pdf.addPage();

          const sheet = wb.Sheets[sheetName];
          const ref = sheet["!ref"];
          if (!ref) return;
          const range = XLSX.utils.decode_range(ref);

          // Walk the sheet by cell address so we honour the actual
          // used range, then drop completely empty rows.
          const data: string[][] = [];
          for (let r = range.s.r; r <= range.e.r; r++) {
            const row: string[] = [];
            let hasData = false;
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = sheet[XLSX.utils.encode_cell({ r, c })];
              const val = cell ? String(cell.v ?? "") : "";
              if (val.trim()) hasData = true;
              row.push(val);
            }
            if (hasData) data.push(row);
          }

          if (data.length === 0) return;

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text(sheetName, 14, 10);

          // jspdf-autotable monkey-patches jsPDF — call via cast.
          (pdf as unknown as {
            autoTable: (opts: Record<string, unknown>) => void;
          }).autoTable({
            head: [data[0]],
            body: data.slice(1),
            startY: 15,
            styles: {
              fontSize: 7,
              cellPadding: 2,
              overflow: "linebreak",
              halign: "left",
            },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: "bold",
            },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 10, right: 10 },
            tableWidth: "auto",
          });
        });

        const url = pdf.output("bloburl") as unknown as string;
        if (cancelled) {
          try { URL.revokeObjectURL(url); } catch { /* noop */ }
          return;
        }
        excelPdfUrlRef.current = url;
        setExcelPdfUrl(url);
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error)?.message || "Excel preview failed";
        console.error("[FilePreview] excel→pdf failed", e);
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      const u = excelPdfUrlRef.current;
      if (u) {
        try { URL.revokeObjectURL(u); } catch { /* noop */ }
        excelPdfUrlRef.current = null;
      }
      setExcelPdfUrl(null);
    };
  }, [file, isExcelPdf]);

  /* ─── Render ─── */

  const size = previewSizeForExt(ext);

  if (isImage) {
    // Images: natural height up to 70vh, contain. No fixed height so
    // small images don't get stretched into a giant box.
    return blobUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={blobUrl}
        alt={file.name}
        style={{
          width: "100%",
          height: "auto",
          maxHeight: "70vh",
          objectFit: "contain",
          background: "rgba(0,0,0,0.25)",
          display: "block",
        }}
        onDragStart={(e) => e.preventDefault()}
      />
    ) : (
      <PreviewSpinner label="Loading image…" />
    );
  }

  if (isPdf) {
    return blobUrl ? (
      <div
        className="relative w-full"
        style={{ height: size.height, minHeight: size.minHeight }}
      >
        <iframe
          src={blobUrl}
          className="w-full h-full"
          style={{ border: "none" }}
          title={file.name}
        />
      </div>
    ) : (
      <PreviewSpinner label="Loading PDF…" />
    );
  }

  if (isText) {
    if (textContent === null) return <PreviewSpinner label="Reading file…" />;
    if (error) return <PreviewError message={error} />;
    return (
      <pre
        className="w-full overflow-auto p-4 text-xs text-white/70 font-mono whitespace-pre-wrap"
        style={{ height: size.height, minHeight: size.minHeight }}
      >
        {textContent}
      </pre>
    );
  }

  if (isExcelPdf) {
    if (error) return <PreviewError message={error} />;
    if (!excelPdfUrl) {
      return (
        <div
          className="w-full"
          style={{ height: size.height, minHeight: size.minHeight }}
        >
          <PreviewSpinner label="Converting spreadsheet…" />
        </div>
      );
    }
    return (
      <div
        className="relative w-full"
        style={{ height: size.height, minHeight: size.minHeight }}
      >
        <iframe
          src={excelPdfUrl}
          className="w-full h-full"
          style={{ border: "none" }}
          title={file.name}
        />
      </div>
    );
  }

  if (isMsOffice) {
    if (status === "uploading" || status === "idle") {
      return (
        <div
          className="w-full"
          style={{ height: size.height, minHeight: size.minHeight }}
        >
          <PreviewSpinner label="Preparing preview…" />
        </div>
      );
    }
    if (status === "error" || !token) {
      return <PreviewError message={error || "Preview unavailable"} />;
    }

    const fileUrl = `${baseUrl}/api/preview/file/${token}`;

    // Microsoft's viewer cannot reach localhost. Don't embed if the
    // base URL points there — it would just show "We're sorry, this
    // document can't be opened."
    if (isLocalHost(baseUrl)) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40 text-center px-6">
          <FileText className="w-8 h-8" />
          <p className="text-xs font-bold uppercase tracking-widest">
            Preview only available on the deployed site
          </p>
          <p className="text-[11px] text-white/30 max-w-md leading-relaxed">
            Microsoft Office Online needs a publicly reachable URL. Open
            the deployed Vercel build to preview <code>.{ext}</code> files.
          </p>
        </div>
      );
    }

    // Build the MS Office Online embed URL.
    //
    // We previously added wdHideGridlines / wdHideHeaders /
    // wdDownloadButton query params for sheets — those are documented
    // for SharePoint/OneDrive Excel embeds, NOT for
    // view.officeapps.live.com/op/embed.aspx. MS viewer silently
    // rejects the URL and shows "File not found" for xlsx when those
    // params are present. DOCX wasn't affected because we only added
    // them for sheets. Reverted to the bare `?src=` form which works
    // for all Office types.
    const msViewerUrl =
      `https://view.officeapps.live.com/op/embed.aspx?src=` +
      encodeURIComponent(fileUrl);

    // Wrap iframe in an overlay spinner so the user never sees
    // Microsoft's loading splash (the big "Microsoft" logo). We hide
    // the iframe via opacity until `onLoad` fires, and render our own
    // spinner on top.
    return (
      <MsOfficeFrame
        src={msViewerUrl}
        title={`Preview: ${file.name}`}
        height={size.height}
        minHeight={size.minHeight}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40 px-6 text-center">
      <FileText className="w-8 h-8" />
      <p className="text-xs font-bold uppercase tracking-widest">
        Preview not supported
      </p>
      <p className="text-[11px] text-white/30 max-w-xs leading-relaxed">
        .{ext} files can&apos;t be previewed in the browser, but they&apos;ll
        still be sent to the print shop.
      </p>
    </div>
  );
}

function PreviewSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40">
      <Loader2 className="w-7 h-7 animate-spin" />
      <p className="text-xs font-bold uppercase tracking-widest animate-pulse">
        {label}
      </p>
    </div>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40 px-6 text-center">
      <AlertCircle className="w-8 h-8 text-amber-400" />
      <p className="text-xs font-bold uppercase tracking-widest">
        Preview unavailable
      </p>
      <p className="text-[11px] text-white/30 max-w-md leading-relaxed break-words">
        {message}
      </p>
    </div>
  );
}

/**
 * Microsoft Office Online viewer wrapper.
 *
 * The MS viewer shows a big "Microsoft" splash while it fetches the
 * source URL — distracting and off-brand. We render the iframe with
 * opacity 0 + an overlay spinner on top. `onLoad` fires when the host
 * page finishes loading, but the splash is still visible inside the
 * iframe at that moment, so we delay revealing the iframe by an extra
 * grace period to let MS finish its splash + first document paint.
 *
 * We also mask off the bottom ~40px of the iframe with a solid bar
 * to hide MS's own bottom toolbar (page count, zoom, Word icon,
 * fullscreen). It's not removable from inside the iframe (cross-
 * origin) so we cover it instead.
 *
 * Note: cross-origin means we can't introspect the iframe doc — the
 * delay is the most reliable hide. If MS is slow, our spinner stays
 * up; if it's fast, the user just sees a slightly later fade-in. No
 * MS logo flash either way.
 */
function MsOfficeFrame({
  src,
  title,
  height,
  minHeight,
}: {
  src: string;
  title: string;
  height: string;
  minHeight: number;
}) {
  const [loaded, setLoaded] = useState(false);

  // Color of the bottom mask. Match the surrounding card so it blends
  // seamlessly. The user-side preview card sits on the page background
  // (#1f1f23) so default to that.
  const maskBg = "#1f1f23";
  const maskHeight = 40;

  return (
    <div
      className="relative w-full flex flex-col"
      style={{ height, minHeight }}
    >
      {!loaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#1f1f23] text-white/40">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest animate-pulse">
            Rendering document…
          </p>
        </div>
      )}
      <iframe
        src={src}
        title={title}
        className="w-full"
        style={{
          border: "none",
          flex: 1,
          minHeight,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
        onLoad={() => {
          // Delay reveal so MS's "Microsoft" splash finishes inside
          // the iframe before we fade it in. 1500ms is enough for
          // most docs without feeling slow.
          window.setTimeout(() => setLoaded(true), 1500);
        }}
      />
      {/* Bottom bar mask — covers MS Office viewer's toolbar. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: maskHeight,
          background: maskBg,
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
