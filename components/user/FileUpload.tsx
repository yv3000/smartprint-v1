"use client";

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
          </div>
        </div>
      </div>

      {/* File List */}
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
    </div>
  );
}
