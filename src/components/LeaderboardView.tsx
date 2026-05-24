'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Flame, Trophy, Calendar, Compass, Shield } from 'lucide-react';
import { useBaseGrid } from '../hooks/useBaseGrid';

export default function LeaderboardView() {
  const { leaderboards, playerStats } = useBaseGrid();
  const [activeTab, setActiveTab] = useState<'global' | 'daily' | 'weekly'>('global');

  const currentLeaderboard = leaderboards[activeTab];

  // Helper for rank trophies & custom shadows
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={18} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.7)]" />;
      case 2:
        return <Trophy size={18} className="text-slate-200 drop-shadow-[0_0_8px_rgba(241,245,249,0.7)]" />;
      case 3:
        return <Trophy size={18} className="text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.7)]" />;
      default:
        return <span className="text-white/40 text-xs font-mono font-black">#{rank}</span>;
    }
  };

  // Row glows based on rank
  const getRankRowStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/[0.03] border-yellow-500/25 shadow-[inset_0_0_20px_rgba(234,179,8,0.04)]';
      case 2:
        return 'bg-slate-300/[0.03] border-slate-300/25 shadow-[inset_0_0_20px_rgba(203,213,225,0.04)]';
      case 3:
        return 'bg-amber-600/[0.03] border-amber-600/25 shadow-[inset_0_0_20px_rgba(217,119,6,0.04)]';
      default:
        return 'bg-white/[0.01] border-white/5';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,209,255,0.03)]">
      
      {/* Visual background lights */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#00D1FF]/5 blur-[70px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#7B61FF]/5 blur-[70px] rounded-full pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Award size={22} className="text-[#00D1FF]" />
            Telemetry Standings
          </h3>
          <p className="text-white/40 text-xs mt-0.5">Global arcade records and social streak leaders</p>
        </div>

        {/* Custom Tab Switcher */}
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl max-w-fit shadow-[0_0_15px_rgba(255,255,255,0.02)]">
          {(['global', 'daily', 'weekly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === tab 
                  ? 'bg-[#00D1FF] text-black shadow-[0_0_15px_rgba(0,209,255,0.35)]' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'global' ? 'Global' : tab === 'daily' ? 'Daily' : 'Weekly'}
            </button>
          ))}
        </div>
      </div>

      {/* Standings List */}
      <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1.5 scrollbar-thin">
        {currentLeaderboard.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/5 rounded-2xl text-white/30 font-mono text-xs uppercase tracking-wider">
            No telemetry records cataloged yet
          </div>
        ) : (
          currentLeaderboard.map((entry) => {
            const isSelf = playerStats?.registered && playerStats.username === entry.username;
            return (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${getRankRowStyles(entry.rank)} ${
                  isSelf ? 'border-[#00D1FF]/50 bg-[#00D1FF]/5 shadow-[0_0_20px_rgba(0,209,255,0.06)]' : ''
                }`}
              >
                
                {/* Left (Username & Address) */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center relative shrink-0">
                    {getRankBadge(entry.rank)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white tracking-wide">{entry.username}</span>
                      {isSelf && (
                        <span className="bg-[#00D1FF]/10 border border-[#00D1FF]/30 text-[#00D1FF] text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-white/30 font-mono tracking-widest uppercase mt-0.5">
                      {entry.wallet}
                    </span>
                  </div>
                </div>

                {/* Right (Stats & Streak) */}
                <div className="flex flex-wrap items-center justify-between md:justify-end gap-5">
                  
                  {/* Streak Flame */}
                  <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono shadow-[0_0_12px_rgba(249,115,22,0.1)]">
                    <Flame size={12} className="animate-pulse" />
                    Streak: {entry.streak}d
                  </div>

                  {/* Rank Title badge */}
                  <div className="text-right">
                    <div className="text-[8px] text-white/40 font-mono uppercase tracking-wider">Telemetry Rank</div>
                    <div className="text-[10px] font-black text-[#00FFA3] uppercase tracking-wide mt-0.5">
                      {entry.badge}
                    </div>
                  </div>

                  {/* High Scores */}
                  <div className="flex items-center gap-5 min-w-[150px] justify-end">
                    <div className="text-right">
                      <div className="text-[8px] text-white/40 font-mono uppercase tracking-wider">XP Rating</div>
                      <div className="text-xs font-black text-white font-mono mt-0.5">
                        {entry.xp} <span className="text-[9px] text-white/40 font-normal">XP</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[8px] text-white/40 font-mono uppercase tracking-wider">High Score</div>
                      <div className="text-xs font-black text-[#00D1FF] font-mono mt-0.5 drop-shadow-[0_0_8px_rgba(0,209,255,0.3)]">
                        {entry.score.toLocaleString()}
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>
            );
          })
        )}
      </div>

    </div>
  );
}
