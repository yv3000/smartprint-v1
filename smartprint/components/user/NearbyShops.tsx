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
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/shops/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          if (!res.ok) throw new Error("Failed to fetch shops");
          const data = await res.json();
          setShops(data);
        } catch (err) {
          setError("Could not find nearby shops.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Please allow location access to find shops.");
        setLoading(false);
      }
    );
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" />
      <p className="text-[#1A1A1A]/40 font-medium">Searching for nearby shops...</p>
    </div>
  );

  if (error) return (
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
          key={shop.qrToken}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white/70 backdrop-blur-md border border-white/50 rounded-[24px] p-6 flex items-center justify-between group hover:border-[#4F46E5]/30 transition-all shadow-sm"
        >
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-[#4F46E5]/10 rounded-xl flex items-center justify-center text-[#4F46E5] shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A]">{shop.shopName}</h3>
              <p className="text-xs text-[#1A1A1A]/40 font-medium mt-0.5">{shop.distance} km away</p>
              <p className="text-xs text-[#1A1A1A]/30 line-clamp-1 mt-1">{shop.address}</p>
            </div>
          </div>
          <button 
            onClick={() => OnConnect(shop.qrToken)}
            className="w-10 h-10 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center group-hover:bg-[#4F46E5] transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      ))}
      {shops.length === 0 && (
        <p className="text-center text-[#1A1A1A]/30 py-10 font-medium">No shops found in your area.</p>
      )}
    </div>
  );
}
