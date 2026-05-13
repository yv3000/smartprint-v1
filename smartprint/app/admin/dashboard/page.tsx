"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import JobCard from "@/components/admin/JobCard";
import JobViewer from "@/components/admin/JobViewer";
import QRModal from "@/components/admin/QRModal";
import SecurityShield from "@/components/admin/SecurityShield";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { JobResponse } from "@/lib/types";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobResponse | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shopName, setShopName] = useState("SmartPrint");
  const [appSessionStatus, setAppSessionStatus] = useState<"online" | "offline">("offline");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/auth");
  }, [status, router]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", { credentials: "include" });
      if (res.status === 401) { router.push("/admin/auth"); return; }
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchJobs();
      
      // Also fetch shop name
      fetch("/api/admin/profile")
        .then(res => res.json())
        .then(data => {
          if (data.shopName) setShopName(data.shopName);
        })
        .catch(err => console.error("Error fetching shop name:", err));

      const interval = setInterval(fetchJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchJobs, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const electronWindow = window as Window & { electron?: unknown };
    const isElectronClient =
      typeof window !== "undefined" &&
      (navigator.userAgent.includes("Electron") || Boolean(electronWindow.electron));

    if (!isElectronClient) {
      setAppSessionStatus("offline");
      return;
    }

    let mounted = true;
    const ping = async (state: "online" | "offline" = "online") => {
      try {
        const res = await fetch("/api/admin/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-smartprint-client": "electron",
          },
          body: JSON.stringify({ state }),
          keepalive: state === "offline",
        });
        if (res.ok && mounted) setAppSessionStatus(state);
      } catch {
        if (mounted) setAppSessionStatus("offline");
      }
    };

    ping("online");
    const hb = setInterval(() => ping("online"), 10_000);
    const onUnload = () => {
      ping("offline");
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      mounted = false;
      clearInterval(hb);
      window.removeEventListener("beforeunload", onUnload);
      ping("offline");
    };
  }, [status]);

  const handleJobUpdate = useCallback(() => {
    setSelectedJob(null);
    fetchJobs();
  }, [fetchJobs]);

  const handleClearAll = async () => {
    try {
      const res = await fetch("/api/jobs/clear-all", { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.deleted !== undefined) {
        toast.success(`${data.deleted} job${data.deleted !== 1 ? "s" : ""} cleared`);
      }
      fetchJobs();
    } catch {
      toast.error("Failed to clear jobs");
    }
    setShowClearConfirm(false);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0B0B0F]">
        <div className="animate-spin w-7 h-7 border-2 border-[#E5E7EB] dark:border-white/10 border-t-[#111827] dark:border-t-white rounded-full" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const waitingJobs = jobs.filter(j => j.status === "waiting");
  const openedJobs = jobs.filter(j => j.status === "opened");
  const completedJobs = jobs.filter(j => j.status === "printed" || j.status === "expired");

  return (
    <SecurityShield>
      <div className="min-h-screen bg-white dark:bg-[#0B0B0F] transition-colors">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-[#E5E7EB] dark:border-white/5 transition-colors">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#111827] dark:bg-white flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white dark:text-black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
              </div>
              <span className="text-base font-semibold tracking-tight text-[#111827] dark:text-white">{shopName}</span>
              <span className="text-[10px] text-[#6B7280] dark:text-neutral-400 px-1.5 py-0.5 rounded bg-[#F9FAFB] dark:bg-white/5 border border-[#E5E7EB] dark:border-white/10 ml-1 font-medium">Admin</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ml-1 font-semibold ${
                appSessionStatus === "online"
                  ? "text-[#16A34A] bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-300"
                  : "text-[#DC2626] bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300"
              }`}>
                {appSessionStatus === "online" ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs text-[#6B7280] dark:text-neutral-400 hidden sm:inline cursor-pointer hover:text-[#111827] dark:hover:text-white transition-colors"
                onClick={() => setShowQR(true)}
              >
                {session?.user?.email}
              </span>
              <ThemeToggle size="sm" />
              <button onClick={() => setShowQR(true)} className="w-8 h-8 rounded-lg border border-[#E5E7EB] dark:border-white/10 flex items-center justify-center hover:bg-[#F9FAFB] dark:hover:bg-white/5 transition-colors" title="QR Code">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-[#111827] dark:text-white" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total", value: jobs.length, color: "text-[#111827] dark:text-white" },
              { label: "Waiting", value: waitingJobs.length, color: "text-[#4F46E5] dark:text-indigo-300" },
              { label: "Opened", value: openedJobs.length, color: "text-[#F59E0B] dark:text-amber-300" },
              { label: "Done", value: completedJobs.length, color: "text-[#6B7280] dark:text-neutral-400" },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/5 transition-colors">
                <div className="text-[10px] text-[#6B7280] dark:text-neutral-400 font-medium uppercase tracking-wider">{stat.label}</div>
                <div className={`text-xl font-semibold mt-0.5 ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Header with Clear Completed */}
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#111827] dark:text-white">Print Queue</h2>
              <p className="text-xs text-[#6B7280] dark:text-neutral-400 mt-0.5">Files auto-delete in 100 seconds after opening.</p>
            </div>
            {/* Always show the Clear All button, but disabled if no jobs are ready to clear */}
            {!showClearConfirm ? (
              <button 
                onClick={() => jobs.length > 0 && setShowClearConfirm(true)} 
                disabled={jobs.length === 0}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all border ${
                  jobs.length > 0
                    ? "text-[#6B7280] dark:text-neutral-300 hover:text-[#EF4444] dark:hover:text-red-300 border-[#E5E7EB] dark:border-white/10 hover:border-[#FCA5A5] dark:hover:border-red-500/30 cursor-pointer"
                    : "text-gray-300 dark:text-neutral-600 border-gray-100 dark:border-white/5 cursor-not-allowed"
                }`}
              >
                Clear All
              </button>
            ) : (
              <div className="flex items-center gap-2 p-1.5 bg-red-50 dark:bg-red-500/10 border border-[#FCA5A5] dark:border-red-500/30 rounded-lg animate-in fade-in zoom-in duration-200">
                <span className="text-[10px] text-[#EF4444] dark:text-red-300 font-bold uppercase tracking-wider ml-1">Delete {jobs.length}?</span>
                <button onClick={() => setShowClearConfirm(false)} className="text-[10px] px-2 py-1 bg-white dark:bg-white/5 border border-[#E5E7EB] dark:border-white/10 rounded font-bold uppercase tracking-widest text-[#6B7280] dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-white/10">No</button>
                <button onClick={handleClearAll} className="text-[10px] px-2 py-1 bg-[#EF4444] text-white rounded font-bold uppercase tracking-widest hover:bg-[#DC2626]">Yes</button>
              </div>
            )}
          </div>

          {/* Jobs grid */}
          {jobs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-xl bg-[#F9FAFB] dark:bg-white/5 border border-[#E5E7EB] dark:border-white/10 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-[#6B7280] dark:text-neutral-400" strokeWidth="1.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              </div>
              <h3 className="text-base font-medium text-[#111827] dark:text-white mb-1">No print jobs yet</h3>
              <p className="text-sm text-[#6B7280] dark:text-neutral-400">Share your QR code to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {jobs.map((job, i) => (
                <div key={job.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}>
                  <JobCard job={job} onClick={() => setSelectedJob(job)} />
                </div>
              ))}
            </div>
          )}
        </main>

        {selectedJob && <JobViewer job={selectedJob} adminSecret="" onClose={() => setSelectedJob(null)} onJobUpdate={handleJobUpdate} />}
        {showQR && <QRModal onClose={() => setShowQR(false)} />}
      </div>
    </SecurityShield>
  );
}
