"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, MapPin, X, LocateFixed, Eye } from "lucide-react";

interface Shop {
  shopName: string;
  qrCode: string;
  latitude: number;
  longitude: number;
  isOnline?: boolean;
  address?: string;
  distance?: string;
  distanceKm?: number;
}

interface NearbyMapProps {
  userLat: number;
  userLng: number;
  shops: Shop[];
  onClose: () => void;
}

export default function NearbyMap({ userLat: initialLat, userLng: initialLng, shops: initialShops, onClose }: NearbyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  
  const [currentPos, setCurrentPos] = useState({ lat: initialLat, lng: initialLng });
  const [shops, setShops] = useState(initialShops);
  const [highlightedShop, setHighlightedShop] = useState<string | null>(null);

  // Function to refresh nearby shops based on new position
  const refreshShops = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/shops/nearby?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      setShops(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to refresh shops:", err);
    }
  }, []);

  // Track user position
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPos({ lat: latitude, lng: longitude });
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        }
        refreshShops(latitude, longitude);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [refreshShops]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([initialLat, initialLng], 16);
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // User Marker
    userMarkerRef.current = L.circleMarker([initialLat, initialLng], {
      radius: 8,
      fillColor: "#4F46E5",
      color: "#fff",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  // Update shop markers when shops list changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove markers not in the new list
    Object.keys(markersRef.current).forEach(id => {
      if (!shops.find(s => s.qrCode === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add/Update markers
    shops.forEach(shop => {
      if (!markersRef.current[shop.qrCode]) {
        const markerColor = shop.isOnline ? "#22C55E" : "#EF4444";
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 12px ${shop.isOnline ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)"};"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([shop.latitude, shop.longitude], { icon }).addTo(map);
        
        const popup = L.popup({ closeButton: false, offset: [0, -5] }).setContent(`
          <div class="p-1">
            <div class="font-bold text-xs">${shop.shopName}</div>
            <div class="text-[9px] text-gray-500 mb-2">${shop.distance}</div>
            <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}', '_blank')" class="w-full bg-[#4F46E5] text-white text-[9px] font-bold py-1 px-3 rounded flex items-center justify-center gap-1">
              Direction
            </button>
          </div>
        `);
        
        marker.bindPopup(popup);
        markersRef.current[shop.qrCode] = marker;
      }
    });
  }, [shops]);

  const handleLocateMe = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([currentPos.lat, currentPos.lng], 17);
    }
  };

  const showInMap = (shop: Shop) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([shop.latitude, shop.longitude], 18);
    setHighlightedShop(shop.qrCode);
    
    // Highlight effect: Open popup
    const marker = markersRef.current[shop.qrCode];
    if (marker) marker.openPopup();

    setTimeout(() => {
      setHighlightedShop(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-[1100px] h-full md:h-[650px] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative animate-scale-up">
        
        {/* Left Side: Map */}
        <div className="flex-1 relative min-h-[300px]">
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {/* Removed Header */}

          <div className="absolute top-28 left-4 z-[9999]">
            <button 
              onClick={handleLocateMe}
              className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:bg-gray-50 transition-all active:scale-95 border border-gray-100 group"
              aria-label="Locate Me"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                <circle cx="12" cy="12" r="3" fill="#4F46E5" fillOpacity="0.2" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </button>
          </div>

          <button 
            onClick={onClose}
            className="md:hidden absolute top-6 right-6 z-[110] w-10 h-10 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Right Side: List/Sidebar */}
        <div className="w-full md:w-[380px] bg-gray-50 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-white hidden md:flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-[#111827]">Found {shops.length} Shops</h3>
            <button 
              onClick={onClose}
              className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {shops.length > 0 ? shops.map((shop) => (
              <div 
                key={shop.qrCode} 
                className={`p-4 rounded-3xl transition-all border-2 cursor-pointer ${
                  highlightedShop === shop.qrCode 
                    ? "bg-indigo-50 border-indigo-200 scale-[1.02] shadow-lg" 
                    : "bg-white border-transparent hover:border-gray-200 shadow-sm"
                }`}
                onClick={() => showInMap(shop)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-[#111827] truncate pr-2">{shop.shopName}</h4>
                  <span className={`text-[10px] font-black whitespace-nowrap px-2 py-0.5 rounded-full ${
                    highlightedShop === shop.qrCode
                      ? "text-[#2563EB] bg-blue-50"
                      : shop.isOnline
                        ? "text-[#16A34A] bg-green-50"
                        : "text-[#DC2626] bg-red-50"
                  }`}>
                    {highlightedShop === shop.qrCode ? "CONNECTED" : shop.isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] mb-1">{shop.distance}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
                  {shop.address || "Available for printing nearby."}
                </p>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-[#4F46E5] text-white text-[11px] font-black rounded-xl hover:bg-[#4338CA] transition-all"
                  >
                    <Navigation className="w-3 h-3" /> Direction
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      showInMap(shop);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-white text-gray-700 border border-gray-200 text-[11px] font-black rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <Eye className="w-3 h-3" /> Show Map
                  </button>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-400">No SmartPrinters found within 1km of your current location.</p>
              </div>
            )}
          </div>
          
          {/* Mobile Footer */}
          <div className="p-4 bg-white md:hidden border-t border-gray-100">
             <button onClick={onClose} className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl">Close Map</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .leaflet-popup-content-wrapper { border-radius: 16px; padding: 4px; border: 1px solid #f3f4f6; }
        .leaflet-popup-tip { display: none; }
      `}</style>
    </div>
  );
}
