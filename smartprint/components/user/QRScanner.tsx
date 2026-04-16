"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { X, Camera, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function QRScanner({ onScan, onClose }: { onScan: (data: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const url = result.data;
        if (url.includes("/user?shop=")) {
          const token = new URL(url).searchParams.get("shop");
          if (token) {
            onScan(token);
            scanner.stop();
            scanner.destroy();
          }
        } else {
          toast.error("Not a SmartPrint QR code", { id: "qr-error" });
        }
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );

    scanner.start().catch((err) => {
      console.error(err);
      setHasCamera(false);
    });

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      {!hasCamera ? (
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-[#EF4444]/10 rounded-[32px] flex items-center justify-center mx-auto">
            <AlertCircle className="text-[#EF4444] w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">Camera Access Denied</h3>
            <p className="text-white/40 text-[15px]">We need camera access to scan your shop's QR code. Please check your browser settings.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold active:scale-[0.98] transition-all"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm aspect-square relative rounded-[40px] overflow-hidden border-4 border-white/20">
          <video ref={videoRef} className="w-full h-full object-cover" />
          <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none">
            <div className="w-full h-full border-2 border-[#4F46E5] rounded-[24px] relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-xl" />
              
              {/* Animation Line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[#4F46E5] shadow-[0_0_15px_#4F46E5] animate-scan-line" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-10 text-center">
            <p className="text-white font-bold tracking-tight">Scan the display at counter</p>
          </div>
        </div>
      )}
    </div>
  );
}
