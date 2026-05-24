'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowUpRight } from 'lucide-react';
import { useBaseGrid } from '../hooks/useBaseGrid';

export default function ScoreCard() {
  const { analytics } = useBaseGrid();
  const score = analytics?.onchainScore ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col gap-3 shadow-[0_0_30px_rgba(0,209,255,0.04)]"
    >
      <div className="flex items-center gap-2 text-white/50 text-sm uppercase font-mono">
        <Activity size={16} />
        <span>Onchain Score</span>
      </div>
      <div className="text-3xl font-black text-[#00D1FF] font-mono tracking-wider drop-shadow-[0_0_8px_rgba(0,209,255,0.3)]">
        {score.toLocaleString()}
      </div>
      <div className="text-xs text-white/40">Aggregated telemetry rating based on activity, swaps and contracts.</div>
    </motion.div>
  );
}
