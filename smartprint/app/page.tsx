"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  MapPin,
  Loader2,
  Printer,
  ArrowRight,
  ScanLine,
  Hash,
  Menu,
  X,
  ShieldCheck,
  Lock,
  Clock,
  Sparkles,
  ExternalLink,
  Navigation,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import toast from "react-hot-toast";

const NearbyMap = dynamic(() => import("@/components/user/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xl flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-800 dark:text-neutral-200" />
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Loading Station Radar...
        </span>
      </div>
    </div>
  ),
});

const QRScanner = dynamic(() => import("@/components/user/QRScanner"), {
  ssr: false,
});

interface NearbyShopItem {
  shopName: string;
  qrCode: string;
  latitude: number;
  longitude: number;
  address?: string;
  isOnline: boolean;
  distance: string;
  distanceKm: number;
}

export default function HomePage() {
  const router = useRouter();

  // Location & Radar State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 19.1990847,
    lng: 72.8668068,
  });
  const [nearbyShops, setNearbyShops] = useState<NearbyShopItem[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);

  // Counter Connection State (Shop ID or Scan)
  const [shopIdInput, setShopIdInput] = useState("");
  const [connectingId, setConnectingId] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [connectTab, setConnectTab] = useState<"id" | "scan">("id");

  // Hamburger Drawer State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Fetch Nearby Stations on Mount
  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    setLoadingShops(true);
    try {
      const res = await fetch(`/api/shops/nearby?lat=${lat}&lng=${lng}&radius=25`);
      if (res.ok) {
        const data = await res.json();
        setNearbyShops(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load nearby shops:", err);
    } finally {
      setLoadingShops(false);
    }
  }, []);

  useEffect(() => {
    let resolved = false;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!resolved) {
            resolved = true;
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(coords);
            setGpsActive(true);
            fetchNearby(coords.lat, coords.lng);
          }
        },
        () => {
          if (!resolved) {
            resolved = true;
            fetchNearby(19.1990847, 72.8668068);
          }
        },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
      );
    } else {
      fetchNearby(19.1990847, 72.8668068);
    }

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        fetchNearby(19.1990847, 72.8668068);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [fetchNearby]);

  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    setLoadingShops(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setGpsActive(true);
        fetchNearby(coords.lat, coords.lng);
        toast.success("Location updated");
      },
      () => {
        toast.error("Unable to retrieve GPS coordinates");
        setLoadingShops(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleConnectById = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = shopIdInput.trim().toLowerCase();
    if (cleanId.length !== 6) {
      toast.error("Enter a valid 6-character Shop ID");
      return;
    }
    setConnectingId(true);
    try {
      const res = await fetch(`/api/shops/by-id/${cleanId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error || "Shop not found. Check ID and retry.");
        return;
      }
      toast.success(`Connected to ${data.shop.shopName}`);
      router.push(`/user?shop=${data.shop.qrCode}`);
    } catch {
      toast.error("Connection failed. Check network.");
    } finally {
      setConnectingId(false);
    }
  };

  const handleScanSuccess = (token: string) => {
    setShowScanner(false);
    toast.success("QR recognized");
    router.push(`/user?shop=${token}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4" strokeWidth={2.4} />
            </div>
            <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white">
              SmartPrint
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-all text-neutral-700 dark:text-neutral-300 active:scale-95 shadow-xs"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hamburger Drawer Overlay ──────────────────────────── */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#0f0f13] h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center">
                    <Printer className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">
                    Protocol & Partner Portal
                  </span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="py-6 space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2.5">
                    Terminal Operators
                  </h4>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push("/admin/auth");
                    }}
                    className="w-full text-left p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-all group flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        Shopkeeper Dashboard
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Access print queue & hardware bridge
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2.5">
                    Security Specifications
                  </h4>
                  <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>Client-Side AES-256 GCM encryption in browser memory.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <span>100-Second auto-destruct upon queue opening.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                      <span>Zero disk storage · direct volatile RAM printer spool.</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2.5">
                    Supported Documents
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    PDF, DOCX, DOC, XLSX, PPTX, TXT, and JPG/PNG/WEBP photos.
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-neutral-200/80 dark:border-neutral-800 text-center">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>SmartPrint Protocol v2.4 Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Utility Core ─────────────────────────────────── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Simple Minimal Title */}
        <div className="text-left space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
            Print securely at any counter.
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-normal">
            No WhatsApp. No account required. Files encrypt on your device and purge automatically.
          </p>
        </div>

        {/* ── TOP PRIORITY: Nearby Printers Radar ──────────────── */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Printers Near You {gpsActive && "• GPS"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshLocation}
                disabled={loadingShops}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1"
                title="Refresh location"
              >
                <Navigation className={`w-3 h-3 ${loadingShops ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {nearbyShops.length > 0 && (
                <button
                  onClick={() => setShowMap(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
                >
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>Map</span>
                </button>
              )}
            </div>
          </div>

          {/* Radar List */}
          {loadingShops ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              <span className="text-xs text-neutral-400 font-medium">Detecting local terminals...</span>
            </div>
          ) : nearbyShops.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-500">
              No registered print stations found within immediate radius.
            </div>
          ) : (
            <div className="space-y-2.5">
              {nearbyShops.slice(0, 3).map((shop, i) => (
                <div
                  key={shop.qrCode || i}
                  onClick={() => router.push(`/user?shop=${shop.qrCode}`)}
                  className="p-3.5 rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-850/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {shop.shopName}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-200/80 dark:bg-neutral-750 text-neutral-700 dark:text-neutral-300 shrink-0">
                        {shop.distance}
                      </span>
                    </div>
                    {shop.address && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {shop.address}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/user?shop=${shop.qrCode}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-95 transition-all shrink-0 shadow-xs"
                  >
                    <span>Print Here</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SECONDARY ACTION: Connect at Counter ──────────────── */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Standing at the Counter?
            </h2>
            <div className="flex gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <button
                type="button"
                onClick={() => setConnectTab("id")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  connectTab === "id"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Enter ID
              </button>
              <button
                type="button"
                onClick={() => setConnectTab("scan")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  connectTab === "scan"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Scan QR
              </button>
            </div>
          </div>

          {connectTab === "id" ? (
            <form onSubmit={handleConnectById} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={shopIdInput}
                  onChange={(e) =>
                    setShopIdInput(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="e.g. k7m2x9"
                  maxLength={6}
                  className="w-full bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-750 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono uppercase tracking-widest font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-mono">
                  {shopIdInput.length}/6
                </span>
              </div>
              <button
                type="submit"
                disabled={shopIdInput.length !== 6 || connectingId}
                className="px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shrink-0 shadow-xs flex items-center gap-1.5"
              >
                {connectingId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Connect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-3 space-y-2.5">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Point your camera at the standee QR code placed on the shop counter.
              </p>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-95 transition-all shadow-xs"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Open QR Camera</span>
              </button>
            </div>
          )}
        </section>

        {/* ── TERTIARY ACTION: Direct File Upload ──────────────── */}
        <div className="pt-1 text-center">
          <button
            onClick={() => router.push("/user")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <span>Have files ready? Stage documents first</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </main>

      {/* ── Minimal Footer ────────────────────────────────────── */}
      <footer className="w-full border-t border-neutral-200/80 dark:border-neutral-800/80 py-4 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
        <span>Zero Logs Kept • Client-Side Encrypted • Auto-Shredding</span>
      </footer>

      {/* ── Leaflet Nearby Map Modal ──────────────────────────── */}
      {showMap && (
        <NearbyMap
          userLat={userLocation.lat}
          userLng={userLocation.lng}
          shops={nearbyShops}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* ── QR Scanner Modal ──────────────────────────────────── */}
      {showScanner && (
        <QRScanner
          onScan={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
