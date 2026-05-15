"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  MapPin,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Lock,
  Clock,
  Eye,
  Upload,
  Settings2,
  Printer,
} from "lucide-react";

const NearbyMap = dynamic(() => import("@/components/user/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-md flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  ),
});

export default function HomePage() {
  const router = useRouter();
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyShops, setNearbyShops] = useState<any[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  const handleNearbyClick = useCallback(() => {
    setLoadingNearby(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setLoadingNearby(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(`/api/shops/nearby?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          setNearbyShops(Array.isArray(data) ? data : []);
          setShowMap(true);
        } catch (error) {
          console.error("Error fetching nearby shops:", error);
          alert("Could not fetch nearby shops. Please try again.");
        } finally {
          setLoadingNearby(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Please allow location access to find nearby shops.");
        setLoadingNearby(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  return (
    <div className="user-portal min-h-screen flex flex-col">
      {/* ── Topbar ───────────────────────────────────────────── */}
      <nav className="up-topbar">
        <div
          className="mx-auto h-full flex items-center justify-between px-6"
          style={{ maxWidth: 1200 }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-[8px] flex items-center justify-center"
              style={{ background: "var(--up-text)" }}
            >
              <Printer size={14} color="#fff" strokeWidth={2} />
            </div>
            <span style={{ fontSize: "1.17em", fontWeight: 600, letterSpacing: "-0.01em" }}>
              SmartPrint
            </span>
          </div>
          <button
            onClick={() => router.push("/user")}
            className="up-btn-text"
            style={{ fontSize: "1em", fontWeight: 500 }}
          >
            Start Printing
            <ChevronRight size={14} strokeWidth={1.8} />
          </button>
        </div>
      </nav>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section
          className="flex-1 flex items-center justify-center px-6"
          style={{
            paddingTop: "clamp(40px, 10vh, 96px)",
            paddingBottom: "clamp(40px, 10vh, 96px)",
            minHeight: "85vh",
          }}
        >
          <div className="text-center up-page-enter" style={{ maxWidth: 560 }}>
            {/* Pill label */}
            <div
              className="up-chip up-chip-accent up-stagger-1"
              style={{ fontSize: "0.92em", fontWeight: 600, marginBottom: 24 }}
            >
              <ShieldCheck size={12} strokeWidth={1.8} />
              Privacy-First Printing
            </div>

            {/* Headline */}
            <h1 className="up-hero up-stagger-2" style={{ marginBottom: 24 }}>
              Print without sharing.
              <br />
              <span style={{ color: "var(--up-text-2)" }}>Ever.</span>
            </h1>

            {/* Subheadline */}
            <p
              className="up-sub up-stagger-3 mx-auto"
              style={{ maxWidth: 420, marginBottom: 40 }}
            >
              Upload your documents, configure settings, and send securely.
              Files auto-delete in 1 hour.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 up-stagger-3"
              style={{ marginBottom: 16 }}
            >
              <button
                onClick={() => router.push("/user")}
                className="up-btn-primary w-full sm:w-auto"
                style={{ minWidth: 180, height: 44 }}
              >
                Start Printing
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="up-btn-text"
                style={{ fontSize: "1.1em" }}
              >
                See how it works
                <ChevronRight size={14} strokeWidth={1.8} />
              </button>
            </div>

            {/* Nearby option (preserved feature) */}
            <button
              onClick={handleNearbyClick}
              disabled={loadingNearby}
              className="up-btn-ghost mx-auto"
              style={{ marginTop: 24, height: 40 }}
            >
              {loadingNearby ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <MapPin size={14} strokeWidth={1.8} />
              )}
              Find nearby shops
            </button>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section
          className="px-6"
          style={{
            paddingTop: "clamp(40px, 8vh, 64px)",
            paddingBottom: "clamp(40px, 8vh, 64px)",
            background: "var(--up-bg)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: 1040 }}>
            <div
              className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3"
              style={{ marginInline: "auto" }}
            >
              {[
                {
                  icon: <Lock size={18} strokeWidth={1.6} />,
                  bg: "rgba(0,113,227,0.08)",
                  fg: "var(--up-accent)",
                  title: "Encrypted on your device",
                  desc:
                    "Optional AES-256 encryption before upload. The shop can print but never preview your files.",
                },
                {
                  icon: <Clock size={18} strokeWidth={1.6} />,
                  bg: "rgba(52,199,89,0.10)",
                  fg: "#1A8038",
                  title: "Auto-delete in 1 hour",
                  desc:
                    "Every file vanishes within an hour. Nothing is stored permanently — that's the default.",
                },
                {
                  icon: <Eye size={18} strokeWidth={1.6} />,
                  bg: "rgba(255,59,48,0.10)",
                  fg: "var(--up-danger)",
                  title: "No accounts, no tracking",
                  desc:
                    "Skip the login. Skip the WhatsApp. Just a simple Print ID for each session.",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className={`up-card up-card-hover up-stagger-${(i % 3) + 1}`}
                  style={{ padding: 24 }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: f.bg,
                      color: f.fg,
                      marginBottom: 16,
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25em",
                      fontWeight: 600,
                      marginBottom: 6,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "1.08em",
                      color: "var(--up-text-2)",
                      lineHeight: 1.55,
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it Works ─────────────────────────────────── */}
        <section
          id="how-it-works"
          className="px-6"
          style={{
            paddingTop: "clamp(40px, 8vh, 64px)",
            paddingBottom: "clamp(40px, 8vh, 64px)",
            borderTop: "0.5px solid var(--up-divider)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: 1040 }}>
            <div className="text-center" style={{ marginBottom: 56 }}>
              <h2
                style={{
                  fontSize: "2.6em",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  marginBottom: 8,
                }}
              >
                Three simple steps.
              </h2>
              <p className="up-sub" style={{ fontSize: "1.2em" }}>
                No accounts. No passwords. No data stored.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
              {/* Connecting line on desktop */}
              <div
                className="hidden md:block absolute"
                style={{
                  top: 38,
                  left: "16%",
                  right: "16%",
                  height: 0.5,
                  background: "var(--up-divider)",
                  zIndex: 0,
                }}
              />
              {[
                {
                  n: "01",
                  icon: <Upload size={20} strokeWidth={1.5} />,
                  title: "Upload",
                  desc:
                    "Drag and drop. PDF, JPG, PNG, DOCX — up to 50MB per session.",
                },
                {
                  n: "02",
                  icon: <Settings2 size={20} strokeWidth={1.5} />,
                  title: "Configure",
                  desc:
                    "Paper, color, copies, margins. Optionally enable end-to-end encryption.",
                },
                {
                  n: "03",
                  icon: <Printer size={20} strokeWidth={1.5} />,
                  title: "Print",
                  desc:
                    "Tell the shop your Print ID. Files auto-delete after one hour.",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="text-center relative"
                  style={{ zIndex: 1 }}
                >
                  <div
                    style={{
                      fontSize: "5em",
                      fontWeight: 600,
                      color: "rgba(0,0,0,0.06)",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                      marginBottom: 8,
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    className="mx-auto flex items-center justify-center"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "var(--up-surface)",
                      boxShadow: "var(--up-shadow-rest)",
                      color: "var(--up-text)",
                      marginBottom: 16,
                    }}
                  >
                    {s.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: "1.45em",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      marginBottom: 6,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "1.08em",
                      color: "var(--up-text-2)",
                      lineHeight: 1.55,
                      maxWidth: 260,
                      margin: "0 auto",
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security ─────────────────────────────────────── */}
        <section
          className="px-6"
          style={{
            paddingTop: "clamp(40px, 8vh, 64px)",
            paddingBottom: "clamp(40px, 8vh, 64px)",
            borderTop: "0.5px solid var(--up-divider)",
            background: "var(--up-surface)",
          }}
        >
          <div
            className="mx-auto text-center"
            style={{ maxWidth: 680 }}
          >
            <div
              className="mx-auto flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "rgba(0,113,227,0.08)",
                color: "var(--up-accent)",
                marginBottom: 24,
              }}
            >
              <ShieldCheck size={24} strokeWidth={1.5} />
            </div>
            <h2
              style={{
                fontSize: "2.4em",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}
            >
              Your documents, protected.
            </h2>
            <p className="up-sub" style={{ marginBottom: 32 }}>
              Enable Secure It to encrypt your files before they leave your
              device. The shop can print, but cannot view your documents.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                {
                  title: "Client-side encryption",
                  desc: "AES-256 — encrypted before upload",
                },
                {
                  title: "Auto-delete",
                  desc: "Files vanish after the session expires",
                },
                {
                  title: "No preview for secure files",
                  desc: "Shop can only print, not view",
                },
                {
                  title: "No permanent storage",
                  desc: "Nothing is ever stored on disk",
                },
              ].map((it, i) => (
                <div
                  key={i}
                  className="flex items-start"
                  style={{
                    gap: 12,
                    padding: 16,
                    borderRadius: 12,
                    background: "var(--up-bg)",
                    border: "0.5px solid var(--up-border)",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "var(--up-accent)",
                      marginTop: 8,
                      flex: "none",
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "1.08em",
                        fontWeight: 500,
                        marginBottom: 2,
                      }}
                    >
                      {it.title}
                    </div>
                    <div style={{ fontSize: "1em", color: "var(--up-text-2)" }}>
                      {it.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer
          className="px-6"
          style={{
            paddingTop: 32,
            paddingBottom: 32,
            borderTop: "0.5px solid var(--up-divider)",
          }}
        >
          <div
            className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-2"
            style={{ maxWidth: 1040 }}
          >
            <div style={{ fontSize: "1em", color: "var(--up-text-2)" }}>
              SmartPrint — Privacy-first printing
            </div>
            <div style={{ fontSize: "0.92em", color: "var(--up-text-3)" }}>
              Files are never permanently stored.
            </div>
          </div>
        </footer>

        {showMap && userLocation && (
          <NearbyMap
            userLat={userLocation.lat}
            userLng={userLocation.lng}
            shops={nearbyShops}
            onClose={() => setShowMap(false)}
          />
        )}
      </main>
    </div>
  );
}
