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
      } catch (err) {
        setRecent([]);
      }
    }
  }, []);

  const clearRecent = () => {
    Cookies.remove("sp_recent");
    setRecent([]);
  };

  if (recent.length === 0) return (
    <div className="text-center py-20 px-10">
      <div className="w-16 h-16 bg-[#1A1A1A]/5 rounded-full flex items-center justify-center mx-auto mb-6">
        <Clock className="text-[#1A1A1A]/20 w-8 h-8" />
      </div>
      <p className="text-[#1A1A1A]/40 font-semibold uppercase tracking-widest text-[11px]">No Recent History</p>
      <p className="text-[#1A1A1A]/30 text-xs mt-2">Shops you visit will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold">Recent Visits</h2>
        <button 
          onClick={clearRecent}
          className="text-xs font-semibold text-[#EF4444] hover:opacity-70 transition-opacity flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>
      
      <AnimatePresence>
        {recent.map((shop, i) => (
          <motion.div
            key={shop.qrToken}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white/70 backdrop-blur-md border border-white/50 rounded-[24px] p-6 flex items-center justify-between group hover:border-[#4F46E5]/30 transition-all shadow-sm"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-[#1A1A1A]/5 rounded-xl flex items-center justify-center text-[#1A1A1A]/40 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#1A1A1A]">{shop.shopName}</h3>
                <p className="text-xs text-[#1A1A1A]/40 font-medium mt-0.5">
                  Last visited {formatDistanceToNow(new Date(shop.lastVisited))} ago
                </p>
              </div>
            </div>
            <button 
              onClick={() => OnConnect(shop.qrToken)}
              className="w-full sm:w-auto px-6 py-2.5 bg-white border border-[#E5E7EB] text-[#1A1A1A] rounded-full text-sm font-bold hover:bg-[#F9FAFB] active:scale-[0.98] transition-all"
            >
              Print Here
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
