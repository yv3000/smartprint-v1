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
    <div className="w-full h-full flex flex-col bg-[#525659] overflow-auto">
      {/* Top bar */}
      <div className="flex items-center gap-2 p-2.5 bg-[#3b3b3b] border-b border-[#2a2a2a] shrink-0">
        <FileText className="w-4 h-4 text-gray-300" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Document Preview</span>
      </div>

      {/* A4-sized document page */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
        <div 
          className="bg-white shadow-[0_4px_30px_rgba(0,0,0,0.3)] docx-preview-page"
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

      <style jsx global>{`
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
        .docx-page-content strong, .docx-page-content b { font-weight: bold; }
        .docx-page-content em, .docx-page-content i { font-style: italic; }
      `}</style>
    </div>
  );
}
