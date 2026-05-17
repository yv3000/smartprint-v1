"use client";

/**
 * Admin-side DOCX viewer backed by @eigenpal/docx-js-editor.
 *
 * Renders Word documents client-side in read-only mode. Headers,
 * footers, page borders, tables, embedded images, fonts: all preserved
 * to whatever fidelity the underlying ProseMirror-based renderer
 * supports (closer to Google Docs than to mammoth.js).
 *
 * IMPORTANT: this file MUST be lazy-loaded via next/dynamic with
 * `ssr: false` from the parent. The editor reaches into the DOM at
 * import time and crashes during Next.js server rendering otherwise.
 *
 * Library API reference:
 *   https://docx-editor.dev/docs/props
 *
 * - Prop name is `documentBuffer`, type DocxInput =
 *     ArrayBuffer | Uint8Array | Blob | File.
 * - `readOnly` hides toolbar / rulers / editing UI entirely.
 *   Switch to `mode="viewing"` instead if you want a toolbar with
 *   zoom + print + outline (still no editing).
 */

import { useEffect, useState } from "react";
import { DocxEditor } from "@eigenpal/docx-js-editor";
import "@eigenpal/docx-js-editor/styles.css";

interface DocxViewerProps {
  /** Pre-signed URL pointing at the .docx file. */
  fileUrl: string;
}

export default function DocxViewer({ fileUrl }: DocxViewerProps) {
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setDocxBlob(null);

    fetch(fileUrl, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        setDocxBlob(blob);
        setLoading(false);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[DocxViewer] fetch failed:", err);
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#525659] w-full h-full">
        <p className="text-white/40 font-bold text-sm uppercase tracking-widest animate-pulse">
          Loading document…
        </p>
      </div>
    );
  }

  if (error || !docxBlob) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#525659] w-full h-full">
        <p className="text-white/40 font-bold text-sm uppercase tracking-widest">
          Failed to load document
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-[#525659]">
      <DocxEditor documentBuffer={docxBlob} readOnly />
    </div>
  );
}
