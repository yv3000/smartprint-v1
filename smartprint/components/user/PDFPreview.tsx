"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  fileUrl: string;
  colorPagesRange: string;
  bwPagesRange: string;
  enableColorRange: boolean;
  enableBWRange: boolean;
  enableAdvancedColor: boolean;
  baseColorMode: string;
}

export default function PDFPreview({ fileUrl, colorPagesRange, bwPagesRange, enableColorRange, enableBWRange, enableAdvancedColor, baseColorMode }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const parsePageRange = (rangeStr: string): number[] => {
    if (!rangeStr) return [];
    const pages = new Set<number>();
    const parts = rangeStr.split(',');
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const rangeParts = trimmed.split('-');
        const start = parseInt(rangeParts[0]?.trim());
        const end = parseInt(rangeParts[1]?.trim());
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) pages.add(i);
        }
      } else {
        const num = parseInt(trimmed);
        if (!isNaN(num)) pages.add(num);
      }
    });
    return Array.from(pages);
  };

  const isPageColor = (pageNumber: number) => {
    if (!enableAdvancedColor) return baseColorMode === 'Color';
    
    const colorPages = parsePageRange(colorPagesRange);
    const bwPages = parsePageRange(bwPagesRange);

    if (enableColorRange && enableBWRange) {
      if (colorPages.includes(pageNumber)) return true;
      if (bwPages.includes(pageNumber)) return false;
      return baseColorMode === 'Color';
    }

    if (enableColorRange) {
      return colorPages.includes(pageNumber);
    }
    
    if (enableBWRange) {
      return !bwPages.includes(pageNumber);
    }

    return baseColorMode === 'Color';
  };

  const goToPage = (page: number) => {
    if (numPages && page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToPage(currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentPage, numPages]);

  // Touch/swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goToPage(currentPage + 1); // swipe left → next
      else goToPage(currentPage - 1); // swipe right → prev
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F9FAFB]">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">PDF Explorer</span>
          {numPages && (
            <span className="px-2 py-0.5 bg-[#4F46E5]/10 text-[#4F46E5] text-[10px] font-bold rounded-full">
              {numPages} Pages
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setScale(prev => Math.max(0.4, prev - 0.15))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-[10px] font-bold w-12 text-center text-gray-400">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(prev => Math.min(2.5, prev + 0.15))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Page content - single page view */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-6 flex items-center justify-center custom-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center p-20 gap-3">
              <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rendering Pages...</p>
            </div>
          }
          error={
            <div className="p-16 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <span className="text-2xl text-red-500">!</span>
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-gray-900">Unable to load preview</p>
                <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">This could be due to file corruption or an unsupported PDF format.</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all"
              >
                Retry Loading
              </button>
            </div>
          }
        >
          <div className="relative group">
            <div 
              className="shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 rounded-sm transition-all duration-300"
              style={{
                filter: isPageColor(currentPage) ? 'none' : 'grayscale(100%)',
                opacity: isPageColor(currentPage) ? 1 : 0.85
              }}
            >
              <Page 
                pageNumber={currentPage} 
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="rounded-sm overflow-hidden"
              />
            </div>
            
            {/* Color/BW tag overlay */}
            {enableAdvancedColor && (
              <div className="absolute top-3 right-3 pointer-events-none">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight shadow-lg ${isPageColor(currentPage) ? 'bg-[#4F46E5] text-white' : 'bg-gray-700 text-white'}`}>
                  {isPageColor(currentPage) ? '🎨 Color' : '◐ B&W'}
                </span>
              </div>
            )}
          </div>
        </Document>
      </div>

      {/* Bottom navigation bar */}
      {numPages && numPages > 0 && (
        <div className="flex items-center justify-between p-3 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
          {/* Left arrow */}
          <button 
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`p-2 rounded-lg transition-all ${currentPage <= 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100 active:scale-95'}`}
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>

          {/* Page indicator with dots / numbers */}
          <div className="flex items-center gap-2">
            {numPages <= 10 ? (
              // Show dots for few pages
              <div className="flex items-center gap-1.5">
                {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`transition-all duration-200 rounded-full ${
                      page === currentPage
                        ? 'w-7 h-3 bg-[#4F46E5]'
                        : 'w-3 h-3 bg-gray-200 hover:bg-gray-300'
                    }`}
                    title={`Page ${page}`}
                  />
                ))}
              </div>
            ) : (
              // Show page number input for many pages
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-bold">Page</span>
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) goToPage(val);
                  }}
                  className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
                <span className="text-xs text-gray-400 font-bold">of {numPages}</span>
              </div>
            )}
          </div>

          {/* Right arrow */}
          <button 
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className={`p-2 rounded-lg transition-all ${currentPage >= numPages ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100 active:scale-95'}`}
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}</style>
    </div>
  );
}
