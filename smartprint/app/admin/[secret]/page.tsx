"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import JobCard from "@/components/admin/JobCard";
import JobViewer from "@/components/admin/JobViewer";
import QRModal from "@/components/admin/QRModal";
import SecurityShield from "@/components/admin/SecurityShield";
import type { JobResponse } from "@/lib/types";

export default function AdminDashboard() {
  const params = useParams();
  const secret = params.secret as string;

  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobResponse | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Fetch jobs from API
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", {
        headers: { "x-admin-secret": secret },
      });

      if (res.status === 401) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
      const data = await res.json();
      setJobs(data);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [secret]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Handle job printed / expired
  const handleJobUpdate = useCallback(() => {
    setSelectedJob(null);
    fetchJobs();
  }, [fetchJobs]);

  // Unauthorized view
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-secondary">Invalid admin secret path.</p>
        </div>
      </div>
    );
  }

  // Loading view
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full" />
      </div>
    );
  }

  const waitingJobs = jobs.filter((j) => j.status === "waiting");
  const openedJobs = jobs.filter((j) => j.status === "opened");
  const completedJobs = jobs.filter((j) => j.status === "printed" || j.status === "expired");

  return (
    <SecurityShield>
      <div className="min-h-screen bg-white">
        {/* ── Navbar ──────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </div>
              <span className="text-[17px] font-semibold tracking-tight">SmartPrint</span>
              <span className="text-xs text-secondary px-2 py-0.5 rounded-md bg-surface border border-border ml-1">Admin</span>
            </div>

            <button
              onClick={() => setShowQR(true)}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-surface transition-colors"
              title="Show QR Code"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="3" height="3" />
                <rect x="19" y="14" width="2" height="2" />
                <rect x="14" y="19" width="2" height="2" />
                <rect x="19" y="19" width="2" height="2" />
              </svg>
            </button>
          </div>
        </nav>

        {/* ── Dashboard Content ───────────────────────────────── */}
        <main className="max-w-[1200px] mx-auto px-6 py-8">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Jobs", value: jobs.length, color: "text-foreground" },
              { label: "Waiting", value: waitingJobs.length, color: "text-accent" },
              { label: "Opened", value: openedJobs.length, color: "text-warning" },
              { label: "Completed", value: completedJobs.length, color: "text-secondary" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl border border-border">
                <div className="text-xs text-secondary font-medium mb-1">{stat.label}</div>
                <div className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Job list */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Print Queue</h2>
            <p className="text-sm text-secondary">
              Click a job to view and print. Files auto-delete in 100 seconds after opening.
            </p>
          </div>

          {jobs.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No print jobs yet</h3>
              <p className="text-sm text-secondary">
                Jobs will appear here when customers send files. Share your QR code to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job, i) => (
                <div key={job.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}>
                  <JobCard
                    job={job}
                    onClick={() => setSelectedJob(job)}
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ── Job Viewer Modal ────────────────────────────────── */}
        {selectedJob && (
          <JobViewer
            job={selectedJob}
            adminSecret={secret}
            onClose={() => setSelectedJob(null)}
            onJobUpdate={handleJobUpdate}
          />
        )}

        {/* ── QR Code Modal ───────────────────────────────────── */}
        {showQR && (
          <QRModal onClose={() => setShowQR(false)} />
        )}
      </div>
    </SecurityShield>
  );
}
