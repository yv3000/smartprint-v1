"use client";

<<<<<<< HEAD
import { useCallback, useRef, useState } from "react";
import { Pencil } from "lucide-react";
=======
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { 
  FileText, 
  Image as ImageIcon, 
  File, 
  X, 
  UploadCloud, 
  CheckCircle2,
  FileArchive
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
>>>>>>> 2b61e15460d9697c2dadb6cdab55e095b51f228c

interface UploadedFile {
  file: File;
  id: string;
  progress: number;
}

<<<<<<< HEAD
interface FileUploadProps {
  files: UploadedFile[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onEditImage?: (id: string) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];

function getFileIcon(type: string): string {
  if (type === "application/pdf") return "📄";
  if (type.startsWith("image/")) return "🖼️";
  if (type.includes("wordprocessingml")) return "📝";
  return "📎";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({ files, onFilesAdded, onRemoveFile, onEditImage }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const validFiles: File[] = [];
      const fileArray = Array.from(fileList);
      for (const file of fileArray) {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext)) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) onFilesAdded(validFiles);
      if (validFiles.length < fileArray.length) {
        alert(`${fileArray.length - validFiles.length} file(s) were skipped — only PDF, JPG, PNG, and DOCX are supported.`);
      }
    },
    [onFilesAdded]
  );

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files); }, [handleFiles]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 ${
          isDragging ? "border-[#4F46E5] bg-[#4F46E5]/[0.02]" : "border-[#E5E7EB] hover:border-[#6B7280]"
        } ${files.length === 0 ? "py-16" : "py-10"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDragging ? "bg-[#4F46E5]/10" : "bg-[#F9FAFB] border border-[#E5E7EB]"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDragging ? "#4F46E5" : "#6B7280"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#111827]">{isDragging ? "Drop your files here" : "Drop files here or click to browse"}</p>
            <p className="text-xs text-[#6B7280] mt-1">PDF, JPG, PNG, DOCX — up to 50MB each</p>
=======
interface Props {
  files: UploadedFile[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
}

export default function FileUpload({ files, onFilesAdded, onRemoveFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAdded(acceptedFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 25 * 1024 * 1024, // 25MB
  });

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="w-6 h-6 text-[#EF4444]" />;
    if (type.includes("image")) return <ImageIcon className="w-6 h-6 text-[#22C55E]" />;
    if (type.includes("word")) return <FileText className="w-6 h-6 text-[#4285F4]" />;
    return <File className="w-6 h-6 text-[#1A1A1A]/40" />;
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-[40px] p-12 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center space-y-6 group",
          isDragging 
            ? "bg-[#4F46E5]/5 border-[#4F46E5] scale-[1.01]" 
            : "bg-white border-[#E5E7EB] hover:border-[#4F46E5]/30 hover:bg-[#F9FAFB]"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="w-20 h-20 bg-white rounded-[32px] border border-[#E5E7EB] flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
          <UploadCloud className={cn(
            "w-10 h-10 transition-colors",
            isDragging ? "text-[#4F46E5]" : "text-[#1A1A1A]/20 group-hover:text-[#4F46E5]/60"
          )} />
        </div>

        <div className="space-y-1">
          <p className="text-xl font-bold tracking-tight">Drop your files here</p>
          <p className="text-[#1A1A1A]/40 font-medium">Or click to browse from your device</p>
        </div>

        <div className="flex items-center gap-6 pt-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-[#EF4444] rounded-full" /> PDF
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" /> IMAGES
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-[#4285F4] rounded-full" /> DOCX
>>>>>>> 2b61e15460d9697c2dadb6cdab55e095b51f228c
          </div>
        </div>
      </div>

      {/* File List */}
<<<<<<< HEAD
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-[#6B7280] mb-2">
            {files.length} {files.length === 1 ? "file" : "files"} selected
          </div>
          {files.map((uploadFile) => (
            <div key={uploadFile.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E7EB] bg-white">
              <div className="w-9 h-9 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center shrink-0">
                <span className="text-base">{getFileIcon(uploadFile.file.type)}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111827] truncate">{uploadFile.file.name}</p>
                <p className="text-[11px] text-[#6B7280]">{formatFileSize(uploadFile.file.size)}</p>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Edit button (image files only) */}
                {isImage(uploadFile.file.type) && onEditImage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditImage(uploadFile.id); }}
                    className="w-7 h-7 rounded-lg border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F9FAFB] hover:border-[#4F46E5] transition-all group"
                    title="Edit image"
                  >
                    <Pencil className="w-3 h-3 text-[#6B7280] group-hover:text-[#4F46E5]" />
                  </button>
                )}

                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(uploadFile.id); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors group"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-red-500">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
=======
      <AnimatePresence>
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#1A1A1A]/40 px-2 uppercase tracking-widest">Uploaded Files ({files.length})</h3>
            {files.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-[#E5E7EB] rounded-[24px] p-4 flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#F9FAFB] rounded-xl flex items-center justify-center shrink-0">
                    {getFileIcon(file.file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1A1A1A] truncate text-[15px]">{file.file.name}</p>
                    <p className="text-xs text-[#1A1A1A]/40 font-medium mt-0.5">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB • Ready
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[#1A1A1A]/20 hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
>>>>>>> 2b61e15460d9697c2dadb6cdab55e095b51f228c
    </div>
  );
}
