"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, MapPin, QrCode, ArrowRight, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function Onboarding() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [shopName, setShopName] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [qrToken, setQrToken] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/auth");
    }
  }, [status, router]);

  const handleGetLocation = async () => {
    setIsLoading(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setLocation({
            lat: latitude,
            lng: longitude,
            address: data.display_name || "Unknown address",
          });
          toast.success("Location detected!");
        } catch (err) {
          toast.error("Failed to get address. You can still proceed.");
          setLocation({ lat: latitude, lng: longitude, address: "Manual entry required" });
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        toast.error("Please allow location access");
        setIsLoading(false);
      }
    );
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          latitude: location?.lat,
          longitude: location?.lng,
          address: location?.address,
        }),
      });

      if (!res.ok) throw new Error("Onboarding failed");

      const data = await res.json();
      setQrToken(data.qrCode);
      setStep(3);
      toast.success("Shop registered successfully!");
    } catch (err) {
      toast.error("Failed to save shop. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") return null;

  const cardVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F8F7F4] dark:bg-[#0B0B0F]">
      <div className="w-full max-w-xl">
        {/* Progress Bar */}
        <div className="flex justify-between mb-12 px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500 ${
                  step >= s ? "bg-[#4F46E5] text-white" : "bg-white border border-[#E5E7EB] text-[#1A1A1A]/30"
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${step >= s ? "text-[#4F46E5]" : "text-[#1A1A1A]/20"}`}>
                {s === 1 ? "Identity" : s === 2 ? "Presence" : "Connect"}
              </span>
            </div>
          ))}
          <div className="absolute top-[calc(50%-20px)] left-0 w-full h-px bg-[#E5E7EB] -z-10" />
        </div>

        <AnimatePresence mode="wait" custom={step}>
          <motion.div
            key={step}
            custom={step}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[40px] p-12 shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-[#4F46E5]/10 rounded-2xl flex items-center justify-center mb-6">
                    <Store className="text-[#4F46E5] w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-bold font-syne">What's your shop called?</h2>
                  <p className="text-[#1A1A1A]/50 font-medium">This is what customers will see when they scan your code.</p>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Sharma Digital Print Works"
                    className="w-full bg-white border border-[#E5E7EB] rounded-2xl py-4 px-6 text-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                  />
                  <button
                    disabled={!shopName.trim()}
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-5 rounded-2xl text-[17px] font-semibold hover:bg-black active:scale-[0.98] transition-all disabled:opacity-20"
                  >
                    Continue <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-[#22C55E]/10 rounded-2xl flex items-center justify-center mb-6">
                    <MapPin className="text-[#22C55E] w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-bold font-syne">Where's your shop?</h2>
                  <p className="text-[#1A1A1A]/50 font-medium">Customers can find you when they're nearby.</p>
                </div>

                <div className="space-y-4">
                  {!location ? (
                    <button
                      onClick={handleGetLocation}
                      disabled={isLoading}
                      className="w-full flex flex-col items-center justify-center gap-3 bg-[#F9FAFB] border-2 border-dashed border-[#E5E7EB] py-12 rounded-[24px] hover:border-[#4F46E5] hover:bg-[#4F46E5]/5 transition-all group"
                    >
                      {isLoading ? <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" /> : <MapPin className="w-8 h-8 text-[#1A1A1A]/20 group-hover:text-[#4F46E5]" />}
                      <span className="font-semibold text-[#1A1A1A]/60 group-hover:text-[#4F46E5]">Detect Location</span>
                    </button>
                  ) : (
                    <div className="bg-[#F9FAFB] p-6 rounded-[24px] border border-[#E5E7EB]">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-[#22C55E] rounded-xl flex items-center justify-center shrink-0">
                          <Check className="text-white w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1A1A1A]">Location Set</p>
                          <p className="text-sm text-[#1A1A1A]/50 line-clamp-2 mt-1">{location.address}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-5 rounded-2xl text-[17px] font-semibold text-[#1A1A1A]/40 hover:bg-[#F9FAFB] transition-all"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleFinish}
                      disabled={isLoading}
                      className="flex-[2] flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-5 rounded-2xl text-[17px] font-semibold hover:bg-black active:scale-[0.98] transition-all disabled:opacity-20"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Setup"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 text-center">
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-14 h-14 bg-[#4F46E5] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#4F46E5]/20">
                    <QrCode className="text-white w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-bold font-syne">You're all set!</h2>
                  <p className="text-[#1A1A1A]/50 font-medium max-w-sm">Here's your permanent shop QR code. Display this at your counter.</p>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-[#E5E7EB] inline-block shadow-sm">
                  {/* We'll generate the QR server-side or here using a library */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/user?shop=${qrToken}`)}`}
                    alt="Shop QR Code"
                    className="w-56 h-56"
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <button
                    onClick={() => router.push("/admin/dashboard")}
                    className="w-full bg-[#4F46E5] text-white py-5 rounded-2xl text-[17px] font-semibold hover:bg-[#4338CA] active:scale-[0.98] transition-all shadow-lg shadow-[#4F46E5]/20"
                  >
                    Go to Dashboard
                  </button>
                  <p className="text-xs text-[#1A1A1A]/30">You can always find your QR code in your profile settings.</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
