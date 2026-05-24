'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ShieldCheck, Award, Flame, User, Compass, Terminal } from 'lucide-react';
import { useBaseGrid } from '../hooks/useBaseGrid';

export default function DashboardStats() {
  const { playerStats, isConnected, isBaseNetwork } = useBaseGrid();

  if (!isConnected || !playerStats) return null;

  // Determine Badge Rank Title and Glowing classes
  const xp = playerStats.xp;
  let badgeTitle = 'Base Recruit';
  let badgeStyles = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 glow-emerald';
  
  if (xp > 2000) {
    badgeTitle = 'Neon Legend';
    badgeStyles = 'bg-pink-500/10 border-pink-500/20 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]';
  } else if (xp > 1500) {
    badgeTitle = 'Base Builder';
    badgeStyles = 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(0,82,255,0.2)]';
  } else if (xp > 1000) {
    badgeTitle = 'Cyber Agent';
    badgeStyles = 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(185,0,255,0.2)]';
  } else if (xp > 500) {
    badgeTitle = 'Grid Cadet';
    badgeStyles = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(0,209,255,0.2)]';
  }

  return (
    <div className="w-full bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_30px_rgba(0,209,255,0.03)] relative overflow-hidden">
      
      {/* Visual top border highlights */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D1FF]/20 to-transparent" />

      {/* User Information */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00D1FF]/10 border border-[#00D1FF]/20 flex items-center justify-center text-[#00D1FF] shrink-0 shadow-[0_0_15px_rgba(0,209,255,0.1)]">
          <User size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              {playerStats.username || 'Anonymous'}
            </h2>
            {isBaseNetwork && (
              <div className="flex items-center gap-1 bg-[#00FFA3]/10 border border-[#00FFA3]/20 text-[#00FFA3] text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,255,163,0.1)] animate-pulse">
                <ShieldCheck size={10} />
                Base Active
              </div>
            )}
          </div>
          <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase mt-0.5">
            {playerStats.wallet.slice(0, 6)}...{playerStats.wallet.slice(-4)}
          </p>
        </div>
      </div>

      {/* Stats details section */}
      <div className="flex flex-wrap items-center gap-6 md:gap-10">
        
        {/* Badge rank */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-white/40 font-mono uppercase tracking-wider">Telemetry Rank</span>
          <span className={`inline-block px-3 py-1 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider mt-0.5 ${badgeStyles}`}>
            {badgeTitle}
          </span>
        </div>

        {/* High Score */}
        <div>
          <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">Highest Score</div>
          <div className="text-lg font-black text-[#00D1FF] font-mono leading-none mt-1 drop-shadow-[0_0_8px_rgba(0,209,255,0.3)]">
            {playerStats.highestScore.toLocaleString()}
          </div>
        </div>

        {/* XP */}
        <div>
          <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">XP Rating</div>
          <div className="text-lg font-black text-white font-mono leading-none mt-1">
            {playerStats.xp} <span className="text-xs text-white/40 font-normal">XP</span>
          </div>
        </div>

        {/* Streaks */}
        <div>
          <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">Active Streak</div>
          <div className="flex items-center gap-1 text-lg font-black text-orange-400 font-mono leading-none mt-1">
            <Flame size={16} className="animate-pulse" />
            {playerStats.streak}d
          </div>
        </div>

      </div>

      {/* ConnectButton */}
      <div className="shrink-0 flex justify-end">
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </div>

    </div>
  );
}
