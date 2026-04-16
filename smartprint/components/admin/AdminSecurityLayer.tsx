"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSecurityLayer({ children }: { children: React.ReactNode }) {
  const [isBlurred, setIsBlurred] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    // 1. Disable Right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Disable Keyboard Shortcuts (Ctrl+S, Ctrl+P, Ctrl+U, F12)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'c')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        return false;
      }
    };

    // 3. Disable Copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // 4. Detect Window Blur (Screen Protection)
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    // 5. DevTools Detection (Simple check based on window dimensions)
    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        setDevToolsOpen(true);
      } else {
        setDevToolsOpen(false);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('copy', handleCopy);
    
    const interval = setInterval(detectDevTools, 1000);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('copy', handleCopy);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative min-h-screen select-none overflow-hidden">
      {/* Main Content */}
      <div className={isBlurred || devToolsOpen ? 'blur-3xl grayscale pointer-events-none' : ''}>
        {children}
      </div>

      {/* Screen Protected Overlay */}
      <AnimatePresence>
        {isBlurred && !devToolsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center text-white"
          >
            <ShieldAlert className="w-16 h-16 mb-4 text-[#4F46E5]" />
            <h2 className="text-3xl font-bold font-syne">Screen Protected</h2>
            <p className="text-white/60 font-medium">Please return to the window to view the document.</p>
          </motion.div>
        )}

        {/* DevTools Warning */}
        {devToolsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#1A1A1A] flex flex-col items-center justify-center text-white p-10 text-center"
          >
            <Terminal className="w-16 h-16 mb-6 text-[#EF4444]" />
            <h2 className="text-3xl font-bold font-syne mb-2">Security Breach Detected</h2>
            <p className="text-white/40 max-w-md font-medium">Developer tools are active. For the security of our users, we have hidden all sensitive document data.</p>
            <button 
               onClick={() => window.location.reload()}
               className="mt-8 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-all"
            >
              Close DevTools & Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        * {
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
        }
      `}</style>
    </div>
  );
}
