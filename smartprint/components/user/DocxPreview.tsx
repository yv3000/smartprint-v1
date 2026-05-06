"use client";

import { useEffect, useState, useRef } from "react";
import mammoth from "mammoth";
import { Loader2, FileText, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface DocxPreviewProps {
  file: File;
}

export default function DocxPreview({ file }: DocxPreviewProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          { styleMap: ["p[style-name='Page Break'] => div.page-break"] }
        );
        
        const html = result.value;
        
        // Split by page breaks (mammoth may insert them)
        let splitPages = html.split(/<div class="page-break"><\/div>/i).filter(p => p.trim().length > 0);
        
        // If no page breaks found, create artificial pages by splitting content
        if (splitPages.length <= 1 && html.length > 500) {
          // Parse HTML to split by paragraphs into ~page-sized chunks
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          const children = Array.from(tempDiv.children);
          
          const chunkSize = 8; // ~8 block elements per page
          const chunks: string[] = [];
          for (let i = 0; i < children.length; i += chunkSize) {
            const chunk = children.slice(i, i + chunkSize).map(c => c.outerHTML).join('');
            if (chunk.trim()) chunks.push(chunk);
          }
          
          if (chunks.length > 1) {
            splitPages = chunks;
          }
        }
        
        setPages(splitPages.length > 0 ? splitPages : [html]);
        setCurrentPage(1);
      } catch (err) {
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
  }, [file]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pages.length) {
      setCurrentPage(page);
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Touch swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    }
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
    <div className="w-full h-full flex flex-col bg-[#F0F0F0]">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Document Preview</span>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
            {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
          </span>
        </div>
      </div>

      {/* Page content */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-auto p-6 flex items-start justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-200 rounded-sm"
          style={{
            width: '595px', // A4 width at 72dpi
            minHeight: '842px', // A4 height at 72dpi
            padding: '72px',
            fontFamily: 'Calibri, Arial, sans-serif',
            fontSize: '12pt',
            lineHeight: 1.6,
            color: '#1a1a1a',
            boxSizing: 'border-box',
          }}
        >
          <div 
            dangerouslySetInnerHTML={{ __html: pages[currentPage - 1] || "" }} 
            className="docx-page-content"
          />
        </div>
      </div>

      {/* Bottom navigation */}
      {pages.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
          <button 
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`p-2 rounded-lg transition-all ${currentPage <= 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100 active:scale-95'}`}
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>

          <div className="flex items-center gap-2">
            {pages.length <= 10 ? (
              <div className="flex items-center gap-1.5">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i + 1)}
                    className={`transition-all duration-200 rounded-full ${
                      i + 1 === currentPage
                        ? 'w-7 h-3 bg-blue-600'
                        : 'w-3 h-3 bg-gray-200 hover:bg-gray-300'
                    }`}
                    title={`Page ${i + 1}`}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-bold">Page</span>
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) goToPage(val);
                  }}
                  className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-gray-400 font-bold">of {pages.length}</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= pages.length}
            className={`p-2 rounded-lg transition-all ${currentPage >= pages.length ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100 active:scale-95'}`}
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      )}

      <style jsx global>{`
        .docx-page-content {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .docx-page-content h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; }
        .docx-page-content h2 { font-size: 1.25rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .docx-page-content p { margin-bottom: 0.75rem; }
        .docx-page-content img { max-width: 100%; height: auto; }
        .docx-page-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .docx-page-content th, .docx-page-content td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
        .docx-page-content th { background-color: #f8fafc; font-weight: bold; }
      `}</style>
    </div>
  );
}
