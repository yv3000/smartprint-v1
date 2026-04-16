"use client";

import { useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Sparkles, AlertCircle } from "lucide-react";

function AuthForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F7F4]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-[#1A1A1A] rounded-[22px] flex items-center justify-center mx-auto shadow-xl"
          >
            <Shield className="text-white w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl font-bold tracking-tight text-[#1A1A1A] font-syne"
          >
            SmartPrint Admin
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#1A1A1A]/40 font-medium"
          >
            Secure access for print shop owners
          </motion.p>
        </div>

        {reason === "session_expired" && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3 text-orange-800"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-sm font-medium">Your session expired due to inactivity (3-day limit). Please sign in again.</div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
          >
            <AlertCircle className="w-5 h-5" />
            <div className="text-sm font-medium">Authentication failed. Please try again.</div>
          </motion.div>
        )}

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[32px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.03)]"
        >
          <button
            onClick={() => signIn("google", { callbackUrl: "/admin/dashboard" })}
            className="group w-full flex items-center justify-center gap-3 bg-[#1A1A1A] text-white py-4 px-6 rounded-2xl font-semibold text-[17px] hover:bg-black active:scale-[0.98] transition-all shadow-lg shadow-black/5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          <div className="mt-8 pt-8 border-t border-[#E5E7EB] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-xs font-bold text-[#1A1A1A]/30 uppercase tracking-[0.2em]">Privacy Focused</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
