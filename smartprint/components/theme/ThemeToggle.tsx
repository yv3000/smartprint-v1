"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Apple-style theme toggle. Circular surface button with sun/moon
 * crossfade. Reads CSS tokens so it adapts inside both `.user-portal`
 * (light/dark) and the admin portal automatically.
 */
export default function ThemeToggle({
  className = "",
  size = "md",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const dim = size === "sm" ? 32 : 36;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-200 ease-out hover:scale-[1.04] active:scale-[0.96] ${className}`}
      style={{
        width: dim,
        height: dim,
        background: "var(--up-surface, rgba(255,255,255,0.7))",
        border: "0.5px solid var(--up-border-strong, rgba(0,0,0,0.15))",
        color: "var(--up-text, #1D1D1F)",
        boxShadow:
          "var(--up-shadow-rest, 0 2px 8px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06))",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
      }}
    >
      <Sun
        size={size === "sm" ? 14 : 16}
        strokeWidth={1.8}
        className="absolute transition-all duration-300 ease-out"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark
            ? "rotate(-90deg) scale(0.6)"
            : "rotate(0deg) scale(1)",
        }}
      />
      <Moon
        size={size === "sm" ? 14 : 16}
        strokeWidth={1.8}
        className="absolute transition-all duration-300 ease-out"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark
            ? "rotate(0deg) scale(1)"
            : "rotate(90deg) scale(0.6)",
        }}
      />
    </button>
  );
}
