"use client";

import { useEffect, Suspense, useState, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles, AlertCircle, ExternalLink, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";

const APP_URL = "https://smartprint-tau.vercel.app";

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");
  const mode = searchParams.get("mode");

  const [waitingForBrowser, setWaitingForBrowser] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  // Detect Electron environment
  useEffect(() => {
    const electronDetected =
      typeof navigator !== "undefined" &&
      (navigator.userAgent.includes("Electron") ||
        navigator.userAgent.includes("SmartPrint"));
    setIsElectron(electronDetected);
  }, []);

  // If mode=electron (opened in system browser FROM Electron), auto-trigger sign in
  // This happens when Electron opens: smartprint-tau.vercel.app/admin/auth?mode=electron
  // in the system browser. The system browser loads this page and auto-starts OAuth.
  useEffect(() => {
    if (mode === "electron" && status === "unauthenticated") {
      signIn("google", {
        callbackUrl: "https://smartprint-tau.vercel.app/admin/auth-bridge",
      });
    }
  }, [mode, status]);

  // If already authenticated and in system browser with mode=electron,
  // redirect to auth-bridge immediately
  useEffect(() => {
    if (mode === "electron" && status === "authenticated") {
      router.push("/admin/auth-bridge");
      return;
    }
    // Normal browser: go to dashboard if authenticated
    if (status === "authenticated" && !mode) {
      router.push("/admin/dashboard");
    }
  }, [status, router, mode]);

  const handleSignIn = useCallback(async () => {
    if (isElectron) {
      // ================================================================
      // ELECTRON FLOW:
      // Instead of calling signIn() inside the Electron WebView (which
      // would navigate to Google OAuth inside the WebView — blocked by
      // Google), we open the AUTH PAGE in the system browser with
      // ?mode=electron. The system browser loads this page, sees
      // mode=electron, and auto-triggers signIn() there.
      //
      // Electron's setWindowOpenHandler intercepts window.open and
      // uses shell.openExternal to open in Chrome/Edge/Firefox.
      //
      // After OAuth completes in the browser:
      //   → /admin/electron-callback reads the session cookie
      //   → Redirects to smartprint://auth?token=SESSION_TOKEN
      //   → Electron catches the protocol URL
      //   → Sets cookie in its own session store
      //   → Loads the dashboard
      // ================================================================
      setWaitingForBrowser(true);
      // This window.open call will be intercepted by Electron's
      // setWindowOpenHandler → shell.openExternal
      window.open(`${APP_URL}/admin/auth?mode=electron`, "_blank");
    } else {
      // Normal browser: standard NextAuth flow
      await signIn("google", {
        callbackUrl: `${window.location.origin}/admin/dashboard`,
        redirect: true,
      });
    }
  }, [isElectron]);

  // When in Electron waiting state, poll to check if token was received
  // (the protocol callback will trigger a page reload via main.js)
  // This is a fallback — normally Electron catches smartprint:// and
  // navigates to dashboard directly.

  const handleCheckLogin = useCallback(() => {
    // Manually reload to check if session now exists
    // (in case protocol callback set the cookie)
    window.location.href = `${APP_URL}/admin/dashboard`;
  }, []);

  const handleRetry = useCallback(() => {
    setWaitingForBrowser(false);
  }, []);

  // Poll for session when waiting for browser
  useEffect(() => {
    if (!waitingForBrowser) return;
    
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-cache'
        });
        const data = await res.json();
        if (data?.user?.email) {
          window.location.href = '/admin/dashboard';
        }
      } catch (e) {
        // Ignore network errors while polling
      }
    };
    
    const interval = setInterval(checkSession, 4000);
    checkSession();
    return () => clearInterval(interval);
  }, [waitingForBrowser]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]/30" />
      </div>
    );
  }

  // If opened in system browser with mode=electron, show a minimal "redirecting" screen
  if (mode === "electron" && !isElectron) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F7F4]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5] mx-auto" />
          <p className="text-lg font-semibold text-[#1A1A1A]">
            Redirecting to Google Sign-In...
          </p>
          <p className="text-sm text-[#1A1A1A]/40">
            Please wait while we connect to Google.
          </p>
        </div>
      </div>
    );
  }

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
          <AnimatePresence mode="wait">
            {!waitingForBrowser ? (
              <motion.div key="signin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  onClick={handleSignIn}
                  id="google-signin-button"
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
                  {isElectron && <ExternalLink className="w-4 h-4 opacity-50" />}
                </button>
                {isElectron && (
                  <p className="mt-3 text-xs text-center text-[#1A1A1A]/30">
                    Opens in your system browser for secure sign-in
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-5">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-[#1A1A1A]/10 border-t-[#4F46E5] animate-spin" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#1A1A1A]">
                    Sign-in opened in your browser
                  </p>
                  <p className="text-sm text-[#1A1A1A]/40 mt-1">
                    Complete your Google sign-in in the browser window that opened.
                  </p>
                  <p className="text-xs text-[#4F46E5] font-medium mt-4 animate-pulse">
                    Checking for sign-in...
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleCheckLogin}
                    id="check-login-button"
                    className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] py-3 px-4 rounded-xl transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    I&apos;ve Signed In →
                  </button>
                  <button
                    onClick={handleRetry}
                    id="retry-signin-button"
                    className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-[#1A1A1A]/50 hover:text-[#1A1A1A] py-2 transition-colors"
                  >
                    ← Start over
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
