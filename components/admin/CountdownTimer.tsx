"use client";

import { useEffect, useState } from "react";
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
      </div>
    </div>
  );
}
