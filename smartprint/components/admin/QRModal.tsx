"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, ExternalLink, QrCode } from "lucide-react";
import toast from "react-hot-toast";

interface QRModalProps {
  onClose: () => void;
}

export default function QRModal({ onClose }: QRModalProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [shopId, setShopId] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isIdCopied, setIsIdCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.qrCode) {
          setQrToken(data.qrCode);
          setShopId(data.shopId || "");
          const url = `${window.location.origin}/user?shop=${data.qrCode}`;
          setQrUrl(url);
          QRCode.toDataURL(canvasRef.current!, url, {
            width: 1000,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
        }
      });
  }, []);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(qrUrl);
    setIsCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyIdToClipboard = async () => {
    await navigator.clipboard.writeText(shopId);
    setIsIdCopied(true);
    toast.success("Shop ID copied to clipboard");
    setTimeout(() => setIsIdCopied(false), 2000);
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.download = `smartprint-qr-${shopId || "shop"}.png`;
    link.href = canvasRef.current!.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-[420px] rounded-[32px] overflow-hidden shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="p-6 pb-0 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#111827]">Shop Discovery</h2>
            <p className="text-sm text-secondary mt-1">Ways for customers to connect.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors"><span className="text-2xl">×</span></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Shop ID Section */}
          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">Permanent Shop ID</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/10 rounded-full">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-accent uppercase">Live</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-border">
              <span className="text-2xl font-mono font-bold tracking-[0.2em] text-[#111827] uppercase">{shopId}</span>
              <button 
                onClick={copyIdToClipboard}
                className="p-2 hover:bg-surface rounded-lg transition-all active:scale-90"
              >
                {isIdCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-secondary" />}
              </button>
            </div>
          </div>

          {/* QR Section */}
          <div className="space-y-4">
            <div className="relative group">
              <div className="aspect-square bg-white border-2 border-border rounded-3xl p-4 flex items-center justify-center overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full" />
              </div>
              <button 
                onClick={downloadQR}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white rounded-3xl"
              >
                <Download className="w-8 h-8" />
                <span className="font-medium">Download PNG</span>
              </button>
            </div>

            <div className="space-y-3">
              <button 
                onClick={copyToClipboard}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#111827] text-white rounded-xl font-medium hover:bg-black transition-all active:scale-[0.98]"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isCopied ? "Copied Link" : "Copy Print Link"}
              </button>
              
              <a 
                href={qrUrl} 
                target="_blank" 
                className="w-full h-12 flex items-center justify-center gap-2 bg-surface text-[#111827] border border-border rounded-xl font-medium hover:bg-gray-200 transition-all no-underline"
              >
                <ExternalLink className="w-4 h-4" /> Test Customer Portal
              </a>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-surface border-t border-border flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
             <QrCode className="w-4 h-4" />
           </div>
           <p className="text-[11px] text-secondary leading-tight">
             Customers can either visit the link manually, enter the 6-digit ID, or scan this QR code to start printing.
           </p>
        </div>
      </div>
    </div>
  );
}
