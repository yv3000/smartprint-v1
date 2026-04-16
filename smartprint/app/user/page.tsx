"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Printer, 
  Upload, 
  MapPin, 
  Clock, 
  ChevronRight, 
  QrCode, 
  Shield, 
  Loader2,
  AlertCircle
} from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import QRScanner from "@/components/user/QRScanner";
import FileUpload from "@/components/user/FileUpload";
import PrintSettings from "@/components/user/PrintSettings";
import SuccessScreen from "@/components/user/SuccessScreen";
import { DEFAULT_PRINT_SETTINGS, PrintSettings as PrintSettingsType } from "@/lib/types";
import dynamic from "next/dynamic";

const NearbyMap = dynamic(() => import("@/components/user/NearbyMap"), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-surface animate-pulse rounded-2xl flex items-center justify-center text-sm text-secondary">Loading Map...</div>
}) as React.ComponentType<{
  userLat: number;
  userLng: number;
  shops: any[];
  onClose: () => void;
}>;

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
  const [activeTab, setActiveTab] = useState<"none" | "recent" | "nearby">("none");
  const [recentShops, setRecentShops] = useState<any[]>([]);
  const [nearbyShops, setNearbyShops] = useState<any[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Job flow
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<any[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [settings, setSettings] = useState<PrintSettingsType>(DEFAULT_PRINT_SETTINGS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  // Load recent shops
  useEffect(() => {
    const recent = Cookies.get("sp_recent");
    if (recent) setRecentShops(JSON.parse(recent));
  }, []);

  // Verify shop token
  useEffect(() => {
    if (shopToken) {
      setIsVerifying(true);
      fetch(`/api/shops/verify?token=${shopToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setShopName(data.shopName);
            // Save to recent
            const existing = Cookies.get("sp_recent");
            let recent = existing ? JSON.parse(existing) : [];
            recent = recent.filter((s: any) => s.qrToken !== shopToken);
            recent.unshift({ shopName: data.shopName, qrToken: shopToken, lastVisited: new Date().toISOString() });
            Cookies.set("sp_recent", JSON.stringify(recent.slice(0, 3)), { expires: 90 });
            setRecentShops(recent.slice(0, 3));
          } else {
            setShopName(null);
          }
        })
        .finally(() => setIsVerifying(false));
    }
  }, [shopToken]);

  const handleScan = (token: string) => {
    setShowQRModal(false);
    router.push(`/user?shop=${token}`);
  };

  const fetchNearby = useCallback(async () => {
    setNearbyLoading(true);
    setNearbyError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      const res = await fetch(`/api/shops/nearby?lat=${latitude}&lng=${longitude}`);
      const data = await res.json();
      setNearbyShops(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.code === 1) setNearbyError("Please allow location access to find nearby shops.");
      else setNearbyError("Could not get your location. Please try again.");
    } finally {
      setNearbyLoading(false);
    }
  }, []);

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

  const handleSubmit = async () => {
    if (!files.length) return;
    if (!shopToken) {
      toast.error("Please connect to a shop first");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f.file));
      formData.append("shopToken", shopToken);
      formData.append("isEncrypted", String(isEncrypted));
      formData.append("settings", JSON.stringify(settings));

      const res = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setJobResult(data);
      setStep(3);
      toast.success("Files sent successfully!");
    } catch (error) {
      toast.error("Failed to send files. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
        
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

          <div className="pt-4 border-t border-border flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter shop ID (e.g. k7m2x9)"
                value={shopIdInput}
                onChange={handleShopIdChange}
                className="w-full pl-4 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {shopIdError && <p className="absolute -bottom-5 left-1 text-[11px] text-red-500">{shopIdError}</p>}
            </div>
            <button 
              onClick={connectByShopId} 
              disabled={shopIdInput.length !== 6}
              className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Connect
            </button>
          </div>
        </div>

        {/* ── Discovery Tabs ─────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === "recent" ? "none" : "recent")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "recent" ? "bg-[#111827] text-white" : "bg-white border border-[#E5E7EB] text-[#111827] hover:border-[#6B7280]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Recent
          </button>
          <button
            onClick={() => { setActiveTab(activeTab === "nearby" ? "none" : "nearby"); if (activeTab !== "nearby") fetchNearby(); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "nearby" ? "bg-[#111827] text-white" : "bg-white border border-[#E5E7EB] text-[#111827] hover:border-[#6B7280]"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Nearby
          </button>
        </div>

        {/* ── Discovery Panels ─────────────────────────────────── */}
        <AnimatePresence>
          {activeTab === "recent" && (
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

          {activeTab === "nearby" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-2">
                {nearbyLoading ? (
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#4F46E5]" />
                    <p className="text-sm text-[#6B7280]">Finding nearby shops...</p>
                  </div>
                ) : nearbyError ? (
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-[#EF4444] mx-auto mb-3" />
                    <p className="text-sm text-[#6B7280]">{nearbyError}</p>
                  </div>
                ) : nearbyShops && nearbyShops.length === 0 ? (
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 text-center">
                    <p className="text-sm text-[#6B7280]">No SmartPrint shops found nearby.</p>
                  </div>
                ) : userLocation && nearbyShops && nearbyShops.length > 0 ? (
                  <NearbyMap
                    userLat={userLocation.lat}
                    userLng={userLocation.lng}
                    shops={nearbyShops}
                    onClose={() => setActiveTab("none")}
                  />
                ) : null}
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
                onFilesAdded={(newFiles) => setFiles(prev => [...prev, ...newFiles.map(f => ({ file: f, id: Math.random().toString(), progress: 100 }))])}
                onRemoveFile={(id) => setFiles(prev => prev.filter(f => f.id !== id))}
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

              <PrintSettings
                settings={settings} onSettingsChange={setSettings}
                isEncrypted={isEncrypted} onEncryptedChange={setIsEncrypted}
                hasImageFiles={files.some(f => f.file.type.startsWith("image/"))}
              />

              <div className="pt-6 border-t border-[#E5E7EB] space-y-4">
                <button disabled={isSubmitting} onClick={handleSubmit} className="w-full bg-[#4F46E5] text-white py-4 rounded-xl font-medium text-base hover:bg-[#4338CA] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : shopToken ? "Send to Print Shop" : "Connect Shop to Send"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && jobResult && (
            <SuccessScreen userId={jobResult.userId} jobId={jobResult.jobId} userToken={jobResult.userToken} isEncrypted={isEncrypted} />
          )}
        </AnimatePresence>

        {showQRModal && <QRScanner onScan={handleScan} onClose={() => setShowQRModal(false)} />}

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
