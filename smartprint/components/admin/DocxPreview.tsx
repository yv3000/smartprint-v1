"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  safeSplitOverflowingSections,
  safeRemoveBlankSections,
  docxHasPageBorders,
  type PaginationStats,
  type BlankCleanupStats,
} from "@/lib/docxPaginate";

interface DocxPreviewProps {
  /** Pre-signed URL to fetch the .docx file from. */
  fileUrl: string;
  /** Optional grayscale filter (Black & White preview mode). */
  grayscale?: boolean;
  /** Optional className for the outer container. */
  className?: string;
}

/**
 * Diagnostic state shown by the on-screen debug panel when the URL
 * carries `?debug=1`.
 */
interface DebugInfo {
  fileUrl: string;
  fileSizeBytes: number | null;
  fetchOk: boolean | null;
  hasPageBorders: boolean | null;
  className: string;
  ignoreLastRenderedPageBreak: boolean;
  rawSectionCount: number | null;
  splitStats: PaginationStats | null;
  blankStats: BlankCleanupStats | null;
  finalSectionCount: number | null;
  totalRenderMs: number | null;
  warnings: string[];
  error: string | null;
}

const initialDebug = (fileUrl: string): DebugInfo => ({
  fileUrl,
  fileSizeBytes: null,
  fetchOk: null,
  hasPageBorders: null,
  className: "docx-admin",
  ignoreLastRenderedPageBreak: true,
  rawSectionCount: null,
  splitStats: null,
  blankStats: null,
  finalSectionCount: null,
  totalRenderMs: null,
  warnings: [],
  error: null,
});

/**
 * Read `?debug=1` (or `?debug=true`) from the current URL once at mount.
 * We avoid `useSearchParams` to keep this component independent of the
 * Next.js routing context — it can be used inside a `dynamic({ ssr: false })`
 * import without needing the `<SearchParams>` boundary.
 */
function useDebugFlag(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = new URLSearchParams(window.location.search).get("debug");
    setEnabled(v === "1" || v === "true");
  }, []);
  return enabled;
}

/**
 * Admin-side DOCX preview.
 *
 * Uses docx-preview to render the original document with correct page
 * geometry (page size, margins, fonts, headers, footers). Pages are
 * post-processed via splitOverflowingSections so docs without
 * <w:lastRenderedPageBreak/> markers still render as separate page
 * boxes.
 *
 * The container provides the gray "paper backdrop" look. We do NOT
 * override section width / height / padding — those come from the
 * actual document layout and must stay untouched for fidelity.
 *
 * Diagnostics: append `?debug=1` to the page URL to overlay a panel
 * showing fetch + render + post-process counters.
 */
export default function DocxPreview({
  fileUrl,
  grayscale = false,
  className = "",
}: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debugEnabled = useDebugFlag();
  const [debug, setDebug] = useState<DebugInfo>(() => initialDebug(fileUrl));

  // Capture console.warn calls during render so the debug panel can
  // surface them. Restored on cleanup.
  const consoleWarnRef = useRef<typeof console.warn | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    setLoading(true);
    setError(null);
    setDebug(initialDebug(fileUrl));
    container.innerHTML = "";

    // Only patch console when debug mode is on, to avoid touching the
    // global object in normal sessions.
    if (debugEnabled && consoleWarnRef.current === null) {
      const orig = console.warn.bind(console);
      consoleWarnRef.current = orig;
      console.warn = (...args: unknown[]) => {
        const text = args
          .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
          .join(" ");
        setDebug((d) => ({ ...d, warnings: [...d.warnings, text] }));
        orig(...(args as Parameters<typeof console.warn>));
      };
    }

    const startedAt = performance.now();

    (async () => {
      try {
        const response = await fetch(fileUrl, { credentials: "include" });
        setDebug((d) => ({ ...d, fetchOk: response.ok }));
        if (!response.ok) {
          throw new Error(
            `Failed to fetch document (HTTP ${response.status}).`,
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        setDebug((d) => ({ ...d, fileSizeBytes: arrayBuffer.byteLength }));
        if (cancelled || !containerRef.current) return;

        // Detect <w:pgBorders> in the source XML so we can draw matching
        // CSS borders on each rendered section (docx-preview parses but
        // never renders pgBorders).
        const hasBorders = await docxHasPageBorders(arrayBuffer);
        setDebug((d) => ({ ...d, hasPageBorders: hasBorders }));
        if (cancelled || !containerRef.current) return;
        if (hasBorders) {
          containerRef.current.dataset.pageBorders = "1";
        } else {
          delete containerRef.current.dataset.pageBorders;
        }

        const { renderAsync } = await import("docx-preview");
        await renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: "docx-admin",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          // Force every <w:sectPr> boundary to create a new page group
          // (docx-preview only honours sectPr as page break when page
          // size changes, otherwise sections collapse into one giant
          // page). Setting this true makes every section break paginate.
          // Files that do contain genuine lastRenderedPageBreak hints
          // are still served by the post-render overflow split.
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        if (cancelled || !containerRef.current) return;

        const rawSectionCount =
          containerRef.current.querySelectorAll(
            "section[class*='docx']",
          ).length;
        setDebug((d) => ({ ...d, rawSectionCount }));

        // Split sections that overflow their declared page height — fixes
        // documents lacking lastRenderedPageBreak markers.
        const splitStats = safeSplitOverflowingSections(containerRef.current);
        setDebug((d) => ({ ...d, splitStats }));

        // Strip blank section pages produced by paragraph-level sectPr
        // boundaries (forced pagination side-effect).
        const blankStats = safeRemoveBlankSections(containerRef.current);
        setDebug((d) => ({ ...d, blankStats }));

        const finalSectionCount =
          containerRef.current.querySelectorAll(
            "section[class*='docx']",
          ).length;
        setDebug((d) => ({
          ...d,
          finalSectionCount,
          totalRenderMs: Math.round(performance.now() - startedAt),
        }));

        if (!cancelled) setLoading(false);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to render the document.";
        if (!cancelled) {
          setError(msg);
          setDebug((d) => ({ ...d, error: msg }));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Restore console.warn if we patched it.
      if (consoleWarnRef.current) {
        console.warn = consoleWarnRef.current;
        consoleWarnRef.current = null;
      }
    };
    // debugEnabled intentionally not in deps — it's read once. If user
    // toggles it via URL change, they reload the page anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#EFEFEF] z-10">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Rendering document…
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#EFEFEF] z-10 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Preview unavailable
          </p>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/*
        This is the container passed to docx-preview's renderAsync.
        It owns the gray paper backdrop + scrollable viewport.
        docx-preview will mount <div class="docx-admin-wrapper"> inside,
        which itself contains one <section class="docx-admin"> per page.
      */}
      <div
        ref={containerRef}
        className="docx-admin-host w-full h-full overflow-y-auto"
        style={{
          background: "#EFEFEF",
          padding: "24px",
          filter: grayscale ? "grayscale(1) contrast(1.05)" : undefined,
        }}
      />

      {debugEnabled && <DocxDebugPanel debug={debug} />}

      <style jsx global>{`
        /*
          Wrapper provided by docx-preview (inWrapper: true). We make it a
          flex column so pages stack vertically with a gap between them.
          We deliberately do NOT touch width / min-height / padding on
          section.docx-admin — those carry the original Word page
          geometry (page size, margins) and must stay intact.
        */
        .docx-admin-host .docx-admin-wrapper {
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex !important;
          flex-flow: column nowrap !important;
          align-items: center !important;
          gap: 24px !important;
        }

        .docx-admin-host section.docx-admin {
          background: white !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
          /* Reset docx-preview's default margin-bottom: 30px so the
             flex gap controls page spacing instead. We do NOT touch
             width / min-height / padding. */
          margin: 0 !important;
          /* Don't clip oversized children at the section bottom edge.
             Tall tables / images that exceed the declared min-height
             would otherwise get cut by docx-preview's default
             overflow: hidden. */
          overflow: visible !important;
          color-scheme: light;
          color: #1a1a1a;
        }

        /* docx-preview parses <w:pgBorders> but does not render them.
           When the source document defines page borders, we draw a
           matching inset border on each section. We use box-shadow inset
           rather than border/outline so it doesn't disturb the layout
           that docx-preview already set on the section box. */
        .docx-admin-host[data-page-borders="1"] section.docx-admin {
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.15),
            inset 0 0 0 1.2pt #000 !important;
        }

        /* Theme isolation: keep paper light in dark-mode body. */
        .docx-admin-host {
          color-scheme: light;
        }
      `}</style>
    </div>
  );
}

/**
 * Floating diagnostic panel rendered when the URL has ?debug=1.
 * Reports every observable signal the preview pipeline produces.
 * Designed to be screenshot-friendly so it can be pasted to the chat.
 */
function DocxDebugPanel({ debug }: { debug: DebugInfo }) {
  const fmtBytes = (n: number | null) =>
    n == null ? "—" : `${(n / 1024 / 1024).toFixed(2)} MB (${n.toLocaleString()} B)`;
  const fmtBool = (b: boolean | null) =>
    b == null ? "(pending)" : b ? "yes" : "no";
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-white/50">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );

  return (
    <div
      className="absolute top-3 right-3 z-50 max-w-[380px] w-[360px] rounded-lg border border-white/10 bg-black/85 backdrop-blur p-3 text-[11px] leading-relaxed shadow-2xl pointer-events-auto select-text"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
          DocxPreview · debug
        </span>
        <span className="text-[9px] text-white/30 font-mono">?debug=1</span>
      </div>

      <div className="space-y-0.5">
        {row("file size", fmtBytes(debug.fileSizeBytes))}
        {row("fetch ok", fmtBool(debug.fetchOk))}
        {row("pgBorders detected", fmtBool(debug.hasPageBorders))}
        {row("className", debug.className)}
        {row(
          "ignoreLastRenderedPageBreak",
          String(debug.ignoreLastRenderedPageBreak),
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
        {row("raw sections (post-render)", debug.rawSectionCount ?? "—")}
        {row(
          "split: sections expanded",
          debug.splitStats?.sectionsSplit ?? "—",
        )}
        {row(
          "split: pages added",
          debug.splitStats?.pagesAdded ?? "—",
        )}
        {row(
          "blank cleanup: removed",
          debug.blankStats?.blankRemoved ?? "—",
        )}
        {row("FINAL sections rendered", debug.finalSectionCount ?? "—")}
        {row("total render time", debug.totalRenderMs == null ? "—" : `${debug.totalRenderMs} ms`)}
      </div>

      {debug.warnings.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="text-white/50 text-[10px] uppercase tracking-widest mb-1">
            warnings ({debug.warnings.length})
          </div>
          <div className="font-mono text-amber-300 text-[10px] max-h-24 overflow-auto">
            {debug.warnings.map((w, i) => (
              <div key={i} className="break-words py-0.5">
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {debug.error && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="text-red-400 font-mono text-[10px] break-words">
            error: {debug.error}
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-white/10 text-white/30 text-[9px] uppercase tracking-widest">
        Click + drag to copy · screenshot welcome
      </div>
    </div>
  );
}
