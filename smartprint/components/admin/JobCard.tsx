"use client";

import type { JobResponse } from "@/lib/types";

interface JobCardProps {
  job: JobResponse;
  onClick: () => void;
}

function getFileTypeIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (["jpg", "jpeg", "png"].includes(ext || "")) return "🖼️";
  if (ext === "docx") return "📝";
  if (ext === "enc") return "🔐";
  return "📎";
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
      return { label: "Waiting", className: "bg-accent/10 text-accent" };
    case "opened":
      return { label: "Opened", className: "bg-warning/10 text-warning" };
    case "printed":
      return { label: "Printed", className: "bg-success/10 text-success" };
    case "expired":
      return { label: "Expired", className: "bg-secondary/10 text-secondary" };
    default:
      return { label: status, className: "bg-secondary/10 text-secondary" };
  }
}

export default function JobCard({ job, onClick }: JobCardProps) {
  const statusConfig = getStatusConfig(job.status);
  const isActive = job.status === "waiting" || job.status === "opened";

  return (
    <button
      onClick={onClick}
      disabled={!isActive}
      className={`w-full text-left p-5 rounded-2xl border transition-all ${
        isActive
          ? "border-border hover:border-secondary/40 hover:shadow-sm cursor-pointer card-hover"
          : "border-border/60 opacity-50 cursor-not-allowed bg-gray-50/50"
      }`}
    >
      {/* Top row: User ID + Status */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-lg font-semibold tracking-tight">{job.userId}</div>
          <div className="text-xs text-secondary mt-0.5">
            {getTimeSince(job.createdAt)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {job.isEncrypted && (
            <span className="text-xs px-2 py-1 rounded-md bg-foreground/5 text-foreground font-medium">
              🔒 Secure
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* File icons */}
      <div className="flex items-center gap-2 mb-3">
        {job.fileNames.slice(0, 4).map((name, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center"
            title={name}
          >
            <span className="text-sm">{getFileTypeIcon(name)}</span>
          </div>
        ))}
        {job.fileNames.length > 4 && (
          <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-xs text-secondary font-medium">
            +{job.fileNames.length - 4}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary">
          {job.fileCount} {job.fileCount === 1 ? "file" : "files"}
        </span>

        {job.status === "opened" && job.remainingSeconds !== undefined && (
          <span className={`text-xs font-medium ${
            job.remainingSeconds > 60
              ? "text-success"
              : job.remainingSeconds > 30
              ? "text-warning"
              : "text-danger"
          }`}>
            {job.remainingSeconds}s remaining
          </span>
        )}
      </div>
    </button>
  );
}
