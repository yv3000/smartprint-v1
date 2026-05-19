"use client";

/**
 * Universal preview component (round 25).
 *
 * Routes by file extension:
 *   - Office (docx/doc/odt/rtf/xls/xlsx/ods/pptx/ppt/odp)
 *       → uploaded to /api/preview/upload, embedded in
 *         https://view.officeapps.live.com/op/embed.aspx?src=<URL>
 *   - PDF  → object URL via blob, embedded in <iframe>
 *   - Image (jpg/png/gif/webp/bmp/svg) → object URL via blob in <img>
 *   - CSV / TXT  → read with file.text(), shown in <pre>
 *
 * Privacy posture: Office files end up briefly on Microsoft's servers
 * because the MS viewer fetches the URL from public Microsoft infra.
 * 5-minute token expiry limits the window. For non-Office types, the
 * file never leaves the user's browser — we use blob URLs locally.
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

const MS_OFFICE_EXTENSIONS = new Set([
  "docx", "doc", "odt", "rtf",
  "xlsx", "xls", "ods",
  "pptx", "ppt", "odp",
]);
const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg",
]);
const TEXT_EXTENSIONS = new Set(["txt", "csv"]);

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
  const isPdf = ext === "pdf";
  const isText = TEXT_EXTENSIONS.has(ext);

  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

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

  /* ─── Render ─── */

  if (isImage) {
    return blobUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={blobUrl}
        alt={file.name}
        className="w-full h-full object-contain bg-black/40"
        onDragStart={(e) => e.preventDefault()}
      />
    ) : (
      <PreviewSpinner label="Loading image…" />
    );
  }

  if (isPdf) {
    return blobUrl ? (
      <iframe
        src={blobUrl}
        className="w-full h-full"
        style={{ border: "none", minHeight: 600 }}
        title={file.name}
      />
    ) : (
      <PreviewSpinner label="Loading PDF…" />
    );
  }

  if (isText) {
    if (textContent === null) return <PreviewSpinner label="Reading file…" />;
    if (error) return <PreviewError message={error} />;
    return (
      <pre className="w-full h-full overflow-auto p-4 text-xs text-white/70 font-mono whitespace-pre-wrap">
        {textContent}
      </pre>
    );
  }

  if (isMsOffice) {
    if (status === "uploading" || status === "idle") {
      return <PreviewSpinner label="Preparing preview…" />;
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

    const msViewerUrl =
      `https://view.officeapps.live.com/op/embed.aspx?src=` +
      encodeURIComponent(fileUrl);

    // Wrap iframe in an overlay spinner so the user never sees
    // Microsoft's loading splash (the big "Microsoft" logo). We hide
    // the iframe via opacity until `onLoad` fires, and render our own
    // spinner on top.
    return <MsOfficeFrame src={msViewerUrl} title={`Preview: ${file.name}`} />;
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
 * opacity 0 + an overlay spinner on top, then fade the iframe in once
 * its `onLoad` event fires (Microsoft has finished its first paint by
 * then, splash gone).
 *
 * Note: `onLoad` fires per-iframe-load. If the viewer redirects
 * internally (rare) the spinner won't re-appear, but that's fine — the
 * doc is already visible.
 */
function MsOfficeFrame({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full" style={{ minHeight: "min(85vh, 900px)" }}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#1f1f23] text-white/40">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest animate-pulse">
            Rendering document…
          </p>
        </div>
      )}
      <iframe
        src={src}
        className="w-full h-full"
        style={{
          border: "none",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
        title={title}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
