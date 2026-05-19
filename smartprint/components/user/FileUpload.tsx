"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadedFile {
  file: File;
  id: string;
  progress: number;
}

interface Props {
  files: UploadedFile[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
}

function getFileType(name: string, type: string): "pdf" | "doc" | "img" | "file" {
  const lower = name.toLowerCase();
  if (type.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|tiff)$/i.test(lower)) return "img";
  if (type.includes("word") || lower.endsWith(".docx") || lower.endsWith(".doc")) return "doc";
  return "file";
}

function fileTypeLabel(t: "pdf" | "doc" | "img" | "file") {
  if (t === "pdf") return "PDF";
  if (t === "doc") return "DOC";
  if (t === "img") return "IMG";
  return "FILE";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({ files, onFilesAdded, onRemoveFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
    accept: {
      // Documents
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/rtf": [".rtf"],
      "text/rtf": [".rtf"],
      // Spreadsheets
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
      "text/csv": [".csv"],
      // Presentations
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.oasis.opendocument.presentation": [".odp"],
      // Images
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
      "image/bmp": [".bmp"],
      "image/svg+xml": [".svg"],
      // Text
      "text/plain": [".txt"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="space-y-5">
      {/* ── Drop zone ──────────────────────────────────── */}
      <div
        {...getRootProps()}
        data-active={isDragging || undefined}
        className="up-dropzone cursor-pointer"
        style={{
          padding: "clamp(28px, 6vw, 48px) 24px",
          minHeight: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          textAlign: "center",
        }}
      >
        <input {...getInputProps()} />

        <div
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: isDragging ? "rgba(0,113,227,0.10)" : "rgba(0,0,0,0.04)",
            color: isDragging ? "var(--up-accent)" : "var(--up-text-3)",
            transition: "all 0.25s var(--up-ease)",
            marginBottom: 4,
          }}
        >
          <UploadCloud size={22} strokeWidth={1.5} />
        </div>

        <div>
          <p
            style={{
              fontSize: "1.25em",
              fontWeight: 500,
              color: "var(--up-text)",
              marginBottom: 2,
            }}
          >
            Drop files here
          </p>
          <p
            style={{
              fontSize: "1.08em",
              color: "var(--up-text-2)",
            }}
          >
            or{" "}
            <span
              style={{
                color: "var(--up-accent)",
                textDecoration: "underline",
                textDecorationThickness: "0.5px",
                textUnderlineOffset: 2,
              }}
            >
              browse
            </span>
          </p>
        </div>

        <p
          style={{
            fontSize: "0.92em",
            color: "var(--up-text-3)",
            marginTop: 8,
          }}
        >
          PDF, JPG, PNG, DOCX — up to 25 MB
        </p>
      </div>

      {/* ── File list ──────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {files.length > 0 && (
          <motion.div
            key="files"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="up-card"
            style={{ padding: 4 }}
          >
            <div
              className="up-section-label"
              style={{ padding: "12px 16px 8px" }}
            >
              {files.length} file{files.length === 1 ? "" : "s"}
            </div>

            <div>
              {files.map((file, i) => {
                const t = getFileType(file.file.name, file.file.type);
                return (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="group flex items-center justify-between"
                    style={{
                      padding: "12px 16px",
                      borderTop:
                        i === 0 ? "none" : "0.5px solid var(--up-divider)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`up-ftype up-ftype-${t}`}>
                        {fileTypeLabel(t)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate"
                          style={{
                            fontSize: "1.08em",
                            color: "var(--up-text)",
                            fontWeight: 500,
                          }}
                        >
                          {file.file.name}
                        </p>
                        <p
                          style={{
                            fontSize: "0.95em",
                            color: "var(--up-text-2)",
                            marginTop: 2,
                          }}
                        >
                          {formatSize(file.file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(file.id);
                      }}
                      aria-label="Remove file"
                      className="opacity-60 hover:opacity-100"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent",
                        border: "none",
                        color: "var(--up-text-2)",
                        cursor: "pointer",
                        transition:
                          "background 0.2s var(--up-ease), color 0.2s var(--up-ease), opacity 0.2s var(--up-ease)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(255,59,48,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--up-danger)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--up-text-2)";
                      }}
                    >
                      <X size={16} strokeWidth={1.7} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
