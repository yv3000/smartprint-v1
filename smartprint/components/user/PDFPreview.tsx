"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";

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
  const [loaded, setLoaded] = useState(false);

  // Build a summary of what pages will be extracted
  const getSplitSummary = () => {
    if (!enableAdvancedColor) return null;

    const parts: string[] = [];

    if (enableColorRange && colorPagesRange) {
      parts.push(`🎨 Color file: pages [${colorPagesRange}]`);
    }
    if (enableBWRange && bwPagesRange) {
      parts.push(`◐ B&W file: pages [${bwPagesRange}]`);
    }
    if (enableColorRange && !enableBWRange && colorPagesRange) {
      parts.push(`◐ B&W file: all remaining pages`);
    }
    if (!enableColorRange && enableBWRange && bwPagesRange) {
      parts.push(`🎨 Color file: all remaining pages`);
    }

    return parts.length > 0 ? parts : null;
  };

  const splitSummary = getSplitSummary();

  return (
    <div className="w-full h-full flex flex-col bg-[#525659]">
      {/* Native browser PDF viewer */}
      <iframe
        src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
        className="w-full flex-1 border-none rounded-sm"
        style={{ minHeight: '500px' }}
        title="PDF Preview"
        onLoad={() => setLoaded(true)}
      />

      {/* Color/BW split info bar */}
      {splitSummary && (
        <div className="bg-white border-t border-gray-200 p-3 space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">File Split Preview</p>
          {splitSummary.map((line, i) => (
            <p key={i} className="text-xs font-medium text-gray-700">{line}</p>
          ))}
          <p className="text-[10px] text-indigo-500 font-bold mt-1">
            ↑ Two separate PDF files will be sent to the print shop
          </p>
        </div>
      )}
    </div>
  );
}
