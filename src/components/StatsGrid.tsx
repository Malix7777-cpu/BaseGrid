'use client';

import React from 'react';
import { useBaseGrid } from '../hooks/useBaseGrid';
import { Activity, Calendar, Clock, Cpu, DollarSign, Gift, Globe, Zap, CreditCard, ShoppingBag, Image, Shuffle } from 'lucide-react';

export default function StatsGrid() {
  const { analytics, playerStats } = useBaseGrid();
  const stats = [
    { label: 'Transactions', value: analytics?.txCount ?? 0, icon: <Activity size={16} /> },
    { label: 'Unique Days Active', value: analytics?.activeDays ?? 0, icon: <Calendar size={16} /> },
    { label: 'Longest Streak', value: analytics?.longestStreak ?? 0, icon: <Clock size={16} /> },
    { label: 'Current Streak', value: playerStats?.streak ?? 0, icon: <Zap size={16} className="text-[#00D1FF]" /> },
    { label: 'Activity Period', value: analytics?.period ?? '-', icon: <Globe size={16} /> },
    { label: 'Token Swaps', value: analytics?.tokenSwaps ?? 0, icon: <Shuffle size={16} /> },
    { label: 'Token Transfers', value: analytics?.tokenTransfers ?? 0, icon: <CreditCard size={16} /> },
    { label: 'NFT Transfers', value: analytics?.nftTransfers ?? 0, icon: <Image size={16} /> },
    { label: 'Contracts Deployed', value: analytics?.contractsDeployed ?? 0, icon: <Cpu size={16} /> },
    { label: 'ETH Balance', value: analytics?.ethBalance ?? 0, icon: <DollarSign size={16} /> },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((item) => (
        <div
          key={item.label}
          className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3 hover:bg-white/[0.04] transition-colors"
        >
          <div className="p-2 rounded-xl bg-[#00D1FF]/10 border border-[#00D1FF]/20 text-[#00D1FF] shadow-[0_0_10px_rgba(0,209,255,0.15)]">
            {item.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-white/50 font-mono uppercase tracking-widest">{item.label}</span>
            <span className="text-lg font-black text-white font-mono">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
