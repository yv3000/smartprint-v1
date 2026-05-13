"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Minimal, Apple-style theme toggle. Light = sun, Dark = moon.
 * Uses a single accessible button with a short crossfade.
 */
export default function ThemeToggle({
  className = "",
  size = "md",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`${dim} relative inline-flex items-center justify-center rounded-xl border border-[#E5E7EB] bg-white/70 backdrop-blur text-[#1A1A1A] hover:bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 ${className}`}
    >
      <Sun
        className={`w-4 h-4 transition-all duration-300 ${
          isDark ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
        } absolute`}
      />
      <Moon
        className={`w-4 h-4 transition-all duration-300 ${
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
        } absolute`}
      />
    </button>
  );
}
