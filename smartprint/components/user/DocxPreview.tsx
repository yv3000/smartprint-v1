"use client";

import { useEffect, useMemo, useState } from "react";
import mammoth from "mammoth";
import { Loader2, FileText, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getPaperAspectForOrientation, getMarginMm } from "@/lib/printLayout";

interface DocxPreviewProps {
  file: File;
  paperSize?: string;
  margins?: string;
  customMarginTopBottom?: number;
  customMarginLeftRight?: number;
  orientation?: "Portrait" | "Landscape";
  baseColorMode?: "Color" | "Black & White";
  pagesPerSheet?: number;
  pagesPerSheetFill?: "repeat" | "blank";
  pageSelection?: "All" | "Current" | "Odd" | "Even" | "Custom";
  customPageRange?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  scaleMode?: "Fit to Page Width" | "Custom Scale";
  customScalePercentage?: number;
}

const MM_TO_PX = 3.7795275591;

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

function paginateHtml(html: string, pageBodyHeightPx: number): string[] {
  if (typeof window === "undefined") return [html];
  const tempRoot = document.createElement("div");
  tempRoot.style.position = "fixed";
  tempRoot.style.left = "-99999px";
  tempRoot.style.top = "0";
  tempRoot.style.width = "760px";
  tempRoot.style.visibility = "hidden";
  tempRoot.style.pointerEvents = "none";
  document.body.appendChild(tempRoot);

  const source = document.createElement("div");
  source.className = "docx-page-content";
  source.innerHTML = html;

  const current = document.createElement("div");
  current.className = "docx-page-content";
  tempRoot.appendChild(current);

  const pages: string[] = [];
  const nodes = Array.from(source.childNodes);
  nodes.forEach((node) => {
    const cloned = node.cloneNode(true);
    current.appendChild(cloned);
    if (current.scrollHeight > pageBodyHeightPx && current.childNodes.length > 1) {
      current.removeChild(cloned);
      pages.push(current.innerHTML);
      current.innerHTML = "";
      current.appendChild(cloned);
    }
  });
  if (current.innerHTML.trim()) pages.push(current.innerHTML);
  document.body.removeChild(tempRoot);
  return pages.length ? pages : [html];
}

export default function DocxPreview({
  file,
  paperSize = "A4",
  margins = "Default",
  customMarginTopBottom,
  customMarginLeftRight,
  orientation = "Portrait",
  baseColorMode = "Color",
  pagesPerSheet = 1,
  pagesPerSheetFill = "blank",
  pageSelection = "All",
  customPageRange = "",
  currentPage = 1,
  onPageChange,
  scaleMode = "Fit to Page Width",
  customScalePercentage = 100,
}: DocxPreviewProps) {
  const [pagesHtml, setPagesHtml] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const aspect = getPaperAspectForOrientation(paperSize, orientation);
  const marginMm = getMarginMm({
    margins,
    customMarginTopBottom,
    customMarginLeftRight,
  });

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const pageBodyHeightMm = Math.max(
          40,
          (orientation === "Portrait" ? aspect.h : aspect.h) - marginMm.top - marginMm.bottom
        );
        const pageBodyHeightPx = pageBodyHeightMm * MM_TO_PX;
        const pages = paginateHtml(result.value, pageBodyHeightPx);
        setPagesHtml(pages);
      } catch {
        setError("Failed to convert DOCX to preview.");
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, [file, orientation, aspect.h, marginMm.top, marginMm.bottom]);

  const allPages = useMemo(() => pagesHtml.map((_, i) => i + 1), [pagesHtml]);
  const visiblePages = useMemo(() => {
    if (pageSelection === "Current") return [Math.max(1, Math.min(currentPage, allPages.length || 1))];
    if (pageSelection === "Odd") return allPages.filter((p) => p % 2 !== 0);
    if (pageSelection === "Even") return allPages.filter((p) => p % 2 === 0);
    if (pageSelection === "Custom") {
      const set = new Set(parseCustomRange(customPageRange));
      return allPages.filter((p) => set.has(p));
    }
    return allPages;
  }, [allPages, pageSelection, customPageRange, currentPage]);

  useEffect(() => {
    if (!visiblePages.length) {
      setVisibleIndex(0);
      return;
    }
    const target = Math.max(1, Math.min(currentPage, allPages.length || 1));
    const idx = visiblePages.indexOf(target);
    if (idx >= 0) setVisibleIndex(idx);
    else setVisibleIndex((prev) => Math.min(prev, visiblePages.length - 1));
  }, [currentPage, visiblePages, allPages.length]);

  const currentVisiblePage = visiblePages[Math.min(visibleIndex, Math.max(0, visiblePages.length - 1))] || 1;
  const previewScale = scaleMode === "Custom Scale" ? Math.max(0.4, Math.min(2, customScalePercentage / 100)) : 1;
  const cols =
    pagesPerSheet >= 16 ? 4 :
    pagesPerSheet >= 9 ? 3 :
    pagesPerSheet >= 4 ? 2 :
    pagesPerSheet >= 2 ? 2 : 1;

  const changePage = (offset: number) => {
    if (!visiblePages.length) return;
    const nextIndex = Math.min(Math.max(0, visibleIndex + offset), visiblePages.length - 1);
    setVisibleIndex(nextIndex);
    onPageChange?.(visiblePages[nextIndex]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Converting Document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-gray-900">Preview Error</p>
          <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#323639] overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-[#202124] border-b border-white/5 shrink-0">
        <FileText className="w-4 h-4 text-indigo-400" />
        <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Live Document Pages</span>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-6 custom-docx-scroll">
        <div
          className="w-full max-w-[min(100%,520px)] mx-auto grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            transform: `scale(${previewScale})`,
            transformOrigin: "top center",
            filter: baseColorMode === "Black & White" ? "grayscale(1) contrast(1.08)" : undefined,
          }}
        >
          {Array.from({ length: Math.max(1, pagesPerSheet) }).map((_, idx) => {
            const pageAtTile = visiblePages[visibleIndex + idx];
            const shouldShow = pagesPerSheetFill === "repeat" ? !!(pageAtTile || currentVisiblePage) : !!pageAtTile;
            const html = shouldShow ? pagesHtml[(pageAtTile || currentVisiblePage) - 1] : "";
            return (
              <div
                key={idx}
                className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] rounded-sm overflow-hidden"
                style={{
                  aspectRatio: `${aspect.w} / ${aspect.h}`,
                  padding: `${marginMm.top}mm ${marginMm.right}mm ${marginMm.bottom}mm ${marginMm.left}mm`,
                }}
              >
                {shouldShow ? (
                  <div dangerouslySetInnerHTML={{ __html: html || "" }} className="docx-page-content h-full overflow-hidden" />
                ) : (
                  <div className="w-full h-full border border-dashed border-gray-200 rounded-sm bg-white/90" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#202124] border-t border-white/5 p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{paperSize} • {orientation}</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          <button type="button" disabled={visibleIndex <= 0} onClick={() => changePage(-1)} className="p-1 disabled:opacity-25 text-white hover:text-indigo-400 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white">
            {currentVisiblePage} / {visiblePages.length || 1}
          </span>
          <button type="button" disabled={!visiblePages.length || visibleIndex >= visiblePages.length - 1} onClick={() => changePage(1)} className="p-1 disabled:opacity-25 text-white hover:text-indigo-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .custom-docx-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .custom-docx-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-docx-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .docx-page-content {
          word-wrap: break-word;
          overflow-wrap: break-word;
          font-family: Calibri, "Segoe UI", Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #1a1a1a;
        }
        .docx-page-content h1 { font-size: 18pt; font-weight: bold; margin-bottom: 12pt; }
        .docx-page-content h2 { font-size: 14pt; font-weight: bold; margin-top: 18pt; margin-bottom: 8pt; }
        .docx-page-content h3 { font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt; }
        .docx-page-content p { margin-bottom: 8pt; text-align: justify; }
        .docx-page-content img { max-width: 100%; height: auto; margin: 10pt 0; }
        .docx-page-content table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
        .docx-page-content th, .docx-page-content td { border: 1px solid #d1d5db; padding: 6pt 8pt; text-align: left; font-size: 10pt; }
        .docx-page-content th { background-color: #f3f4f6; font-weight: bold; }
        .docx-page-content ul, .docx-page-content ol { margin-left: 20pt; margin-bottom: 8pt; }
        .docx-page-content li { margin-bottom: 4pt; }
      `}</style>
    </div>
  );
}
