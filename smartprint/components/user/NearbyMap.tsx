"use client";

import { useEffect, useState } from "react";

interface Shop {
  shopName: string;
  qrCode: string;
  latitude: number;
  longitude: number;
  address?: string;
  distance?: number;
}

interface NearbyMapProps {
  userLat: number;
  userLng: number;
  shops: Shop[];
  onClose: () => void;
}

export default function NearbyMap({ userLat, userLng, shops, onClose }: NearbyMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-[400px] w-full bg-surface animate-pulse rounded-2xl" />;

  const lat = userLat;
  const lng = userLng;

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-border shadow-md animate-fade-in">
      <iframe
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.05},${lat-0.05},${lng+0.05},${lat+0.05}&layer=mapnik&marker=${lat},${lng}`}
        style={{ width: '100%', height: '400px', border: 'none', borderRadius: '12px' }}
      />
      
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[20] w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
      >
        <span className="text-xl leading-none">×</span>
      </button>

      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-border overflow-x-auto whitespace-nowrap flex gap-3">
        <div className="text-sm font-semibold flex items-center mb-1 shrink-0 px-2">Nearby Shops:</div>
        {shops.map((shop, i) => (
          <div key={i} className="shrink-0 bg-surface rounded-lg p-2 border border-border flex flex-col min-w-[120px]">
            <span className="text-xs font-bold truncate">{shop.shopName}</span>
            <a 
              href={`/user?shop=${shop.qrCode}`}
              className="mt-1 text-center px-2 py-1 bg-[#111827] text-white rounded text-[10px] no-underline"
            >
              Connect
            </a>
          </div>
        ))}
        {shops.length === 0 && <div className="text-xs text-secondary italic flex items-center px-2">None found</div>}
      </div>
    </div>
  );
}
