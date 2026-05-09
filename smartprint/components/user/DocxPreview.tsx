"use client";

import { useEffect, useState, useRef } from "react";
import mammoth from "mammoth";
import { Loader2, FileText, AlertCircle } from "lucide-react";

interface DocxPreviewProps {
  file: File;
}

export default function DocxPreview({ file }: DocxPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setContent(result.value);
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
      {/* Top bar */}
      <div className="flex items-center gap-2 p-3 bg-[#202124] border-b border-white/5 shrink-0">
        <FileText className="w-4 h-4 text-indigo-400" />
        <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Live Document Stream</span>
      </div>

      {/* A4-sized document page */}
      <div className="flex-1 overflow-auto p-8 flex justify-center custom-docx-scroll">
        <div 
          className="bg-white shadow-[0_10px_50px_rgba(0,0,0,0.5)] docx-preview-page animate-in fade-in zoom-in-95 duration-500"
          style={{
            width: '100%',
            maxWidth: '210mm', // A4 width
            minHeight: '297mm', // A4 height
            padding: '25mm 20mm', // Standard margins
            boxSizing: 'border-box',
            fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
            fontSize: '11pt',
            lineHeight: 1.5,
            color: '#1a1a1a',
          }}
        >
          <div 
            dangerouslySetInnerHTML={{ __html: content || "" }} 
            className="docx-page-content"
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#202124] border-t border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Optimized for A4</span>
        </div>
        <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Mammoth HTML Engine</span>
        </div>
      </div>

      <style jsx global>{`
        .custom-docx-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .custom-docx-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        .custom-docx-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .docx-page-content {
          word-wrap: break-word;
          overflow-wrap: break-word;
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
