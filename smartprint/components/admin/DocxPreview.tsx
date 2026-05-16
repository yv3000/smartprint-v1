"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  safeSplitOverflowingSections,
  safeRemoveBlankSections,
  docxHasPageBorders,
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

        // Detect <w:pgBorders> in the source XML so we can draw matching
        // CSS borders on each rendered section (docx-preview parses but
        // never renders pgBorders).
        const hasBorders = await docxHasPageBorders(arrayBuffer);
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

        // Split sections that overflow their declared page height — fixes
        // documents lacking lastRenderedPageBreak markers.
        safeSplitOverflowingSections(containerRef.current);

        // Strip blank section pages produced by paragraph-level sectPr
        // boundaries (forced pagination side-effect).
        safeRemoveBlankSections(containerRef.current);

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
