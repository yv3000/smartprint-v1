"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Printer,
  QrCode,
  Trash2,
  Inbox,
  Clock,
  CheckCircle2,
  Radio,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#0B0B0F]">
        <div className="animate-spin w-8 h-8 border-2 border-neutral-300 dark:border-white/10 border-t-neutral-900 dark:border-t-white rounded-full" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const waitingJobs = jobs.filter(j => j.status === "waiting");
  const openedJobs = jobs.filter(j => j.status === "opened");
  const completedJobs = jobs.filter(j => j.status === "printed" || j.status === "expired");

  return (
    <SecurityShield>
      <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0B0F] text-neutral-900 dark:text-neutral-100 transition-colors">
        {/* Top Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-neutral-200/80 dark:border-white/5 transition-colors">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
            {/* Left: Brand + Status */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center shadow-xs">
                <Printer className="w-4 h-4 text-white dark:text-neutral-900" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                  {shopName}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 font-bold uppercase tracking-wider">
                  Terminal
                </span>
              </div>

              {/* Status Pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold transition-all ${
                  appSessionStatus === "online"
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                    : "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    appSessionStatus === "online"
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                <span>{appSessionStatus === "online" ? "Hardware Sync" : "Web Mode"}</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5">
              <span
                className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors font-medium px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-850"
                onClick={() => setShowQR(true)}
              >
                {session?.user?.email}
              </span>

              <ThemeToggle size="sm" />

              <button
                onClick={() => setShowQR(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold transition-all active:scale-95 shadow-xs"
                title="Counter QR & Shop ID"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Counter QR</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {[
              {
                label: "All Jobs",
                value: jobs.length,
                icon: FileText,
                accent: "text-neutral-900 dark:text-white",
                bg: "bg-neutral-500/10",
              },
              {
                label: "Awaiting Pickup",
                value: waitingJobs.length,
                icon: Radio,
                accent: "text-indigo-600 dark:text-indigo-400",
                bg: "bg-indigo-500/10",
              },
              {
                label: "Processing",
                value: openedJobs.length,
                icon: Clock,
                accent: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                label: "Completed",
                value: completedJobs.length,
                icon: CheckCircle2,
                accent: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-500/10",
              },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-neutral-900/60 shadow-xs transition-all hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${stat.accent}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold font-mono tracking-tight ${stat.accent}`}>
                    {stat.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Queue Header & Actions */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-neutral-200/80 dark:border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                  Active Dispatch Queue
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono font-semibold">
                  {jobs.length}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Ephemeral print queue · 100-second self-destruct cycle upon access
              </p>
            </div>

            {/* Clear All Trigger */}
            {!showClearConfirm ? (
              <button 
                onClick={() => jobs.length > 0 && setShowClearConfirm(true)} 
                disabled={jobs.length === 0}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border ${
                  jobs.length > 0
                    ? "text-neutral-600 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 border-neutral-200 dark:border-neutral-800 hover:border-rose-300 dark:hover:border-rose-500/30 bg-white dark:bg-neutral-900 active:scale-95 cursor-pointer shadow-xs"
                    : "text-neutral-400 dark:text-neutral-600 border-neutral-200/60 dark:border-neutral-800/60 bg-transparent cursor-not-allowed"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 p-1.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl animate-in fade-in duration-200">
                <span className="text-[11px] text-rose-600 dark:text-rose-300 font-bold px-1">
                  Purge {jobs.length} jobs?
                </span>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-xs px-2.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs px-2.5 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700"
                >
                  Confirm
                </button>
              </div>
            )}
          </div>

          {/* Jobs Grid */}
          {jobs.length === 0 ? (
            <div className="py-20 text-center rounded-3xl border border-dashed border-neutral-300/80 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/20">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Queue is clear
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-5">
                Customers can upload documents by scanning your counter QR code or entering your shop ID.
              </p>
              <button
                onClick={() => setShowQR(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                <span>Show Counter QR</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {jobs.map((job, i) => (
                <div
                  key={job.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: "backwards" }}
                >
                  <JobCard job={job} onClick={() => setSelectedJob(job)} />
                </div>
              ))}
            </div>
          )}
        </main>

        {selectedJob && (
          <JobViewer
            job={selectedJob}
            adminSecret=""
            onClose={() => setSelectedJob(null)}
            onJobUpdate={handleJobUpdate}
          />
        )}

        {showQR && <QRModal onClose={() => setShowQR(false)} />}
      </div>
    </SecurityShield>
  );
}
