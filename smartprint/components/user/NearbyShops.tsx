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
      } catch (err) {
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
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" />
      <p className="text-[#1A1A1A]/40 font-medium">Searching for nearby shops...</p>
    </div>
  );

  if (error && shops.length === 0) return (
    <div className="text-center py-20 px-10">
      <div className="w-16 h-16 bg-[#EF4444]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Navigation className="text-[#EF4444] w-8 h-8" />
      </div>
      <p className="text-[#1A1A1A]/60 font-semibold">{error}</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-xl font-bold px-2">Nearby Printers</h2>
      {shops.map((shop, i) => (
        <motion.div
          key={shop.id || i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-5 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm hover:border-[#4F46E5]/30 hover:shadow-md transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#4F46E5]/10 group-hover:text-[#4F46E5] transition-colors mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-[#4F46E5] transition-colors">{shop.shopName}</h3>
              <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px] sm:max-w-xs">{shop.address}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{shop.distance}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => OnConnect(shop.qrToken)}
            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#4F46E5] group-hover:text-white transition-all shadow-sm"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}
