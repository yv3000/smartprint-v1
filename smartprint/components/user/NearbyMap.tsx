"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, Navigation, MapPin, X } from "lucide-react";

interface Shop {
  shopName: string;
  qrCode: string;
  latitude: number;
  longitude: number;
  address?: string;
  distance?: string;
}

interface NearbyMapProps {
  userLat: number;
  userLng: number;
  shops: Shop[];
  onClose: () => void;
}

export default function NearbyMap({ userLat, userLng, shops, onClose }: NearbyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([userLat, userLng], 15);
    mapRef.current = map;

    // Add Tile Layer (Sleek light theme)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Custom Red Marker Icon for Shops
    const redIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    // Add User Marker (Blue)
    L.circleMarker([userLat, userLng], {
      radius: 6,
      fillColor: "#3b82f6",
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map).bindPopup("You are here");

    // Add Shop Markers
    shops.forEach((shop) => {
      const marker = L.marker([shop.latitude, shop.longitude], { icon: redIcon }).addTo(map);
      
      const popupContent = document.createElement('div');
      popupContent.className = 'p-2 min-w-[180px]';
      popupContent.innerHTML = `
        <div class="font-bold text-sm mb-1">${shop.shopName}</div>
        <div class="text-[10px] text-gray-500 mb-3">${shop.address || 'SmartPrint Shop'}</div>
        <div class="flex gap-2">
          <button id="dir-${shop.qrCode}" class="flex-1 bg-[#4F46E5] text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1">
             Direction
          </button>
          <a href="/user?shop=${shop.qrCode}" class="flex-1 bg-gray-100 text-[#1A1A1A] text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center no-underline">
            Connect
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const dirBtn = document.getElementById(`dir-${shop.qrCode}`);
        if (dirBtn) {
          dirBtn.onclick = () => {
            if (confirm(`Do you want to get directions to ${shop.shopName}?`)) {
              window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${shop.latitude},${shop.longitude}`, '_blank');
            }
          };
        }
      });
    });

    return () => {
      map.remove();
    };
  }, [userLat, userLng, shops]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-[800px] rounded-[32px] overflow-hidden shadow-2xl border border-white/20 relative animate-scale-up">
        {/* Header */}
        <div className="absolute top-6 left-6 right-6 z-[110] flex items-center justify-between pointer-events-none">
          <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-lg border border-border flex items-center gap-2 pointer-events-auto">
            <MapPin className="w-4 h-4 text-[#ef4444]" />
            <span className="text-sm font-bold text-[#111827]">Nearby SmartPrinters</span>
            <span className="text-[10px] font-medium text-secondary bg-surface px-2 py-0.5 rounded-full ml-1">Within 1km</span>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg hover:bg-white transition-all active:scale-95 border border-border pointer-events-auto"
          >
            <X className="w-5 h-5 text-[#111827]" />
          </button>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-[500px] bg-surface" />

        {/* Bottom List (Optional) */}
        <div className="absolute bottom-6 left-6 right-6 z-[110] flex gap-3 overflow-x-auto pb-2 scrollbar-hide pointer-events-none">
          {shops.map((shop, i) => (
            <div 
              key={i} 
              className="shrink-0 bg-white/90 backdrop-blur p-3 rounded-2xl shadow-xl border border-border min-w-[200px] flex flex-col pointer-events-auto cursor-pointer hover:bg-white transition-colors"
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.setView([shop.latitude, shop.longitude], 17);
                }
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#111827] truncate">{shop.shopName}</span>
                <span className="text-[10px] font-bold text-[#ef4444]">{shop.distance}</span>
              </div>
              <p className="text-[10px] text-secondary truncate mb-2">{shop.address || 'Near your location'}</p>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${shop.latitude},${shop.longitude}`, '_blank');
                  }}
                  className="flex-1 bg-[#4F46E5] text-white text-[10px] font-bold py-1.5 rounded-xl flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3 h-3" /> Direction
                </button>
                <a 
                  href={`/user?shop=${shop.qrCode}`}
                  className="flex-1 bg-white border border-border text-[#1A1A1A] text-[10px] font-bold py-1.5 rounded-xl flex items-center justify-center no-underline"
                >
                  Connect
                </a>
              </div>
            </div>
          ))}
          {shops.length === 0 && (
            <div className="mx-auto bg-white/90 backdrop-blur px-6 py-3 rounded-2xl shadow-xl border border-border text-xs font-medium text-secondary italic">
              No shops found within 1km. Try moving to a different location.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
