"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  ArrowLeft, 
  Printer, 
  Lock, 
  FileText, 
  AlertCircle,
  Eye,
  CheckCircle2,
  Trash2,
  Loader2,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import AdminSecurityLayer from "@/components/admin/AdminSecurityLayer";
import CountdownTimer from "@/components/admin/CountdownTimer";
import { JobResponse, PrintSettings } from "@/lib/types";

export default function JobDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [job, setJob] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/auth");
    }
  }, [status, router]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${id}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error("This file has been auto-deleted for privacy.");
        throw new Error("Failed to fetch job");
      }
      const data = await res.json();
      setJob(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Logic for printing (printing in browser)
      window.print();
      
      // Notify backend of print
      await fetch(`/api/admin/jobs/${id}/print`, { method: "POST" });
      
      toast.success("Job marked as printed!");
      fetchJob(); // Refresh status
    } catch (err) {
      toast.error("Failed to mark as printed");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this file immediately?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Deleted from server successfully");
        router.push("/admin/dashboard");
      }
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === "loading" || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
      <Loader2 className="w-10 h-10 animate-spin text-[#4F46E5]" />
    </div>
  );

  if (error || !job) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center bg-[#F8F7F4]">
      <div className="w-20 h-20 bg-[#EF4444]/10 rounded-[32px] flex items-center justify-center mb-6">
        <AlertCircle className="text-[#EF4444] w-10 h-10" />
      </div>
      <h2 className="text-3xl font-bold font-syne mb-2">Access Denied</h2>
      <p className="text-[#1A1A1A]/40 font-medium max-w-sm mb-8">{error || "Job not found"}</p>
      <button 
        onClick={() => router.push("/admin/dashboard")}
        className="bg-[#1A1A1A] text-white px-8 py-3 rounded-full font-bold hover:bg-black transition-all"
      >
        Back to Dashboard
      </button>
    </div>
  );

  return (
    <AdminSecurityLayer>
      <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E7EB] px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.push("/admin/dashboard")}
              className="w-10 h-10 bg-[#F9FAFB] border border-[#E5E7EB] rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="space-y-0.5">
              <h1 className="text-lg font-bold font-syne leading-none">Print Job: {job.userId}</h1>
              <p className="text-[11px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">{id}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {job.status === 'opened' && job.openedAt && (
                <div className="px-4 py-2 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
                  <span className="text-sm font-bold">Document Active</span>
                </div>
             )}
             <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-10 h-10 text-[#EF4444] hover:bg-[#EF4444]/5 flex items-center justify-center rounded-full transition-all"
             >
                <Trash2 className="w-5 h-5" />
             </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          {/* Document Preview Area */}
          <section className="flex-1 bg-[#1A1A1A]/5 p-10 overflow-auto flex items-center justify-center">
            <div className="w-full max-w-4xl h-full min-h-[80vh] bg-white rounded-[40px] shadow-2xl overflow-hidden relative border border-[#E5E7EB]">
              {job.isEncrypted ? (
                 <div className="w-full h-full flex flex-col items-center justify-center text-center p-20 space-y-8">
                    <div className="w-24 h-24 bg-[#4F46E5]/10 rounded-[40px] flex items-center justify-center">
                        <Lock className="text-[#4F46E5] w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold font-syne">Encrypted Document</h2>
                        <p className="text-[#1A1A1A]/40 font-medium max-w-md">For privacy, encrypted files cannot be previewed. Please use the Print button below to proceed.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="px-4 py-2 bg-[#4F46E5]/5 text-[#4F46E5] text-[11px] font-bold tracking-widest uppercase rounded-full border border-[#4F46E5]/20">Client-side Encryption Active</div>
                    </div>
                 </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-20 bg-white">
                    <FileText className="w-24 h-24 text-[#1A1A1A]/5 mb-8" />
                    <p className="text-[#1A1A1A]/30 font-bold uppercase tracking-widest">Document Previewer Ready</p>
                    <p className="text-sm text-[#1A1A1A]/20 mt-2">PDF/Image preview will appear here in production.</p>
                    {/* In a real implementation, we'd use react-pdf or an <img> here */}
                    {job.fileUrls?.map((url, i) => (
                      <div key={i} className="mt-8">
                         <p className="text-xs font-bold text-[#4F46E5]">File: {job.fileNames[i]}</p>
                         <iframe src={url} className="w-full h-0 opacity-0" /> {/* Keep hidden for now */}
                      </div>
                    ))}
                </div>
              )}
              
              {/* Blur Overlay in development/security trigger */}
              <div id="print-overlay" className="hidden fixed inset-0 bg-white z-[999] p-20 print:flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold mb-4 font-syne">Processing Job...</h1>
                <p>SmartPrint Security Layer — Initializing Printer Dialog</p>
              </div>
            </div>
          </section>

          {/* Right Sidebar: Settings & Controls */}
          <aside className="w-96 bg-white border-l border-[#E5E7EB] flex flex-col">
            <div className="p-8 border-b border-[#E5E7EB] flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">Privacy Timer</p>
                  <p className="text-sm font-bold">Auto-destruct sequence</p>
               </div>
               {job.openedAt && (
                 <CountdownTimer 
                   totalSeconds={100}
                   initialRemaining={Math.max(0, 100 - Math.floor((Date.now() - new Date(job.openedAt).getTime()) / 1000))}
                   onExpired={() => {
                     toast.error("Time expired. File deleted.");
                     router.push("/admin/dashboard");
                   }} 
                 />
               )}
            </div>

            <div className="flex-1 p-8 overflow-y-auto space-y-8">
               <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#1A1A1A]/40 uppercase tracking-widest">Print Configuration</h3>
                  <div className="grid grid-cols-2 gap-3">
                     {[
                       { label: "Copies", value: job.settings?.copies },
                       { label: "Paper", value: job.settings?.paperSize },
                       { label: "Color", value: job.settings?.colorMode === 'Color' ? 'Full Color' : 'B&W' },
                       { label: "Pages", value: job.settings?.enableAdvancedColor ? 
                          (job.settings?.enableColorRange ? `Color: ${job.settings?.colorPagesRange || 'none'}` : `B&W: ${job.settings?.bwPagesRange || 'none'}`) : 
                          ((job.settings as any)?.allPagesColor ? 'All' : 'Selected') },
                       { label: "Orientation", value: job.settings?.orientation || 'Portrait' },
                       { label: "Layout", value: `${job.settings?.pagesPerSheet || 1} per sheet` }
                     ].map((cfg, i) => (
                       <div key={i} className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB]">
                          <p className="text-[9px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">{cfg.label}</p>
                          <p className="text-xs font-bold text-[#1A1A1A] mt-0.5">{cfg.value || '-'}</p>
                       </div>
                     ))}
                  </div>
               </div>

               {job.isEncrypted && (
                 <div className="p-6 bg-[#4F46E5]/5 rounded-[24px] border border-[#4F46E5]/20 space-y-4">
                    <div className="flex items-center gap-3">
                       <Shield className="w-5 h-5 text-[#4F46E5]" />
                       <span className="font-bold text-sm text-[#4F46E5]">Secure File Protocol</span>
                    </div>
                    <p className="text-xs text-[#1A1A1A]/60 leading-relaxed font-medium">This file is encrypted. You can print it ONCE. After printing, the job will be permanently locked.</p>
                 </div>
               )}
            </div>

            <div className="p-8 bg-white border-t border-[#E5E7EB] space-y-4">
               {job.status === 'printed' && (
                 <div className="flex items-center gap-2 text-[#22C55E] bg-[#22C55E]/5 p-4 rounded-xl border border-[#22C55E]/20 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" /> ALREADY PRINTED
                 </div>
               )}
               
               <button 
                  disabled={isPrinting || job.status === 'printed' || job.status === 'expired'}
                  onClick={handlePrint}
                  className="w-full bg-[#4F46E5] text-white py-5 rounded-[24px] font-bold text-lg hover:bg-[#4338CA] active:scale-[0.98] transition-all shadow-xl shadow-[#4F46E5]/20 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
               >
                  {isPrinting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Printer className="w-5 h-5" /> Start Printing</>}
               </button>
            </div>
          </aside>
        </main>
      </div>
      
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-overlay {
            visibility: visible;
            display: flex;
          }
        }
      `}</style>
    </AdminSecurityLayer>
  );
}

function Shield(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
