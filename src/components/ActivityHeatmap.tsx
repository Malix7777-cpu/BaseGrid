import React from 'react';
import { Tooltip } from 'react-tooltip';

// Simple heatmap placeholder with 7x7 grid (days of week x weeks)
export default function ActivityHeatmap() {
  const weeks = 7;
  const days = 7;
  const generateLevel = (i: number) => {
    const levels = ['bg-[#0A0F20]', 'bg-[#0D1125]', 'bg-[#122030]', 'bg-[#183044]', 'bg-[#1E3C5E]'];
    return levels[i % levels.length];
  };
  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,209,255,0.03)]">
      <h2 className="text-lg font-semibold text-white mb-4">Activity Heatmap</h2>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: weeks * days }).map((_, idx) => (
          <div
            key={idx}
            className={`${generateLevel(idx)} w-4 h-4 rounded-sm transition-colors hover:opacity-80`}
            title={`Day ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
