"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { Loader2, QrCode, Printer, Crop, AlertCircle, MapPin, Clock, ChevronRight, FileText } from "lucide-react";
import type { PrintSettings as PrintSettingsType } from "@/lib/types";
import { DEFAULT_PRINT_SETTINGS } from "@/lib/types";
import FileUpload from "@/components/user/FileUpload";
import PrintSettings from "@/components/user/PrintSettings";
import SuccessScreen from "@/components/user/SuccessScreen";
import QRScanner from "@/components/user/QRScanner";
import ImageEditor from "@/components/user/ImageEditor";

const PDFPreview = dynamic(() => import("@/components/user/PDFPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-20 gap-3">
      <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initializing PDF Engine...</p>
    </div>
  )
});

/* ── Helpers ─────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function UserPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopToken = searchParams.get("shop");

  const [shopName, setShopName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Connection by Shop ID
  const [shopIdInput, setShopIdInput] = useState('');
  const [shopIdError, setShopIdError] = useState('');

  // Discovery tabs
  const [activeTab, setActiveTab] = useState<"none" | "recent">("none");
  const [recentShops, setRecentShops] = useState<any[]>([]);

  // Job flow
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<any[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [settings, setSettings] = useState<PrintSettingsType>(DEFAULT_PRINT_SETTINGS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [showEditor, setShowEditor] = useState(false);

  // Load recent shops
  useEffect(() => {
    const recent = Cookies.get("sp_recent");
    if (recent) setRecentShops(JSON.parse(recent));
  }, []);

  // Verify shop token
  useEffect(() => {
    if (shopToken) {
      setIsVerifying(true);
      fetch(`/api/shops/${shopToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.shopName) {
            setShopName(data.shopName);
            const existing = Cookies.get("sp_recent");
            let recent = existing ? JSON.parse(existing) : [];
            recent = recent.filter((s: any) => s.qrToken !== shopToken);
            recent.unshift({ shopName: data.shopName, qrToken: shopToken, lastVisited: new Date().toISOString() });
            Cookies.set("sp_recent", JSON.stringify(recent.slice(0, 3)), { expires: 90 });
            setRecentShops(recent.slice(0, 3));
          } else {
            setShopName(null);
            toast.error("Invalid Shop QR Code");
          }
        })
        .finally(() => setIsVerifying(false));
    }
  }, [shopToken]);

  const handleScan = (token: string) => {
    setShowQRModal(false);
    router.push(`/user?shop=${token}`);
  };

  const handleShopIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
    setShopIdInput(val);
    setShopIdError('');
  };

  const connectByShopId = async () => {
    if (shopIdInput.length !== 6) {
      setShopIdError('Shop ID must be exactly 6 characters');
      return;
    }
    
    try {
      const res = await fetch(`/api/shops/by-id/${shopIdInput}`);
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setShopIdError('Shop not found. Check the ID and try again.');
        return;
      }
      
      const existing = Cookies.get("sp_recent");
      let recent = existing ? JSON.parse(existing) : [];
      recent = recent.filter((s: any) => s.qrToken !== data.shop.qrCode);
      recent.unshift({ shopName: data.shop.shopName, qrToken: data.shop.qrCode, lastVisited: new Date().toISOString() });
      Cookies.set("sp_recent", JSON.stringify(recent.slice(0, 3)), { expires: 90 });
      setRecentShops(recent.slice(0, 3));
      
      toast.success(`Connected to ${data.shop.shopName}!`);
      router.push(`/user?shop=${data.shop.qrCode}`);
      setShopIdInput('');
    } catch {
      setShopIdError('Connection failed. Please try again.');
    }
  };

  const handleSettingsChange = (newSettings: PrintSettingsType) => {
    const cropEnabledNow = !settings.enableCrop && newSettings.enableCrop;
    setSettings(newSettings);
    // Persist per-file adjustments
    setFiles(prev => prev.map((f, i) => i === selectedFileIndex ? { 
      ...f, 
      adjustments: { ...newSettings } 
    } : f));

    if (cropEnabledNow && files[selectedFileIndex]?.file.type.startsWith("image/")) {
      setShowEditor(true);
    }
  };

  const handleEditorSave = (editedFile: File) => {
    const previewUrl = URL.createObjectURL(editedFile);
    setFiles(prev => prev.map((f, i) => i === selectedFileIndex ? { 
      ...f, 
      file: editedFile, 
      preview: previewUrl 
    } : f));
    setShowEditor(false);
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    if (!shopToken) {
      toast.error("Please connect to a shop first");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const updatedSettings = { ...settings };
      const encryptionKeys: string[] = [];
      const fileInfos: any[] = [];

      // Handle Encryption
      if (isEncrypted) {
        const encryptedFiles = await Promise.all(files.map(async (f) => {
          const key = crypto.getRandomValues(new Uint8Array(32));
          const keyBase64 = btoa(String.fromCharCode(...key));
          encryptionKeys.push(keyBase64);
          
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const cryptoKey = await crypto.subtle.importKey(
            'raw', key, { name: 'AES-GCM' }, false, ['encrypt']
          );
          
          const fileBuffer = await f.file.arrayBuffer();
          const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            fileBuffer
          );

          const combined = new Uint8Array(iv.length + encrypted.byteLength);
          combined.set(iv);
          combined.set(new Uint8Array(encrypted), iv.length);
          
          fileInfos.push({
            originalName: f.file.name,
            originalType: f.file.type,
            size: combined.length
          });

          return new File([combined], `${f.file.name}.enc`, { type: 'application/octet-stream' });
        }));

        encryptedFiles.forEach(f => formData.append("files", f));
        updatedSettings.encryptionKeys = encryptionKeys.join(':');
        updatedSettings.fileInfos = fileInfos;
      } else {
        files.forEach(f => formData.append("files", f.file));
      }

      formData.append("shopToken", shopToken);
      formData.append("isEncrypted", String(isEncrypted));
      formData.append("settings", JSON.stringify(updatedSettings));

      const res = await fetch("/api/jobs/create", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }
      
      const data = await res.json();
      setJobResult(data);
      setStep(3);
      toast.success("Files sent successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send files. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className={`${step === 2 ? 'max-w-6xl' : 'max-w-2xl'} mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6 transition-all duration-500`}>
        
        {/* ── Connection Bar ─────────────────────────────────── */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Current Shop</span>
              <div className="flex items-center gap-2 mt-0.5">
                {isVerifying ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46E5]" /><span className="text-sm font-semibold text-[#111827]">Verifying…</span></>
                ) : shopToken && shopName ? (
                  <><div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" /><span className="text-sm font-semibold text-[#111827] truncate">{shopName}</span></>
                ) : (
                  <><div className="w-2 h-2 bg-[#EF4444] rounded-full" /><span className="text-sm font-medium text-[#6B7280]">Not Connected</span></>
                )}
              </div>
            </div>
            <button onClick={() => setShowQRModal(true)} className="flex items-center gap-2 bg-[#111827] text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-black active:scale-[0.98] transition-all shrink-0">
              <QrCode className="w-4 h-4" /> Scan QR
            </button>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Connect with Shop ID</span>
              <span className="text-[10px] font-medium text-secondary/40">Enter 6-digit code</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. k7m2x9"
                  value={shopIdInput}
                  onChange={handleShopIdChange}
                  className="w-full pl-4 pr-4 py-3 bg-white border-2 border-[#E5E7EB] rounded-xl text-sm font-bold focus:outline-none focus:border-[#4F46E5] transition-all uppercase placeholder:normal-case shadow-sm text-[#111827]"
                />
                {shopIdError && <p className="absolute -bottom-5 left-1 text-[11px] text-red-500 font-bold">{shopIdError}</p>}
              </div>
              <button 
                onClick={connectByShopId} 
                disabled={shopIdInput.length !== 6}
                className="px-8 py-3 bg-[#111827] text-white rounded-xl text-sm font-black hover:bg-black disabled:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100 transition-all shadow-lg active:scale-95 border border-[#111827]"
              >
                CONNECT
              </button>
            </div>
          </div>
        </div>

        {/* ── Discovery Tabs ─────────────────────────────────── */}
        {step === 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === "recent" ? "none" : "recent")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === "recent" ? "bg-[#111827] text-white" : "bg-white border border-[#E5E7EB] text-[#111827] hover:border-[#6B7280]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Recent
            </button>
          </div>
        )}

        {/* ── Discovery Panels ─────────────────────────────────── */}
        <AnimatePresence>
          {step === 1 && activeTab === "recent" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-2">
                {recentShops.length === 0 ? (
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 text-center">
                    <p className="text-sm text-[#6B7280]">No recent shops. Scan a QR code to connect.</p>
                  </div>
                ) : recentShops.map((s: any, i: number) => (
                  <button key={i} onClick={() => router.push(`/user?shop=${s.qrToken}`)} className="w-full flex items-center justify-between bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#4F46E5] transition-all group">
                    <div className="text-left min-w-0">
                      <p className="text-sm font-semibold text-[#111827]">{s.shopName}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{timeAgo(s.lastVisited)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#4F46E5] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* ── Main Content ────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              <FileUpload
                files={files}
                onFilesAdded={(newFiles) => setFiles(prev => [...prev, ...newFiles.map(f => ({ 
                  file: f, 
                  id: Math.random().toString(), 
                  progress: 100,
                  preview: (f.type.startsWith("image/") || f.type === "application/pdf") ? URL.createObjectURL(f) : null,
                  adjustments: { ...DEFAULT_PRINT_SETTINGS }
                }))])}
                onRemoveFile={(id) => setFiles(prev => {
                  const filtered = prev.filter(f => f.id !== id);
                  const removed = prev.find(f => f.id === id);
                  if (removed?.preview) URL.revokeObjectURL(removed.preview);
                  return filtered;
                })}
              />

              {files.length > 0 && (
                <button onClick={() => setStep(2)} className="w-full bg-[#111827] text-white py-4 rounded-xl font-medium text-base hover:bg-black active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm">
                  Configure Print <Printer className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Settings</h1>
                <button onClick={() => setStep(1)} className="text-sm font-medium text-[#4F46E5] hover:opacity-70">Edit Files</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column: Controls */}
                <div className="space-y-6">
                  {/* File Selector for Editing */}
                  {files.length > 1 && (
                    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3 block">Select File to Edit</label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {files.map((f, i) => (
                          <button 
                            key={f.id} 
                            onClick={() => {
                              setSelectedFileIndex(i);
                              setSettings(f.adjustments || DEFAULT_PRINT_SETTINGS);
                            }}
                            className={`relative min-w-[60px] h-[60px] rounded-lg border-2 transition-all overflow-hidden shrink-0 ${selectedFileIndex === i ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                          >
                            {f.preview ? (
                              <img src={f.preview} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">DOC</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <PrintSettings
                    settings={settings} onSettingsChange={handleSettingsChange}
                    isEncrypted={isEncrypted} onEncryptedChange={setIsEncrypted}
                    hasImageFiles={files.some(f => f.file.type.startsWith("image/"))}
                  />

                  <div className="pt-6 border-t border-[#E5E7EB] space-y-4">
                    <button disabled={isSubmitting} onClick={handleSubmit} className="w-full bg-[#4F46E5] text-white py-4 rounded-xl font-bold text-base hover:bg-[#4338CA] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-100">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : shopToken ? "Send to Print Shop" : "Connect Shop to Send"}
                    </button>
                  </div>
                </div>

                {/* Right Column: Preview */}
                <div className="lg:sticky lg:top-6 space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Real-time Preview</label>
                      {settings.enableCrop && files[selectedFileIndex]?.file.type.startsWith("image/") && (
                        <button 
                          onClick={() => setShowEditor(true)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-[#4F46E5] text-white text-[11px] font-bold rounded-lg hover:bg-[#4338CA] transition-all"
                        >
                          <Crop className="w-3.5 h-3.5" /> Edit/Crop
                        </button>
                      )}
                    </div>

                    <div className="flex-1 bg-[#E8E8E8] rounded-xl overflow-hidden relative flex items-center justify-center border border-border" style={{ minHeight: 480 }}>
                      {files[selectedFileIndex]?.preview ? (() => {
                        const currentFile = files[selectedFileIndex];
                        const isImage = currentFile.file.type.startsWith("image/");
                        const isPDF = currentFile.file.type === "application/pdf";
                        
                        if (isPDF) {
                          return (
                            <PDFPreview 
                              fileUrl={currentFile.preview!} 
                              colorPagesRange={settings.colorPagesRange || ""}
                              bwPagesRange={settings.bwPagesRange || ""}
                              enableColorRange={settings.enableColorRange}
                              enableBWRange={settings.enableBWRange}
                              enableAdvancedColor={settings.enableAdvancedColor}
                              baseColorMode={settings.colorMode}
                            />
                          );
                        }

                        if (!isImage) {
                          return (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 max-w-[280px]">
                              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                                <FileText className="w-8 h-8 text-gray-400" />
                              </div>
                              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">{currentFile.file.name}</h3>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">{(currentFile.file.size / 1024).toFixed(1)} KB</p>
                              <div className="px-3 py-1.5 bg-gray-100 rounded-full">
                                <span className="text-[9px] font-black text-gray-500 uppercase">Preview not available for this format</span>
                              </div>
                            </div>
                          );
                        }

                        const currentAdjustments = settings; // use current settings
                        /* ── compute helpers ─────────────────── */
                        const parseAspectRatioValue = (ratio: string): number | null => {
                          if (!ratio || ratio === "Original") return null;
                          if (ratio === "1:1 Square") return 1;
                          if (ratio === "Full Page") {
                            return settings.orientation === "Portrait" ? 210 / 297 : 297 / 210;
                          }
                          if (ratio === "Custom") {
                            const w = settings.customWidthDimensions || 0;
                            const h = settings.customHeightDimensions || 0;
                            return w > 0 && h > 0 ? w / h : null;
                          }
                          const [w, h] = ratio.split(":").map(Number);
                          if (!w || !h) return null;
                          return w / h;
                        };

                        const ratioValue = parseAspectRatioValue(settings.aspectRatio);
                        const marginY =
                          settings.margins === "None" ? 0 :
                          settings.margins === "Narrow" ? 8 :
                          settings.margins === "Normal" ? 16 :
                          settings.margins === "Wide" ? 32 :
                          settings.margins === "Custom" ? Math.max(0, (settings.customMarginTopBottom ?? 1) * 18) : 16;
                        const marginX =
                          settings.margins === "None" ? 0 :
                          settings.margins === "Narrow" ? 8 :
                          settings.margins === "Normal" ? 16 :
                          settings.margins === "Wide" ? 32 :
                          settings.margins === "Custom" ? Math.max(0, (settings.customMarginLeftRight ?? 1) * 18) : 16;

                        const cols =
                          settings.photosPerPage >= 35 ? 7 :
                          settings.photosPerPage >= 16 ? 4 :
                          settings.photosPerPage >= 9  ? 3 :
                          settings.photosPerPage >= 4  ? 2 :
                          settings.photosPerPage >= 2  ? 2 : 1;

                        const rows = Math.ceil((settings.photosPerPage || 1) / cols);

                        const imgFilter = `
                          brightness(${100 + (settings.brightness || 0)}%)
                          contrast(${100 + (settings.contrast || 0)}%)
                          saturate(${100 + (settings.saturation || 0)}%)
                          grayscale(${settings.colorMode === 'Black & White' ? '100%' : '0%'})
                        `;

                        const getFrameDimensions = (cellWidth: number, cellHeight: number) => {
                          if (!ratioValue) return { width: cellWidth, height: cellHeight };
                          const byWidthHeight = cellWidth / ratioValue;
                          if (byWidthHeight <= cellHeight) {
                            return { width: cellWidth, height: byWidthHeight };
                          }
                          return { width: cellHeight * ratioValue, height: cellHeight };
                        };

                        const previewRenderKey = [
                          settings.orientation,
                          settings.aspectRatio,
                          settings.photosPerPage,
                          settings.margins,
                          marginX,
                          marginY,
                          settings.customWidthDimensions,
                          settings.customHeightDimensions,
                          currentFile.preview, // Use reference to force update
                          Date.now() // added to ensure freshness
                        ].join("|");

                        return (
                          <div
                            key={previewRenderKey}
                            className="bg-white shadow-lg transition-all duration-500 overflow-hidden"
                            style={{
                              width: settings.orientation === 'Landscape' ? 440 : 320,
                              height: settings.orientation === 'Landscape' ? 320 : 440,
                              padding: `${marginY}px ${marginX}px`,
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            {/* Page simulation */}
                            <div
                              style={{
                                flex: 1,
                                display: 'grid',
                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                gridTemplateRows: `repeat(${rows}, 1fr)`,
                                gap: settings.photosPerPage > 1 ? 4 : 0,
                                overflow: 'hidden',
                                placeContent: 'center',
                                outline: '1px dashed rgba(99, 102, 241, 0.25)',
                                outlineOffset: '-1px'
                              }}
                            >
                              {Array.from({ length: settings.photosPerPage || 1 }).map((_, idx) => (
                                (() => {
                                  const pageWidth = settings.orientation === "Landscape" ? 440 : 320;
                                  const pageHeight = settings.orientation === "Landscape" ? 320 : 440;
                                  const contentWidth = Math.max(40, pageWidth - marginX * 2);
                                  const contentHeight = Math.max(40, pageHeight - marginY * 2 - (settings.photosPerPage > 1 ? 20 : 0));
                                  const cellWidth = contentWidth / cols;
                                  const cellHeight = contentHeight / rows;
                                  const frame = getFrameDimensions(cellWidth, cellHeight);

                                  return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-center overflow-hidden"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    minHeight: 0,
                                    minWidth: 0
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'relative',
                                      overflow: 'hidden',
                                      width: ratioValue ? `${Math.round(frame.width)}px` : '100%',
                                      height: ratioValue ? `${Math.round(frame.height)}px` : '100%',
                                      backgroundColor: '#f3f4f6',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                      border: ratioValue ? '1px solid rgba(79, 70, 229, 0.35)' : 'none'
                                    }}
                                  >
                                      <img
                                        src={currentFile.preview}
                                        alt="Preview"
                                        className={`transition-all duration-300 ${settings.enableCrop ? 'ring-2 ring-dashed ring-[#4F46E5] ring-offset-2' : ''}`}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: (ratioValue || settings.photosPerPage > 1) ? 'cover' : 'contain',
                                          filter: imgFilter,
                                        }}
                                      />
                                      {settings.enableCrop && (
                                        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#4F46E5]/40 flex items-center justify-center">
                                          <div className="bg-[#4F46E5] text-white text-[8px] font-bold px-1 py-0.5 rounded absolute top-1 left-1 uppercase">Crop Active</div>
                                        </div>
                                      )}
                                  </div>
                                </div>
                                  );
                                })()
                              ))}
                            </div>

                            {/* Layout label overlay */}
                            {settings.photosPerPage > 1 && (
                              <div className="text-center pt-1 border-t border-gray-100 mt-1">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                  Layout: {settings.photosPerPage} Photos per page
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 max-w-[280px] animate-in fade-in zoom-in-95 duration-500">
                          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 rotate-3">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">{files[selectedFileIndex]?.file.name || 'Unknown File'}</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">
                            {files[selectedFileIndex] ? (files[selectedFileIndex].file.size / 1024).toFixed(1) : '0'} KB
                          </p>
                          <div className="px-3 py-1.5 bg-gray-100 rounded-full">
                            <span className="text-[9px] font-black text-gray-500 uppercase">Preview not available for this format</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Margin indicator */}
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-[10px] font-bold text-secondary/50 uppercase">Margin: {settings.margins}</span>
                      <span className="text-[10px] font-bold text-secondary/50 uppercase">
                        {settings.aspectRatio !== 'Original' ? `Ratio: ${settings.aspectRatio}` : 'Original Size'}
                        {settings.aspectRatio === 'Custom' ? ` (${settings.customWidthDimensions}×${settings.customHeightDimensions})` : ''}
                      </span>
                    </div>
                    {/* Adjustments (Photos Only) */}
                    {files[selectedFileIndex]?.file.type.startsWith("image/") && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="text-center p-2 bg-surface rounded-lg">
                          <p className="text-[10px] text-secondary uppercase font-bold">Brightness</p>
                          <p className="text-sm font-bold">{settings.brightness || 0}%</p>
                        </div>
                        <div className="text-center p-2 bg-surface rounded-lg">
                          <p className="text-[10px] text-secondary uppercase font-bold">Contrast</p>
                          <p className="text-sm font-bold">{settings.contrast || 0}%</p>
                        </div>
                        <div className="text-center p-2 bg-surface rounded-lg">
                          <p className="text-[10px] text-secondary uppercase font-bold">Saturation</p>
                          <p className="text-sm font-bold">{settings.saturation || 0}%</p>
                        </div>
                        <div className="text-center p-2 bg-surface rounded-lg">
                          <p className="text-[10px] text-secondary uppercase font-bold">Exposure</p>
                          <p className="text-sm font-bold">{settings.exposure || 0}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-[#111827] p-4 rounded-2xl text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Print Note</p>
                    <p className="text-xs leading-relaxed opacity-80 italic">"The final print quality may vary slightly based on the printer's calibration and paper quality."</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && jobResult && (
            <SuccessScreen userId={jobResult.userId} jobId={jobResult.jobId} userToken={jobResult.userToken} isEncrypted={isEncrypted} />
          )}
        </AnimatePresence>

        {showQRModal && <QRScanner onScan={handleScan} onClose={() => setShowQRModal(false)} />}
      
      <AnimatePresence>
        {showEditor && files[selectedFileIndex] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-4xl"
            >
              <ImageEditor 
                file={files[selectedFileIndex].file}
                onSave={handleEditorSave}
                onCancel={() => setShowEditor(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}

export default function UserPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]"><Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" /></div>}>
      <UserPageContent />
    </Suspense>
  );
}
