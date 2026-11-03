"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, QrCode, LogOut, Printer, X } from "lucide-react";
import toast from "react-hot-toast";
import { signOut } from "next-auth/react";

interface QRModalProps {
  onClose: () => void;
}

export default function QRModal({ onClose }: QRModalProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [isIdCopied, setIsIdCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then(async (data) => {
        if (data.qrCode) {
          setShopId(data.shopId || "");
          setShopName(data.shopName || "Your Shop");
          const url = `${window.location.origin}/user?shop=${data.qrCode}`;
          setQrUrl(url);
          
          const dataUrl = await QRCode.toDataURL(url, {
            width: 800,
            margin: 2,
            errorCorrectionLevel: 'H'
          });
          setQrDataUrl(dataUrl);
        }
      });
  }, []);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(qrUrl);
    toast.success("Link copied to clipboard");
  };

  const copyIdToClipboard = async () => {
    await navigator.clipboard.writeText(shopId);
    setIsIdCopied(true);
    toast.success("Shop ID copied to clipboard");
    setTimeout(() => setIsIdCopied(false), 2000);
  };

  const downloadQR = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const qrSize = 1000;
    const padding = 100;
    const textSpace = 250;

    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + padding + textSpace;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate QR code onto temporary canvas
    const tempCanvas = document.createElement('canvas');
    await QRCode.toCanvas(tempCanvas, qrUrl, {
      width: qrSize,
      margin: 0,
      errorCorrectionLevel: 'H'
    });

    // Draw QR
    ctx.drawImage(tempCanvas, padding, padding);

    // Draw Shop ID
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SHOP ID: ${shopId.toUpperCase()}`, canvas.width / 2, canvas.height - 120);

    // Draw Brand
    ctx.font = '50px sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Powered by SmartPrint Protocol', canvas.width / 2, canvas.height - 50);

    const link = document.createElement("a");
    link.download = `smartprint-qr-${shopId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success("High-res Counter QR saved to Downloads!");
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/admin/auth" });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="bg-white dark:bg-[#121217] text-neutral-900 dark:text-neutral-100 border border-neutral-200/80 dark:border-neutral-800 w-full max-w-[420px] max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-neutral-100 dark:border-neutral-850">
          <div>
            <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
              {shopName}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Counter Access & Customer Pairing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Shop ID Section */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                6-Digit Shop Identifier
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold uppercase">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white dark:bg-neutral-850 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-750 shadow-xs">
              <span className="text-xl font-mono font-bold tracking-[0.2em] text-neutral-900 dark:text-white uppercase">
                {shopId}
              </span>
              <button
                onClick={copyIdToClipboard}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all active:scale-90 text-neutral-600 dark:text-neutral-300"
                title="Copy Shop ID"
              >
                {isIdCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="space-y-4">
            <div className="relative group">
              <div className="aspect-square bg-white border border-neutral-200 dark:border-neutral-800 rounded-3xl p-10 flex items-center justify-center overflow-hidden shadow-sm">
                {qrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={qrDataUrl} 
                    alt="Counter QR Code" 
                    className="w-full h-full object-contain pointer-events-none" 
                  />
                ) : (
                  <div className="w-full h-full animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-2xl" />
                )}
              </div>
              <button
                onClick={downloadQR}
                className="absolute inset-0 bg-neutral-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white rounded-3xl backdrop-blur-xs font-semibold text-xs"
              >
                <Download className="w-6 h-6" />
                <span>Save High-Res PNG</span>
              </button>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={downloadQR}
                className="flex-[2] h-11 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee QR</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-850 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <QrCode className="w-3.5 h-3.5" />
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
            Place this counter standee at your front desk for zero-install customer printing.
          </p>
        </div>
      </div>
    </div>
  );
}
