"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Clock, ArrowRight, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface RecentShop {
  shopName: string;
  qrToken: string;
  lastVisited: string;
}

export default function RecentShops({ OnConnect }: { OnConnect: (token: string) => void }) {
  const [recent, setRecent] = useState<RecentShop[]>([]);

  useEffect(() => {
    const cookie = Cookies.get("sp_recent");
    if (cookie) {
      try {
        setRecent(JSON.parse(cookie));
      } catch {
        setRecent([]);
      }
    }
  }, []);

  const clearRecent = () => {
    Cookies.remove("sp_recent");
    setRecent([]);
  };

  if (recent.length === 0) return (
    <div className="text-center py-16 px-6">
      <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-neutral-400">
        <Clock className="w-7 h-7" />
      </div>
      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest">No History</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Recently visited print shops will appear here for 1-click re-connection.</p>
    </div>
  );

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">Recent Stations</h2>
        <button 
          onClick={clearRecent}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
      
      <AnimatePresence>
        {recent.map((shop, i) => (
          <motion.div
            key={shop.qrToken}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-indigo-500/40 transition-all group"
          >
            <div className="flex items-center gap-3.5 pr-3 min-w-0">
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{shop.shopName}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  Visited {formatDistanceToNow(new Date(shop.lastVisited))} ago
                </p>
              </div>
            </div>
            <button 
              onClick={() => OnConnect(shop.qrToken)}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 shadow-xs"
            >
              Connect
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
