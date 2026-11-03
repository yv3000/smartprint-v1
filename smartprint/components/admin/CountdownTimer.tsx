"use client";

import { useEffect, useState } from "react";

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
    if (remaining > 60) return "#10B981"; // Emerald
    if (remaining > 30) return "#F59E0B"; // Amber
    return "#EF4444"; // Rose
  };

  const getBgColor = () => {
    if (remaining > 60) return "rgba(16, 185, 129, 0.08)";
    if (remaining > 30) return "rgba(245, 158, 11, 0.08)";
    return "rgba(239, 68, 68, 0.08)";
  };

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative w-28 h-28">
        {/* Background circle */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill={getBgColor()}
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-neutral-200/80 dark:text-neutral-800"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="progress-ring-circle"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold font-mono tabular-nums leading-none"
            style={{ color: getColor() }}
          >
            {remaining}
          </span>
          <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider mt-1">
            seconds
          </span>
        </div>
      </div>

      {/* Status text */}
      <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 text-center">
        {remaining > 60
          ? "Ephemeral session active"
          : remaining > 30
          ? "Countdown accelerating..."
          : remaining > 0
          ? "Expiring shortly!"
          : "Buffers purged"}
      </div>
    </div>
  );
}
