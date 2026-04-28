"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, Loader2 } from "lucide-react";

const NearbyMap = dynamic(() => import("@/components/user/NearbyMap"), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
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
    <div className="min-h-screen flex flex-col">
      {/* ── Navbar ────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-[#1A1A1A]">SmartPrint</span>
          </div>
          <button
            onClick={() => router.push("/user")}
            className="text-sm font-medium text-[#4F46E5] hover:opacity-80 transition-opacity"
          >
            Start Printing →
          </button>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-[680px] text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-sm text-secondary mb-8">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Privacy-first. No login required.
            </div>

            <h1 className="text-[48px] sm:text-[56px] font-semibold tracking-tight leading-[1.05] mb-6">
              Print documents
              <br />
              <span className="text-secondary">without compromising</span>
              <br />
              your privacy.
            </h1>

            <p className="text-lg text-secondary max-w-[480px] mx-auto mb-10 leading-relaxed">
              Stop sharing personal documents on WhatsApp. Upload, configure, and print — files are automatically deleted within 1 hour.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push("/user")}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#4F46E5] text-white rounded-xl text-[15px] font-bold hover:bg-[#4338CA] transition-all active:scale-[0.98] shadow-lg shadow-indigo-100"
              >
                Start Printing
              </button>
              <button
                onClick={handleNearbyClick}
                disabled={loadingNearby}
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#1A1A1A] border border-[#E5E7EB] rounded-xl text-[15px] font-bold hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loadingNearby ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Nearby Printout
              </button>
              <button
                onClick={() => {
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto px-8 py-3.5 text-secondary text-[15px] font-medium hover:text-foreground transition-all"
              >
                How it Works
              </button>
            </div>
          </div>
        </section>

        {/* ── How it Works ────────────────────────────────────── */}
        <section id="how-it-works" className="py-24 px-6 border-t border-border">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-[36px] font-semibold tracking-tight mb-4">Three simple steps.</h2>
              <p className="text-secondary text-lg">No accounts. No passwords. No data stored.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[960px] mx-auto">
              {/* Step 1 */}
              <div className="text-center p-8 rounded-2xl border border-border bg-white hover:border-border-light hover:shadow-sm transition-all animate-slide-up delay-100" style={{ animationFillMode: "backwards" }}>
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto mb-5">
                  <span className="text-xl">📄</span>
                </div>
                <div className="text-xs font-medium text-accent uppercase tracking-wider mb-3">Step 1</div>
                <h3 className="text-xl font-semibold mb-2">Upload</h3>
                <p className="text-secondary text-sm leading-relaxed">
                  Drag and drop your documents. PDF, images, or DOCX — we support them all.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center p-8 rounded-2xl border border-border bg-white hover:border-border-light hover:shadow-sm transition-all animate-slide-up delay-200" style={{ animationFillMode: "backwards" }}>
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto mb-5">
                  <span className="text-xl">⚙️</span>
                </div>
                <div className="text-xs font-medium text-accent uppercase tracking-wider mb-3">Step 2</div>
                <h3 className="text-xl font-semibold mb-2">Configure</h3>
                <p className="text-secondary text-sm leading-relaxed">
                  Set paper size, copies, color mode, and more. Optionally encrypt for extra security.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center p-8 rounded-2xl border border-border bg-white hover:border-border-light hover:shadow-sm transition-all animate-slide-up delay-300" style={{ animationFillMode: "backwards" }}>
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto mb-5">
                  <span className="text-xl">🖨️</span>
                </div>
                <div className="text-xs font-medium text-accent uppercase tracking-wider mb-3">Step 3</div>
                <h3 className="text-xl font-semibold mb-2">Print</h3>
                <p className="text-secondary text-sm leading-relaxed">
                  Tell the shop your Print ID. Files auto-delete within 1 hour of being sent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Security Section ────────────────────────────────── */}
        <section className="py-24 px-6 bg-surface border-t border-border">
          <div className="max-w-[680px] mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center mx-auto mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 className="text-[36px] font-semibold tracking-tight mb-4">
              Your documents, protected.
            </h2>
            <p className="text-secondary text-lg leading-relaxed mb-10">
              Enable &quot;Secure It&quot; to encrypt your files before they even leave your device. The shop can print but can&apos;t see your documents. Ever.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {[
                { icon: "🔐", title: "Client-side encryption", desc: "AES-256 — encrypted before upload" },
                { icon: "⏱️", title: "100s auto-delete", desc: "Files vanish after being opened" },
                { icon: "👁️", title: "No preview for secure files", desc: "Shop can only print, not view" },
                { icon: "🚫", title: "No permanent storage", desc: "Nothing is ever stored on disk" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-border">
                  <span className="text-lg mt-0.5">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-secondary mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="py-8 px-6 border-t border-border">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <div className="text-sm text-secondary">
              SmartPrint — Privacy-first printing
            </div>
            <div className="text-xs text-secondary/60">
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
