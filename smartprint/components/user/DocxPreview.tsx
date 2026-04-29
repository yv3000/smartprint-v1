"use client";

import { useEffect, useState } from "react";
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
    <div className="w-full h-full bg-white overflow-auto p-8 font-serif docx-preview-content animate-in fade-in duration-500">
      <div 
        dangerouslySetInnerHTML={{ __html: content || "" }} 
        className="prose prose-sm max-w-none prose-slate"
      />
      
      <style jsx global>{`
        .docx-preview-content {
          color: #1a1a1a;
          line-height: 1.6;
        }
        .docx-preview-content h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; }
        .docx-preview-content h2 { font-size: 1.25rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .docx-preview-content p { margin-bottom: 1rem; }
        .docx-preview-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .docx-preview-content th, .docx-preview-content td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
        .docx-preview-content th { bg-color: #f8fafc; font-weight: bold; }
      `}</style>
    </div>
  );
}
