"use client";

import type { JobResponse } from "@/lib/types";
import { FileText, Image as ImageIcon, Lock, Paperclip, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface JobCardProps {
  job: JobResponse;
  onClick: () => void;
}

function getFileTypeIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="w-4 h-4 text-rose-500" />;
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || ""))
    return <ImageIcon className="w-4 h-4 text-emerald-500" />;
  if (["docx", "doc"].includes(ext || ""))
    return <FileText className="w-4 h-4 text-indigo-500" />;
  if (ext === "enc") return <Lock className="w-4 h-4 text-amber-500" />;
  return <Paperclip className="w-4 h-4 text-neutral-400" />;
}

function getTimeSince(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getStatusConfig(status: string): { label: string; className: string } {
  switch (status) {
    case "waiting":
      return {
        label: "Ready for Pickup",
        className:
          "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
      };
    case "opened":
      return {
        label: "Counting Down",
        className:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      };
    case "printed":
      return {
        label: "Printed",
        className:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      };
    case "expired":
      return {
        label: "Expired",
        className:
          "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border border-neutral-500/20",
      };
    default:
      return {
        label: status,
        className:
          "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border border-neutral-500/20",
      };
  }
}

export default function JobCard({ job, onClick }: JobCardProps) {
  const statusConfig = getStatusConfig(job.status);
  const isActive = job.status === "waiting" || job.status === "opened";

  return (
    <button
      onClick={onClick}
      disabled={!isActive}
      className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 ${
        isActive
          ? "bg-white dark:bg-neutral-900/90 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 hover:shadow-md cursor-pointer active:scale-[0.99]"
          : "border-neutral-200/40 dark:border-neutral-800/40 opacity-40 cursor-not-allowed bg-neutral-50/50 dark:bg-neutral-950/40"
      }`}
    >
      {/* Top row: User ID / Token + Status */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
              {job.userId}
            </span>
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-neutral-400" />
            <span>{getTimeSince(job.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {job.isEncrypted && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              <Lock className="w-3 h-3" />
              <span>AES-256</span>
            </span>
          )}
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* File badges */}
      <div className="flex items-center gap-2 mb-4">
        {job.fileNames.slice(0, 4).map((name, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center shrink-0 shadow-sm"
            title={name}
          >
            {getFileTypeIcon(name)}
          </div>
        ))}
        {job.fileNames.length > 4 && (
          <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
            +{job.fileNames.length - 4}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          {job.fileCount} {job.fileCount === 1 ? "document" : "documents"}
        </span>

        {job.status === "opened" && job.remainingSeconds !== undefined && (
          <span
            className={`text-xs font-semibold font-mono flex items-center gap-1 ${
              job.remainingSeconds > 60
                ? "text-emerald-600 dark:text-emerald-400"
                : job.remainingSeconds > 30
                ? "text-amber-600 dark:text-amber-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>{job.remainingSeconds}s remaining</span>
          </span>
        )}
      </div>
    </button>
  );
}
