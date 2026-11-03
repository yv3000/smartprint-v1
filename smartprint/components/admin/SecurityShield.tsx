"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ShieldAlert } from "lucide-react";

interface SecurityShieldProps {
  children: React.ReactNode;
}

/**
 * SecurityShield — Wraps admin content with browser-level security protections.
 * 
 * Implements the best possible deterrents achievable in a browser:
 * 1. Right-click disabled (contextmenu prevention)
 * 2. Text selection disabled (CSS user-select: none)
 * 3. Focus/blur detection — heavy blur when page loses focus
 * 4. Copy prevention (copy event prevention)
 * 5. Drag prevention (dragstart prevention)
 * 6. DevTools detection (best effort — window size diff)
 * 7. Keyboard shortcut blocking (Ctrl+S, Ctrl+P, PrintScreen, etc.)
 * 
 * NOTE: Print dialog does NOT trigger screen protection.
 */
export default function SecurityShield({ children }: SecurityShieldProps) {
  const [isBlurred, setIsBlurred] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const isPrintingRef = useRef(false);

  // Right-click prevention
  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Copy prevention
  const handleCopy = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Drag prevention
  const handleDragStart = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Focus/blur — blur document when page loses focus (screen recording deterrent)
  // But NOT when print dialog is open
  const handleBlur = useCallback(() => {
    if (!isPrintingRef.current) {
      setIsBlurred(true);
    }
  }, []);

  const handleFocus = useCallback(() => {
    setIsBlurred(false);
  }, []);

  // Track print dialog lifecycle
  const handleBeforePrint = useCallback(() => {
    isPrintingRef.current = true;
    setIsBlurred(false);
  }, []);

  const handleAfterPrint = useCallback(() => {
    isPrintingRef.current = false;
    setIsBlurred(false);
  }, []);

  // Keyboard shortcut blocking
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Block Ctrl+S, Ctrl+U, Ctrl+Shift+I, F12
    // Allow Ctrl+P since we handle printing ourselves
    if (
      (e.ctrlKey && (e.key === "s" || e.key === "u")) ||
      (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
      e.key === "F12" ||
      e.key === "PrintScreen"
    ) {
      e.preventDefault();
    }
  }, []);

  // DevTools detection (best effort)
  const checkDevTools = useCallback(() => {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    setDevToolsOpen(widthThreshold || heightThreshold);
  }, []);

  useEffect(() => {
    // Attach all event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    // DevTools check interval
    const devToolsInterval = setInterval(checkDevTools, 1000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      clearInterval(devToolsInterval);
    };
  }, [handleContextMenu, handleCopy, handleDragStart, handleKeyDown, handleBlur, handleFocus, handleBeforePrint, handleAfterPrint, checkDevTools]);

  const showProtection = isBlurred || devToolsOpen;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .secure-content:not(.printing-active) { display: none !important; }
        }
        .secure-content {
          -webkit-user-select: none;
          user-select: none;
          isolation: isolate;
        }
      `}} />
      <div className={`secure-content relative ${isPrintingRef.current ? 'printing-active' : ''}`}>
        {/* Main content — blur when protection is active */}
        <div
          className={`transition-all duration-300 ${
            showProtection ? "blur-protection" : ""
          }`}
          style={{
            pointerEvents: showProtection ? "none" : "auto",
          }}
        >
          {children}
        </div>

        {/* Screen protection overlay */}
        {showProtection && (
          <div className="screen-protection-overlay animate-fade-in">
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-4 text-neutral-900 dark:text-white shadow-sm">
                <ShieldAlert className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white mb-1.5">
                Screen Protection Engaged
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                {devToolsOpen
                  ? "Developer tools detected. Please close DevTools to access decrypted print documents."
                  : "Window out of focus. Click back into this window to resume viewing documents."}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
