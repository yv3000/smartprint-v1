"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Info } from "lucide-react";
import { getPaperAspectForOrientation, getMarginMm } from "@/lib/printLayout";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  fileUrl: string;
  colorPagesRange: string;
  bwPagesRange: string;
  enableColorRange: boolean;
  enableBWRange: boolean;
  enableAdvancedColor: boolean;
  baseColorMode: string;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  paperSize?: string;
  margins?: string;
  customMarginTopBottom?: number;
  customMarginLeftRight?: number;
  orientation?: "Portrait" | "Landscape";
  pagesPerSheet?: number;
  pagesPerSheetFill?: "repeat" | "blank";
  pageSelection?: "All" | "Current" | "Odd" | "Even" | "Custom";
  customPageRange?: string;
}

export default function PDFPreview({
  fileUrl,
  colorPagesRange,
  bwPagesRange,
  enableColorRange,
  enableBWRange,
  enableAdvancedColor,
  baseColorMode,
  onPageChange,
  currentPage: externalPage,
  paperSize = "A4",
  margins = "Default",
  customMarginTopBottom,
  customMarginLeftRight,
  orientation = "Portrait",
  pagesPerSheet = 1,
  pagesPerSheetFill = "blank",
  pageSelection = "All",
  customPageRange = "",
}: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [visibleIndex, setVisibleIndex] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.8);
  const [pageWidth, setPageWidth] = useState<number>(320);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isBw = baseColorMode === "Black & White";
  const aspect = getPaperAspectForOrientation(paperSize, orientation);
  const marginMm = getMarginMm({
    margins,
    customMarginTopBottom,
    customMarginLeftRight,
  });

  const measureWidth = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 40) setPageWidth(Math.floor(w));
  }, [paperSize, margins, orientation, customMarginTopBottom, customMarginLeftRight]);

  useLayoutEffect(() => {
    measureWidth();
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureWidth]);

  const parseCustomRange = (rangeStr: string): number[] => {
    if (!rangeStr) return [];
    const pages = new Set<number>();
    rangeStr.split(",").forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-");
        const start = parseInt(startStr?.trim(), 10);
        const end = parseInt(endStr?.trim(), 10);
        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          const from = Math.min(start, end);
          const to = Math.max(start, end);
          for (let i = from; i <= to; i += 1) pages.add(i);
        }
      } else {
        const n = parseInt(trimmed, 10);
        if (!Number.isNaN(n)) pages.add(n);
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  };

  const getVisiblePages = useCallback(() => {
    const allPages = Array.from({ length: numPages }, (_, i) => i + 1);
    if (pageSelection === "Current") {
      const p = externalPage && externalPage >= 1 ? externalPage : 1;
      return [Math.min(p, numPages || 1)];
    }
    if (pageSelection === "Odd") return allPages.filter((p) => p % 2 !== 0);
    if (pageSelection === "Even") return allPages.filter((p) => p % 2 === 0);
    if (pageSelection === "Custom") {
      const allowed = new Set(parseCustomRange(customPageRange).filter((p) => p >= 1 && p <= numPages));
      return allPages.filter((p) => allowed.has(p));
    }
    return allPages;
  }, [numPages, pageSelection, customPageRange, externalPage]);

  const visiblePages = getVisiblePages();
  const currentPageNumber = visiblePages[Math.min(visibleIndex, Math.max(0, visiblePages.length - 1))] || 1;

  useEffect(() => {
    if (visiblePages.length === 0) {
      setVisibleIndex(0);
      return;
    }
    if (externalPage != null) {
      const idx = visiblePages.indexOf(externalPage);
      if (idx >= 0) {
        setVisibleIndex(idx);
        return;
      }
    }
    setVisibleIndex((prev) => Math.min(prev, visiblePages.length - 1));
  }, [externalPage, visiblePages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    requestAnimationFrame(measureWidth);
  };

  const changePage = (offset: number) => {
    if (!visiblePages.length) return;
    const nextIndex = Math.min(Math.max(0, visibleIndex + offset), visiblePages.length - 1);
    setVisibleIndex(nextIndex);
    onPageChange?.(visiblePages[nextIndex]);
  };

  const getSplitSummary = () => {
    if (!enableAdvancedColor) return null;
    const parts: string[] = [];
    if (enableColorRange && colorPagesRange) parts.push(`🎨 Color: [${colorPagesRange}]`);
    if (enableBWRange && bwPagesRange) parts.push(`◐ B&W: [${bwPagesRange}]`);
    return parts.length > 0 ? parts : null;
  };

  const splitSummary = getSplitSummary();
  const cols =
    pagesPerSheet >= 16 ? 4 :
    pagesPerSheet >= 9 ? 3 :
    pagesPerSheet >= 4 ? 2 :
    pagesPerSheet >= 2 ? 2 : 1;

  return (
    <div className="w-full h-full flex flex-col bg-[#323639] overflow-hidden transition-colors duration-300">
      {splitSummary && (
        <div className="bg-indigo-600 px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <Info className="w-3.5 h-3.5 text-white/70" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {splitSummary.map((line, i) => (
              <span key={i} className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                {line}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto flex justify-center p-3 sm:p-6 custom-pdf-scroll">
        <div
          ref={frameRef}
          className="w-full max-w-[min(100%,520px)] mx-auto flex flex-col transition-[padding,aspect-ratio] duration-300 ease-out"
          style={{
            aspectRatio: `${aspect.w} / ${aspect.h}`,
            padding: `${marginMm.top}mm ${marginMm.right}mm ${marginMm.bottom}mm ${marginMm.left}mm`,
            boxSizing: "border-box",
            background: "#e8eaed",
            borderRadius: 8,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div
            ref={contentRef}
            className="w-full flex-1 min-h-0 flex items-center justify-center overflow-auto rounded-sm bg-white"
            style={{
              filter: isBw ? "grayscale(1) contrast(1.08)" : undefined,
              transition: "filter 0.25s ease",
            }}
          >
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center gap-3 py-20 px-4">
                  <Loader2 className="w-8 h-8 text-black/20 animate-spin" />
                  <p className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em]">Rendering Engine</p>
                </div>
              }
              className="shadow-inner max-w-full w-full h-full"
            >
              <div
                className="w-full h-full grid place-items-center p-1 sm:p-2"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: pagesPerSheet > 1 ? 4 : 0 }}
              >
                {Array.from({ length: Math.max(1, pagesPerSheet) }).map((_, idx) => {
                  const pageAtTile = visiblePages[visibleIndex + idx];
                  const showPage = pagesPerSheetFill === "repeat" ? !!(pageAtTile || currentPageNumber) : !!pageAtTile;
                  const tileWidth = Math.max(48, Math.floor((pageWidth / cols) * scale));
                  return (
                    <div key={idx} className="w-full h-full min-h-0 min-w-0 flex items-center justify-center bg-white">
                      {showPage ? (
                        <Page
                          key={`${currentPageNumber}-${pageWidth}-${scale}-${isBw}-${idx}-${visibleIndex}`}
                          pageNumber={pageAtTile || currentPageNumber}
                          width={tileWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="rounded-sm overflow-hidden max-w-full"
                        />
                      ) : (
                        <div className="w-[85%] h-[85%] border border-dashed border-gray-200 bg-white/90 rounded-sm" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Document>
          </div>
        </div>
      </div>

      <div className="bg-[#202124] border-t border-white/5 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.4, s - 0.1))}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 bg-white/5 px-3 sm:px-4 py-2 rounded-2xl border border-white/5">
          <button
            type="button"
            disabled={visibleIndex <= 0}
            onClick={() => changePage(-1)}
            className="p-1 disabled:opacity-20 text-white hover:text-indigo-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
            <span className="text-sm font-black text-white">{currentPageNumber}</span>
            <span className="text-[10px] font-bold text-white/20 uppercase">of</span>
            <span className="text-sm font-black text-white/40">{visiblePages.length || "…"}</span>
          </div>
          <button
            type="button"
            disabled={!visiblePages.length || visibleIndex >= visiblePages.length - 1}
            onClick={() => changePage(1)}
            className="p-1 disabled:opacity-20 text-white hover:text-indigo-400 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[7rem] flex justify-center sm:justify-end">
          <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">HD Preview</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-pdf-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .custom-pdf-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-pdf-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-pdf-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
