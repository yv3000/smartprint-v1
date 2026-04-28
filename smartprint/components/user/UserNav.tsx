"use client";

import { QrCode, Clock } from "lucide-react";

export type UserTab = "scan" | "recent" | "upload";

interface UserNavProps {
  activeTab: UserTab;
  onTabChange: (tab: UserTab) => void;
}

export default function UserNav({ activeTab, onTabChange }: UserNavProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-md">
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-full p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] flex items-center justify-between gap-1">
        <button
          onClick={() => onTabChange("scan")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold transition-all duration-300 ${
            activeTab === "scan" ? "bg-[#1A1A1A] text-white shadow-lg" : "text-[#1A1A1A]/40 hover:bg-[#1A1A1A]/5"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Scan QR</span>
        </button>

        <button
          onClick={() => onTabChange("recent")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold transition-all duration-300 ${
            activeTab === "recent" ? "bg-[#1A1A1A] text-white shadow-lg" : "text-[#1A1A1A]/40 hover:bg-[#1A1A1A]/5"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Recent</span>
        </button>
      </div>
    </div>
  );
}
