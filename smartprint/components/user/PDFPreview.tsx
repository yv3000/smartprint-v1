"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  fileUrl: string;
  colorPagesRange: string;
  allPagesColor: boolean;
  baseColorMode: string;
}

export default function PDFPreview({ fileUrl, colorPagesRange, allPagesColor, baseColorMode }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(0.8);
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
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

  const colorPages = parsePageRange(colorPagesRange);

  const isPageColor = (pageNumber: number) => {
    if (allPagesColor) return true;
    return colorPages.includes(pageNumber);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F9FAFB]">
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
            onClick={() => setScale(prev => Math.max(0.4, prev - 0.1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-[10px] font-bold w-12 text-center text-gray-400">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-8 custom-scrollbar">
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
            <div className="p-10 text-center text-red-500">
              <p className="text-sm font-bold">Failed to load PDF</p>
            </div>
          }
        >
          {Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} className="relative group">
              <div 
                className="shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 rounded-sm transition-all duration-300"
                style={{
                  filter: isPageColor(index + 1) ? 'none' : 'grayscale(100%)',
                  opacity: isPageColor(index + 1) ? 1 : 0.85
                }}
              >
                <Page 
                  pageNumber={index + 1} 
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="rounded-sm overflow-hidden"
                />
              </div>
              
              {/* Page Number & Color Tag */}
              <div className="absolute -left-16 top-0 flex flex-col items-end gap-1 pointer-events-none">
                <span className="text-[10px] font-black text-gray-300 group-hover:text-[#4F46E5] transition-colors">#{index + 1}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter ${isPageColor(index + 1) ? 'bg-[#4F46E5] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {isPageColor(index + 1) ? 'Color' : 'B&W'}
                </span>
              </div>
            </div>
          ))}
        </Document>
      </div>

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
