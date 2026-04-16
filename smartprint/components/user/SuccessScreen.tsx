"use client";

import { useState } from "react";
import { Trash2, CheckCircle2, AlertCircle } from "lucide-react";

interface SuccessScreenProps {
  userId: string;
  jobId: string;
  userToken?: string;
  isEncrypted: boolean;
}

export default function SuccessScreen({ userId, jobId, userToken, isEncrypted }: SuccessScreenProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDelete = async () => {
    if (!userToken) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}?userToken=${encodeURIComponent(userToken)}`, { method: "DELETE" });
      if (res.ok) {
        setIsDeleted(true);
        setShowDeleteConfirm(false);
      }
    } catch {
      // silent fail
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto text-center py-10 animate-fade-in">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center mx-auto mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-[#111827] mb-2">Files sent successfully!</h1>
      <p className="text-sm text-[#6B7280] mb-8">Tell the shop owner your Print ID to start printing.</p>

      {/* Print ID */}
      <div className="p-6 rounded-xl border border-[#E5E7EB] bg-white mb-6 shadow-sm">
        <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Your Print ID</div>
        <div className="text-[48px] font-bold tracking-wider text-[#111827] font-mono leading-none">{userId}</div>
      </div>

      {/* Info cards */}
      <div className="space-y-2 text-left mb-8">
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[#E5E7EB] bg-white">
          <span className="text-base mt-0.5">⏱️</span>
          <div>
            <p className="text-sm font-medium text-[#111827]">Auto-deletes in 1 hour</p>
            <p className="text-xs text-[#6B7280] mt-0.5">Files are automatically deleted 1 hour after sending.</p>
          </div>
        </div>

        {isEncrypted && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[#4F46E5]/20 bg-[#4F46E5]/[0.02]">
            <span className="text-base mt-0.5">🔒</span>
            <div>
              <p className="text-sm font-medium text-[#111827]">End-to-end encrypted</p>
              <p className="text-xs text-[#6B7280] mt-0.5">The shop can print but cannot view your documents.</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button onClick={() => window.location.href = "/"} className="w-full py-3 bg-[#111827] text-white rounded-xl text-sm font-medium hover:bg-black active:scale-[0.99] transition-all">
          Done
        </button>

        {/* Delete button */}
        {userToken && !isDeleted && (
          !showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 border border-[#FCA5A5] text-[#EF4444] rounded-xl text-sm font-medium hover:bg-red-50 transition-all flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete My Files
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-[#FCA5A5] bg-red-50 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                <p className="text-sm font-medium text-[#111827]">Delete files from the print shop?</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]">
                  No, Keep
                </button>
                <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2 bg-[#EF4444] text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                  {isDeleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          )
        )}

        {isDeleted && (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#22C55E]/10 text-[#22C55E] text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Files deleted from the print shop
          </div>
        )}
      </div>
    </div>
  );
}
