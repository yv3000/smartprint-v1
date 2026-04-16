"use client";

import { useEffect, useState } from "react";
<<<<<<< HEAD

interface CountdownTimerProps {
  /** Total seconds for the countdown (typically 100) */
  totalSeconds: number;
  /** Seconds remaining when the component mounts */
  initialRemaining: number;
  /** Called when the timer reaches 0 */
  onExpired: () => void;
}

export default function CountdownTimer({
  totalSeconds,
  initialRemaining,
  onExpired,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    if (remaining <= 0) {
      onExpired();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onExpired();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onExpired]);

  // Circular progress calculation
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on remaining time
  const getColor = () => {
    if (remaining > 60) return "#34C759"; // Green
    if (remaining > 30) return "#FF9500"; // Yellow/Orange
    return "#FF3B30"; // Red
  };

  const getBgColor = () => {
    if (remaining > 60) return "rgba(52, 199, 89, 0.08)";
    if (remaining > 30) return "rgba(255, 149, 0, 0.08)";
    return "rgba(255, 59, 48, 0.08)";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        {/* Background circle */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill={getBgColor()}
            stroke="#E5E5E7"
            strokeWidth="3"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="progress-ring-circle"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-semibold tabular-nums"
            style={{ color: getColor() }}
          >
            {remaining}
          </span>
          <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">
            seconds
          </span>
        </div>
      </div>

      {/* Status text */}
      <div className="text-xs text-secondary text-center">
        {remaining > 60
          ? "File will be auto-deleted"
          : remaining > 30
          ? "Running out of time..."
          : remaining > 0
          ? "Almost expired!"
          : "File deleted"}
=======
import { motion } from "framer-motion";

export default function CountdownTimer({ 
  openedAt, 
  onExpire 
}: { 
  openedAt: string; 
  onExpire: () => void 
}) {
  const [timeLeft, setTimeLeft] = useState(100);

  useEffect(() => {
    const calculate = () => {
      const start = new Date(openedAt).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, 100 - diff);
      setTimeLeft(remaining);
      if (remaining === 0) onExpire();
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [openedAt, onExpire]);

  const percentage = (timeLeft / 100) * 100;
  const strokeDasharray = 2 * Math.PI * 45; // radius is 45
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  const color = timeLeft > 60 ? "#22C55E" : timeLeft > 20 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90">
        <circle 
          cx="64" cy="64" r="45" 
          fill="none" stroke="#E5E7EB" strokeWidth="8" 
        />
        <motion.circle 
          cx="64" cy="64" r="45" 
          fill="none" 
          stroke={color} 
          strokeWidth="8" 
          strokeLinecap="round"
          initial={{ strokeDashoffset: strokeDasharray }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5 }}
          style={{ strokeDasharray }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold font-syne" style={{ color }}>{timeLeft}</span>
        <span className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-widest">Seconds</span>
>>>>>>> 2b61e15460d9697c2dadb6cdab55e095b51f228c
      </div>
    </div>
  );
}
