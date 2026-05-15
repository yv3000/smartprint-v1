"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2, FileText, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getPaperAspectForOrientation } from "@/lib/printLayout";

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

export default function DocxPreview({
  file,
  paperSize = "A4",
  margins = "Default",
  customMarginTopBottom: _customMarginTopBottom,
  customMarginLeftRight: _customMarginLeftRight,
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
  const [pageNodes, setPageNodes] = useState<HTMLElement[]>([]);
  const [pageWidthPx, setPageWidthPx] = useState<number>(794); // A4 portrait default
  const [pageHeightPx, setPageHeightPx] = useState<number>(1123);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const aspect = getPaperAspectForOrientation(paperSize, orientation);
  const styleContainerRef = useRef<HTMLElement | null>(null);

  // Render the DOCX once, extract page sections
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        const buffer = await file.arrayBuffer();
        if (cancelled) return;

        // Hidden render host for the page bodies
        const host = document.createElement("div");
        host.style.position = "fixed";
        host.style.left = "-99999px";
        host.style.top = "0";
        host.style.visibility = "hidden";
        host.style.pointerEvents = "none";
        document.body.appendChild(host);

        // Persistent style container in <head> — docx-preview emits the
        // document's CSS (fonts, sizes, colors) into this. Must outlive
        // the host so the rendered pages keep their formatting after we
        // move them into the tiles.
        const styleContainer = document.createElement("div");
        styleContainer.dataset.docxStyles = "true";
        document.head.appendChild(styleContainer);
        // Replace any previous style container for this component
        if (styleContainerRef.current && styleContainerRef.current.parentElement) {
          styleContainerRef.current.parentElement.removeChild(styleContainerRef.current);
        }
        styleContainerRef.current = styleContainer;

        await renderAsync(buffer, host, styleContainer, {
          className: "docx-rendered",
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
        });

        if (cancelled) {
          if (host.parentElement) document.body.removeChild(host);
          if (styleContainer.parentElement) document.head.removeChild(styleContainer);
          return;
        }

        // Each page is rendered as <section class="docx ...">
        const sections = Array.from(
          host.querySelectorAll<HTMLElement>("section.docx, article.docx")
        );
        const nodes = sections.length
          ? sections
          : Array.from(host.children).filter(
              (n): n is HTMLElement => n instanceof HTMLElement
            );

        // Read first page's natural pixel size (docx-preview sets explicit
        // width/height in CSS reflecting the Word page geometry).
        if (nodes.length) {
          const first = nodes[0];
          const w = first.offsetWidth || first.getBoundingClientRect().width;
          const h = first.offsetHeight || first.getBoundingClientRect().height;
          if (w > 0) setPageWidthPx(w);
          if (h > 0) setPageHeightPx(h);
        }

        // Detach pages from host (kept alive in JS state) and discard host
        nodes.forEach((n) => n.parentElement?.removeChild(n));
        document.body.removeChild(host);

        setPageNodes(nodes);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to convert DOCX to preview."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  // Cleanup persistent style container on unmount
  useEffect(() => {
    return () => {
      if (styleContainerRef.current && styleContainerRef.current.parentElement) {
        styleContainerRef.current.parentElement.removeChild(styleContainerRef.current);
        styleContainerRef.current = null;
      }
    };
  }, []);

  const allPages = useMemo(() => pageNodes.map((_, i) => i + 1), [pageNodes]);
  const visiblePages = useMemo(() => {
    if (pageSelection === "Current")
      return [Math.max(1, Math.min(currentPage, allPages.length || 1))];
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

  const currentVisiblePage =
    visiblePages[Math.min(visibleIndex, Math.max(0, visiblePages.length - 1))] || 1;
  const userScale =
    scaleMode === "Custom Scale"
      ? Math.max(0.4, Math.min(2, customScalePercentage / 100))
      : 1;
  const cols =
    pagesPerSheet >= 16
      ? 4
      : pagesPerSheet >= 9
      ? 3
      : pagesPerSheet >= 4
      ? 2
      : pagesPerSheet >= 2
      ? 2
      : 1;

  // Track tile width to fit the (real) page-pixel size into the column
  const tileRef = useRef<HTMLDivElement | null>(null);
  const [tileWidth, setTileWidth] = useState<number>(pageWidthPx);
  useLayoutEffect(() => {
    if (!tileRef.current) return;
    const el = tileRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      if (w > 0) setTileWidth(w);
    });
    ro.observe(el);
    setTileWidth(el.clientWidth || pageWidthPx);
    return () => ro.disconnect();
  }, [pageWidthPx]);

  const fitScale = pageWidthPx > 0 ? tileWidth / pageWidthPx : 1;
  const pageScale = fitScale * userScale;

  const changePage = (offset: number) => {
    if (!visiblePages.length) return;
    const nextIndex = Math.min(
      Math.max(0, visibleIndex + offset),
      visiblePages.length - 1
    );
    setVisibleIndex(nextIndex);
    onPageChange?.(visiblePages[nextIndex]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
          Converting Document...
        </p>
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
      <div className="flex items-center justify-between gap-2 p-3 bg-[#202124] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
            Live Document Pages
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/60">
          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
            {paperSize}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
            {orientation}
          </span>
          {pagesPerSheet > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200">
              {pagesPerSheet}/sheet
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-6 custom-docx-scroll">
        <div
          className="w-full max-w-[min(100%,820px)] mx-auto grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            filter:
              baseColorMode === "Black & White" ? "grayscale(1) contrast(1.08)" : undefined,
          }}
        >
          {Array.from({ length: Math.max(1, pagesPerSheet) }).map((_, idx) => {
            const pageAtTile = visiblePages[visibleIndex + idx];
            const shouldShow =
              pagesPerSheetFill === "repeat"
                ? !!(pageAtTile || currentVisiblePage)
                : !!pageAtTile;
            const node = shouldShow
              ? pageNodes[(pageAtTile || currentVisiblePage) - 1]
              : null;
            return (
              <div
                key={idx}
                ref={idx === 0 ? tileRef : undefined}
                className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] rounded-sm overflow-hidden relative"
                style={{
                  width: "100%",
                  height: pageHeightPx * pageScale,
                  // Fallback aspect for empty tiles
                  aspectRatio: node ? undefined : `${aspect.w} / ${aspect.h}`,
                }}
              >
                {node ? (
                  <DocxPageHost
                    pageNode={node}
                    width={pageWidthPx}
                    height={pageHeightPx}
                    scale={pageScale}
                  />
                ) : (
                  <div className="absolute inset-0 border border-dashed border-gray-200 rounded-sm bg-white/90" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#202124] border-t border-white/5 p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
            Preview Live
          </span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          <button
            type="button"
            disabled={visibleIndex <= 0}
            onClick={() => changePage(-1)}
            className="p-1 disabled:opacity-25 text-white hover:text-indigo-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white">
            {currentVisiblePage} / {visiblePages.length || 1}
          </span>
          <button
            type="button"
            disabled={!visiblePages.length || visibleIndex >= visiblePages.length - 1}
            onClick={() => changePage(1)}
            className="p-1 disabled:opacity-25 text-white hover:text-indigo-400 transition-colors"
          >
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

        /* Theme isolation: docx pages render with the same colors as the
           original Word document, regardless of html.dark. We force the
           paper frame to a light color scheme and pin a dark default text
           color so paragraphs without explicit color do not inherit the
           dark-mode body color. Anything mammoth/docx-preview emits with
           an explicit color/font-size keeps it untouched. */
        .docx-page-mount {
          color-scheme: light;
          color: #1a1a1a;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

/* ── Mounts a pre-rendered docx-preview <section> into a tile, scaled
   uniformly to the column width. Re-uses the same DOM node across renders
   so docx-preview's internal styles stay attached. ───────────────────── */
function DocxPageHost({
  pageNode,
  width,
  height,
  scale,
}: {
  pageNode: HTMLElement;
  width: number;
  height: number;
  scale: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    // Move the page node into the mount (it can only live in one place at a time)
    el.appendChild(pageNode);
    return () => {
      if (pageNode.parentElement === el) el.removeChild(pageNode);
    };
  }, [pageNode]);

  return (
    <div
      ref={mountRef}
      className="docx-page-mount"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    />
  );
}
