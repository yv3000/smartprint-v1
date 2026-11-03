"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  MapPin,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Lock,
  Clock,
  Printer,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Scan,
  Layers,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Key,
  Trash2,
  AlertTriangle,
  QrCode,
  ShieldAlert,
  Zap,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

const NearbyMap = dynamic(() => import("@/components/user/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Locating nearby SmartPrint stations...
        </span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const router = useRouter();
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyShops, setNearbyShops] = useState<any[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // Interactive Hero Simulator States
  const [simEncrypted, setSimEncrypted] = useState(true);
  const [simCountdown, setSimCountdown] = useState(3540); // 59m 00s

  useEffect(() => {
    const timer = setInterval(() => {
      setSimCountdown((prev) => (prev > 0 ? prev - 1 : 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const handleNearbyClick = useCallback(() => {
    setLoadingNearby(true);

    const defaultLat = 19.1990847;
    const defaultLng = 72.8668068;

    const fetchAndOpen = async (lat: number, lng: number) => {
      setUserLocation({ lat, lng });
      try {
        const res = await fetch(`/api/shops/nearby?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        setNearbyShops(Array.isArray(data) ? data : []);
        setShowMap(true);
      } catch (error) {
        console.error("Error fetching nearby shops:", error);
        setShowMap(true);
      } finally {
        setLoadingNearby(false);
      }
    };

    let resolved = false;
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        fetchAndOpen(defaultLat, defaultLng);
      }
    }, 3500);

    if (!navigator.geolocation) {
      clearTimeout(fallbackTimer);
      fetchAndOpen(defaultLat, defaultLng);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimer);
          fetchAndOpen(position.coords.latitude, position.coords.longitude);
        }
      },
      (error) => {
        console.warn("Geolocation prompt or access failed, using default location:", error);
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimer);
          fetchAndOpen(defaultLat, defaultLng);
        }
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#0A0A0C] text-neutral-900 dark:text-neutral-100 transition-colors selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-300">
      {/* ── Topbar ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#0A0A0C]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 text-white dark:text-neutral-950 flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-none text-neutral-900 dark:text-white font-syne">
                SmartPrint
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5">
                Zero-Retention Protocol
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>RAM Spool Active • 0 Disks Touched</span>
            </div>

            <ThemeToggle size="sm" />

            <button
              onClick={() => router.push("/user")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 active:scale-[0.98] shadow-sm"
            >
              <span>Start Printing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="flex-1">
        {/* ── Hero Section ───────────────────────────────────── */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Headline & Value Proposition */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                {/* Security Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 text-xs font-semibold mb-6 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                  <span>Private Physical Printing for Sensitive Documents</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.08] mb-6 font-syne">
                  The zero-leakage handoff for physical printing.
                </h1>

                {/* Punchy Subhead */}
                <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed mb-8 max-w-xl font-normal">
                  Stop forwarding Aadhaar cards, tax returns, and confidential documents to cyber café WhatsApp chats. SmartPrint encrypts files right on your device, generates a 6-digit counter token, and permanently purges everything after printing.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto mb-10">
                  <button
                    onClick={() => router.push("/user")}
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 group"
                  >
                    <span>Send Documents to Print</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={handleNearbyClick}
                    disabled={loadingNearby}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 active:scale-[0.98] transition-all duration-200 shadow-sm"
                  >
                    {loadingNearby ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    ) : (
                      <MapPin className="w-4 h-4 text-rose-500" />
                    )}
                    <span>Find Nearby Print Shops</span>
                  </button>
                </div>

                {/* Architectural Floor Proofs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-neutral-200/80 dark:border-neutral-800/80 w-full">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">AES-256 GCM</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Client-Side Seal</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">RAM Spool</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">0 Hard Disk Writes</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">60-Min TTL</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Auto File Shred</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">Zero Accounts</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">No Mobile Required</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Dispatch Terminal Simulator */}
              <div className="lg:col-span-5">
                <div className="relative rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xl shadow-neutral-900/5 dark:shadow-black/40">
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Live Dispatch Simulator
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono font-medium text-neutral-600 dark:text-neutral-400">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>TTL: {formatCountdown(simCountdown)}</span>
                    </div>
                  </div>

                  {/* Mock Document Card */}
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/60 dark:border-neutral-800 mb-4 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate max-w-[170px]">
                            Aadhaar_Passport_Docs.pdf
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            3 Pages • Color (Split) • Duplex
                          </div>
                        </div>
                      </div>

                      <div
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                          simEncrypted
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {simEncrypted ? (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>AES-256 Sealed</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3" />
                            <span>Direct Spool</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Interactive Zero-Knowledge Toggle */}
                    <div className="mt-4 pt-3 border-t border-neutral-200/50 dark:border-neutral-800/60 flex items-center justify-between text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                        Zero-Knowledge Screen Mask:
                      </span>
                      <button
                        onClick={() => setSimEncrypted(!simEncrypted)}
                        className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                          simEncrypted
                            ? "bg-indigo-600 text-white"
                            : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {simEncrypted ? "Enabled (Shop screen masked)" : "Disabled (Standard)"}
                      </button>
                    </div>
                  </div>

                  {/* Token & Pickup Code Preview */}
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-center mb-5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                      Shop Counter Pickup Token
                    </div>
                    <div className="text-3xl font-extrabold tracking-widest font-mono text-neutral-900 dark:text-white my-1">
                      SP-8942
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Show or say this 6-digit code at the printer counter
                    </div>
                  </div>

                  {/* Hardware Spool Execution Flow */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Encrypted inside your browser memory (Web Crypto API)</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Transmitted directly via authenticated WebSocket/HTTPS</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Printer driver decodes in RAM — deleted upon paper ejection</span>
                    </div>
                  </div>

                  {/* CTA inside Terminal */}
                  <button
                    onClick={() => router.push("/user")}
                    className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Launch Real Print Session</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Problem vs Solution: The WhatsApp Trap ─────────── */}
        <section className="py-16 sm:py-20 bg-neutral-100/60 dark:bg-neutral-950/40 border-y border-neutral-200/80 dark:border-neutral-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">
                The Security Hazard
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-2 font-syne">
                Why printing via WhatsApp is dangerous.
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base mt-3">
                Every time you WhatsApp or email your confidential documents to a local print shop, you leave irreversible digital footprints.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
              {/* The Old Way (Danger) */}
              <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-950 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      The Traditional WhatsApp Flow
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Standard stationery & cyber café habit
                    </p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      <strong>Permanently saved in phone gallery:</strong> Your Aadhaar, salary slips, and medical records remain in the shopkeeper's personal WhatsApp media.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      <strong>Stored in public Downloads folder:</strong> Left unencrypted on shared Windows desktops accessible by any customer after you.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      <strong>Phone number exposure:</strong> You must message an unknown number, exposing your WhatsApp profile and contact.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      <strong>Cloud backup leakage:</strong> Files get automatically backed up to personal Google Drive or iCloud accounts.
                    </span>
                  </li>
                </ul>
              </div>

              {/* The SmartPrint Way (Secure) */}
              <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-950 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      The SmartPrint Protocol
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Zero-knowledge ephemeral handoff
                    </p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      <strong>Client-side encryption:</strong> When "Secure It" is enabled, files are encrypted with AES-256 GCM in your browser before upload.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      <strong>Volatile RAM spooling:</strong> Files pipe directly to the hardware printer driver. Never saved to public download folders.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      <strong>6-Digit PIN or QR pairing:</strong> Zero logins, zero phone numbers, and no WhatsApp contact exchange needed.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      <strong>Guaranteed auto-shredding:</strong> Automatic background garbage collector permanently removes all traces in 60 minutes.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Capabilities Bento Grid ────────────────────────── */}
        <section className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Engineered for High-Fidelity Printing
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-2 font-syne">
                Every print setting. Zero compromise.
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base mt-3">
                Full layout control, intelligent cost splitting, and built-in studio tools built directly into the web client.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Bento 1: Dynamic Color / B&W Page Splitter */}
              <div className="rounded-3xl p-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 font-syne">
                    Color & B&W Page Splitter
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Why pay ₹10/page for a 60-page report when only 4 pages have color charts? SmartPrint parses page numbers and lets you print monochrome pages at ₹2 and color pages selectively.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <span>Save up to 70% on college & office prints</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bento 2: Canvas Photo Studio & Passport Cropper */}
              <div className="rounded-3xl p-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 font-syne">
                    Passport Photo Studio
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Crop and rotate passport photos with exact 35x45mm guidelines. Automatically tile 4-up or 8-up on glossy 4x6 photo paper directly from your smartphone browser.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span>Official visa & exam dimensions ready</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bento 3: Multi-Format Engine */}
              <div className="rounded-3xl p-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 font-syne">
                    Universal Multi-Format Spooler
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Drop PDFs, Microsoft Word (.docx), Excel spreadsheets (.xlsx), text files, or raw photos. SmartPrint normalizes dimensions and generates high-DPI print bitmaps on the fly.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>PDF • DOCX • XLSX • JPG • PNG</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Three Simple Steps ─────────────────────────────── */}
        <section className="py-16 sm:py-24 bg-neutral-100/60 dark:bg-neutral-950/40 border-t border-neutral-200/80 dark:border-neutral-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Zero Learning Curve
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-2 font-syne">
                Three steps from phone to printer tray.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="rounded-2xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold flex items-center justify-center font-mono">
                    01
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">On your device</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
                  Drop & Configure
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Select your documents, choose color mode, duplex printing, or crop your passport photos. Toggle client encryption on with a single switch.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold flex items-center justify-center font-mono">
                    02
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Instant pairing</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
                  Get 6-Digit Counter PIN
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  SmartPrint issues an ephemeral 6-digit pickup code or scan counter QR. Walk into the shop and provide the code. No typing email or sharing numbers.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold flex items-center justify-center font-mono">
                    03
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Paper collection</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
                  Collect from Tray & Auto-Purge
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  The printer feeds the pages directly from volatile memory. Once printed or after 60 minutes, all file blocks are permanently shredded.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Nearby Shop Radar Card ─────────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white border border-neutral-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Radial glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-neutral-300 text-xs font-semibold mb-4">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Real-Time Geolocation Radar</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight font-syne mb-3">
                  Find active print shops around you.
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  View verified SmartPrint certified printers within walking distance, check paper availability, live queues, and send print jobs in advance.
                </p>
              </div>

              <div className="relative z-10 shrink-0">
                <button
                  onClick={handleNearbyClick}
                  disabled={loadingNearby}
                  className="px-6 py-3.5 rounded-full text-xs sm:text-sm font-semibold bg-white text-neutral-950 hover:bg-neutral-200 transition-all active:scale-[0.98] shadow-lg flex items-center gap-2.5"
                >
                  {loadingNearby ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                  ) : (
                    <MapPin className="w-4 h-4 text-rose-500" />
                  )}
                  <span>Open Nearby Radar</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Polished Footer ─────────────────────────────────── */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0A0A0C] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center">
                <Printer className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white font-syne">
                  SmartPrint
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Zero-Knowledge Document Transmission Protocol
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              <span>Client-Side AES-256</span>
              <span>•</span>
              <span>No Disk Retention</span>
              <span>•</span>
              <span>Ephemeral 60m TTL</span>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800/60 text-center sm:text-left text-xs text-neutral-400 dark:text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              Built for campus stationery shops, cyber cafés, and enterprise print stations.
            </div>
            <div>
              SmartPrint © {new Date().getFullYear()} • Zero telemetry collected.
            </div>
          </div>
        </div>
      </footer>

      {/* Geolocation Nearby Map Modal */}
      {showMap && userLocation && (
        <NearbyMap
          userLat={userLocation.lat}
          userLng={userLocation.lng}
          shops={nearbyShops}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
