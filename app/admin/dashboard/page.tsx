"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Printer, 
  LogOut, 
  Search, 
  QrCode, 
  LayoutDashboard,
  Clock,
  Shield,
  FileText,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  userId: string;
  isEncrypted: boolean;
  fileCount: number;
  status: "waiting" | "opened" | "printed" | "expired" | "deleted";
  createdAt: string;
  openedAt: string | null;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/auth");
    }
  }, [status, router]);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/admin/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // 5s polling as requested
    return () => clearInterval(interval);
  }, []);

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex">
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="w-72 bg-white border-r border-[#E5E7EB] flex flex-col p-6 fixed h-full">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center text-white">
            <Printer className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold font-syne tracking-tight">SmartPrint</span>
        </div>

        <nav className="flex-1 space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#F9FAFB] text-[#1A1A1A] rounded-2xl font-bold text-sm transition-all border border-[#E5E7EB]">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button 
            onClick={() => setShowQrModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:bg-[#F9FAFB] rounded-2xl font-bold text-sm transition-all"
          >
            <QrCode className="w-5 h-5" /> Shop QR Code
          </button>
        </nav>

        <div className="pt-6 border-t border-[#E5E7EB]">
          <div className="px-4 py-3 mb-4 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB]">
             <p className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest leading-none mb-1">Signed in as</p>
             <p className="text-sm font-bold text-[#1A1A1A] truncate">{session?.user?.name}</p>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 text-[#EF4444] hover:bg-[#EF4444]/5 rounded-2xl font-bold text-sm transition-all"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="flex-1 ml-72 p-10">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold font-syne tracking-tight">Active Jobs</h1>
              <p className="text-[#1A1A1A]/40 font-medium text-sm">Real-time print requests for your shop</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#22C55E] bg-[#22C55E]/5 px-3 py-1.5 rounded-full border border-[#22C55E]/20">
                <RefreshCw className="w-3 h-3 animate-spin" /> LIVE UPDATING
              </div>
            </div>
          </header>

          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#4F46E5]" />
              <p className="text-[#1A1A1A]/40 font-medium">Loading your dashboard...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => router.push(`/admin/jobs/${job.id}`)}
                    className="bg-white border border-[#E5E7EB] rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:border-[#4F46E5]/20 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase border ${
                        job.status === 'waiting' ? 'bg-[#1A1A1A]/5 text-[#1A1A1A]/40 border-transparent' :
                        job.status === 'opened' ? 'bg-[#4F46E5]/5 text-[#4F46E5] border-[#4F46E5]/20' :
                        job.status === 'printed' ? 'bg-[#22C55E]/5 text-[#22C55E] border-[#22C55E]/20' :
                        'bg-[#EF4444]/5 text-[#EF4444] border-[#EF4444]/20'
                      }`}>
                        {job.status}
                      </div>
                      {job.isEncrypted && (
                        <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#4F46E5]/20">
                          <Shield className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">User ID</p>
                        <h3 className="text-2xl font-bold font-syne">{job.userId}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#F9FAFB]">
                        <div>
                          <p className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">Files</p>
                          <p className="font-bold flex items-center gap-1.5 mt-0.5">
                            <FileText className="w-3.5 h-3.5" /> {job.fileCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">Received</p>
                          <p className="font-bold flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }).replace('about ', '')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between text-[#4F46E5] group-hover:translate-x-1 transition-transform">
                      <span className="text-sm font-bold">Open Job</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {jobs.length === 0 && (
                <div className="col-span-full py-32 border-2 border-dashed border-[#E5E7EB] rounded-[40px] flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-white rounded-[32px] border border-[#E5E7EB] flex items-center justify-center shadow-sm">
                    <Printer className="text-[#1A1A1A]/10 w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold">No jobs yet</h3>
                    <p className="text-[#1A1A1A]/40 font-medium">Ready and waiting for customers to send files.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* QR Modal */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[40px] p-12 max-w-sm w-full text-center space-y-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-syne tracking-tight">Shop QR Code</h3>
                <p className="text-[#1A1A1A]/40 font-medium text-sm">Customers scan this to connect</p>
              </div>
              
              <div className="bg-white p-4 rounded-[32px] border border-[#E5E7EB] inline-block shadow-sm">
                 <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/user?shop=${session?.user?.id}`)}`}
                    alt="Shop QR"
                    className="w-56 h-56"
                  />
              </div>

              <div className="space-y-3">
                <button className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">
                  Download PNG
                </button>
                <button onClick={() => setShowQrModal(false)} className="w-full text-[#1A1A1A]/40 font-bold text-sm">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
