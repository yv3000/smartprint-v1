"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Info } from "lucide-react";

// Set worker source
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
  currentPage: externalPage
}: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(externalPage || 1);
  const [scale, setScale] = useState<number>(0.8);

  useEffect(() => {
    if (externalPage && externalPage !== pageNumber) {
      setPageNumber(externalPage);
    }
  }, [externalPage]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const changePage = (offset: number) => {
    const newPage = Math.min(Math.max(1, pageNumber + offset), numPages);
    setPageNumber(newPage);
    onPageChange?.(newPage);
  };

  // Build a summary of what pages will be extracted
  const getSplitSummary = () => {
    if (!enableAdvancedColor) return null;
    const parts: string[] = [];
    if (enableColorRange && colorPagesRange) parts.push(`🎨 Color: [${colorPagesRange}]`);
    if (enableBWRange && bwPagesRange) parts.push(`◐ B&W: [${bwPagesRange}]`);
    return parts.length > 0 ? parts : null;
  };

  const splitSummary = getSplitSummary();

  return (
    <div className="w-full h-full flex flex-col bg-[#323639] overflow-hidden">
      {/* Top Bar / Summary */}
      {splitSummary && (
        <div className="bg-indigo-600 px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <Info className="w-3.5 h-3.5 text-white/70" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {splitSummary.map((line, i) => (
              <span key={i} className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{line}</span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex justify-center p-6 custom-pdf-scroll">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Rendering Engine</p>
            </div>
          }
          className="shadow-2xl"
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="rounded-sm overflow-hidden"
          />
        </Document>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-[#202124] border-t border-white/5 p-4 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-1">
           <button 
            onClick={() => setScale(s => Math.max(0.4, s - 0.1))}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
          <button 
            disabled={pageNumber <= 1}
            onClick={() => changePage(-1)}
            className="p-1 disabled:opacity-20 text-white hover:text-indigo-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
            <span className="text-sm font-black text-white">{pageNumber}</span>
            <span className="text-[10px] font-bold text-white/20 uppercase">of</span>
            <span className="text-sm font-black text-white/40">{numPages || '…'}</span>
          </div>
          <button 
            disabled={pageNumber >= numPages}
            onClick={() => changePage(1)}
            className="p-1 disabled:opacity-20 text-white hover:text-indigo-400 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="w-24 hidden md:flex justify-end">
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
          background: rgba(255,255,255,0.02);
        }
        .custom-pdf-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-pdf-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
