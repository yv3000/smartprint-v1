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
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800 rounded-full p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex items-center justify-between gap-1 transition-colors">
        <button
          onClick={() => onTabChange("scan")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] ${
            activeTab === "scan"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-md"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Scan Counter QR</span>
        </button>

        <button
          onClick={() => onTabChange("recent")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] ${
            activeTab === "recent"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-md"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Recent Shops</span>
        </button>
      </div>
    </div>
  );
}
