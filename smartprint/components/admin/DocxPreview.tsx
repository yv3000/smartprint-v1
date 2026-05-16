"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { safeSplitOverflowingSections } from "@/lib/docxPaginate";

interface DocxPreviewProps {
  /** Pre-signed URL to fetch the .docx file from. */
  fileUrl: string;
  /** Optional grayscale filter (Black & White preview mode). */
  grayscale?: boolean;
  /** Optional className for the outer container. */
  className?: string;
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
 */
export default function DocxPreview({
  fileUrl,
  grayscale = false,
  className = "",
}: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    setLoading(true);
    setError(null);
    container.innerHTML = "";

    (async () => {
      try {
        const response = await fetch(fileUrl, { credentials: "include" });
        if (!response.ok) {
          throw new Error(
            `Failed to fetch document (HTTP ${response.status}).`,
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled || !containerRef.current) return;

        const { renderAsync } = await import("docx-preview");
        await renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: "docx-admin",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        if (cancelled || !containerRef.current) return;

        // Split sections that overflow their declared page height — fixes
        // documents lacking lastRenderedPageBreak markers.
        safeSplitOverflowingSections(containerRef.current);

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to render the document.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return (
    <div className={`relative w-full h-full bg-[#E8E8E8] ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#E8E8E8] z-10">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Rendering document…
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#E8E8E8] z-10 p-8 text-center">
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

      <div
        ref={containerRef}
        className="docx-admin-host w-full h-full overflow-auto"
        style={{
          filter: grayscale ? "grayscale(1) contrast(1.05)" : undefined,
        }}
      />

      <style jsx global>{`
        /* docx-preview emits a wrapper + per-page <section.docx-admin>.
           We provide the gray paper backdrop, drop shadow and gap between
           pages. Crucially we do NOT touch width / min-height / padding
           on .docx-admin sections — those carry the original Word page
           geometry and must stay intact. */
        .docx-admin-host .docx-admin-wrapper {
          background: #e8e8e8 !important;
          padding: 24px !important;
          display: flex;
          flex-flow: column;
          align-items: center;
          gap: 24px;
        }

        .docx-admin-host section.docx-admin {
          background: white !important;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18) !important;
          margin: 0 !important;
          color-scheme: light;
          color: #1a1a1a;
        }

        /* Theme isolation: keep paper light in dark-mode body. */
        .docx-admin-host {
          color-scheme: light;
        }
      `}</style>
    </div>
  );
}
