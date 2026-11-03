"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Shop {
  id: string;
  shopName: string;
  qrToken: string;
  address: string;
  distance: string;
}

export default function NearbyShops({ OnConnect }: { OnConnect: (token: string) => void }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchShops = async (lat: number, lng: number) => {
      try {
        const res = await fetch(`/api/shops/nearby?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error("Failed to fetch shops");
        const data = await res.json();
        setShops(Array.isArray(data) ? data : []);
      } catch {
        setError("Could not find nearby shops.");
      } finally {
        setLoading(false);
      }
    };

    let resolved = false;
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        fetchShops(19.19908, 72.86681);
      }
    }, 3500);

    if (!navigator.geolocation) {
      clearTimeout(fallbackTimer);
      fetchShops(19.19908, 72.86681);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimer);
          fetchShops(pos.coords.latitude, pos.coords.longitude);
        }
      },
      () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimer);
          fetchShops(19.19908, 72.86681);
        }
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
    );
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
      <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
        Scanning Local Print Stations...
      </p>
    </div>
  );

  if (error && shops.length === 0) return (
    <div className="text-center py-16 px-6">
      <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Navigation className="text-rose-500 w-7 h-7" />
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">{error}</p>
    </div>
  );

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
          Nearby SmartPrint Terminals
        </h2>
        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
          GPS Radar
        </span>
      </div>

      <div className="space-y-2.5">
        {shops.map((shop, i) => (
          <motion.div
            key={shop.id || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl flex items-center justify-between shadow-xs hover:border-indigo-500/40 hover:shadow-sm transition-all group cursor-pointer"
            onClick={() => OnConnect(shop.qrToken)}
          >
            <div className="flex items-start gap-3.5 min-w-0 pr-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mt-0.5 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {shop.shopName}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {shop.address}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                    {shop.distance}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                OnConnect(shop.qrToken);
              }}
              className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs shrink-0"
              title="Connect to Terminal"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
