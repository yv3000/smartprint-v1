"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, QrCode, LogOut, Printer } from "lucide-react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null); // For download logic

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
    if (!canvasRef.current) return;

    // Create a new canvas for high-quality print
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
    ctx.fillText('Powered by SmartPrint', canvas.width / 2, canvas.height - 50);

    const link = document.createElement("a");
    link.download = `smartprint-qr-${shopId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success("QR Code & Shop ID downloaded to your Downloads folder!");
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/admin/auth" });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="bg-white w-full max-w-[420px] max-h-[90vh] flex flex-col rounded-[32px] overflow-hidden shadow-2xl animate-scale-up">
        {/* Header - Fixed */}
        <div className="p-6 pb-4 flex justify-between items-start border-b border-border bg-white z-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#111827]">{shopName}</h2>
            <p className="text-xs text-secondary mt-0.5">SmartPrint Secure Access</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors text-secondary hover:text-black">
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-5 custom-scrollbar">
          {/* Shop ID Section */}
          <div className="p-4 rounded-2xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Permanent Shop ID</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/10 rounded-full">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-accent uppercase">Live</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-border">
              <span className="text-xl font-mono font-bold tracking-[0.2em] text-[#111827] uppercase">{shopId}</span>
              <button
                onClick={copyIdToClipboard}
                className="p-1.5 hover:bg-surface rounded-lg transition-all active:scale-90"
              >
                {isIdCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-secondary" />}
              </button>
            </div>
          </div>

          {/* QR Section */}
          <div className="space-y-4">
            <div className="relative group">
              {/* White square box with large padding (p-16) to ensure QR is small and centered like reference */}
              <div className="aspect-square bg-white border border-gray-100 rounded-[40px] p-16 flex items-center justify-center overflow-hidden shadow-sm">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="QR Code" 
                    className="w-full h-full object-contain pointer-events-none" 
                  />
                ) : (
                  <div className="w-full h-full animate-pulse bg-gray-50 rounded-2xl" />
                )}
              </div>
              <button
                onClick={downloadQR}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white rounded-[40px] backdrop-blur-[2px]"
              >
                <Download className="w-8 h-8" />
                <span className="font-medium text-sm">Download PNG</span>
              </button>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={downloadQR}
                className="flex-[2] h-12 flex items-center justify-center gap-2 bg-[#4F46E5] text-white rounded-xl font-bold text-sm hover:bg-[#4338CA] transition-all active:scale-[0.98] shadow-md shadow-indigo-100"
              >
                <Printer className="w-4 h-4" />
                Print Shop QR
              </button>

              <button
                onClick={handleLogout}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all active:scale-[0.98]"
              >
                <LogOut className="w-3.5 h-3.5" /> Out
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-6 py-3.5 bg-surface border-t border-border flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
            <QrCode className="w-3.5 h-3.5" />
          </div>
          <p className="text-[10px] text-secondary leading-tight">
            Customers can scan this QR code or enter the 6-digit ID at any SmartPrint station.
          </p>
        </div>
      </div>
    </div>
  );
}
