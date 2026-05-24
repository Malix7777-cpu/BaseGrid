'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, Award, Calendar, Hash, Coins, Layers, Compass, CheckCircle2, Terminal } from 'lucide-react';
import { useBaseGrid } from '../hooks/useBaseGrid';

export default function WalletAnalyticsDashboard() {
  const { analytics, isConnected, playerStats } = useBaseGrid();

  if (!isConnected || !analytics) {
    return (
      <div className="w-full text-center py-16 bg-[#050816]/65 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-[0_0_30px_rgba(0,209,255,0.02)]">
        <Activity className="text-white/20 mx-auto animate-pulse mb-4" size={48} />
        <h3 className="text-white text-lg font-black uppercase tracking-wider">Telemetry Scanners Locked</h3>
        <p className="text-white/40 text-xs mt-2 max-w-sm mx-auto">Connect your Base wallet credentials to initiate an onchain forensic audit.</p>
      </div>
    );
  }

  // Rank badge styling helper
  const getBadgeStyles = (badge: string) => {
    switch (badge) {
      case 'Neon Legend':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.25)]';
      case 'Base Builder':
        return 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/30 shadow-[0_0_20px_rgba(0,209,255,0.25)]';
      case 'Cyber Agent':
        return 'bg-[#7B61FF]/10 text-[#7B61FF] border-[#7B61FF]/30 shadow-[0_0_20px_rgba(123,97,255,0.25)]';
      case 'Grid Cadet':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]';
      default:
        return 'bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/30 shadow-[0_0_20px_rgba(0,255,163,0.25)]';
    }
  };

  // Heatmap block color helper (using new premium palette)
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-white/5 border-white/5 text-white/20';
    if (count === 1) return 'bg-[#7B61FF]/20 border-[#7B61FF]/30 text-white/60';
    if (count === 2) return 'bg-[#00D1FF]/35 border-[#00D1FF]/50 text-white shadow-[0_0_12px_rgba(0,209,255,0.2)]';
    if (count === 3) return 'bg-[#00D1FF]/70 border-[#00D1FF] text-black font-black shadow-[0_0_16px_rgba(0,209,255,0.4)]';
    return 'bg-[#00FFA3] border-[#C2FFD6] text-black font-black shadow-[0_0_22px_rgba(0,255,163,0.6)]';
  };

  return (
    <div className="w-full flex flex-col gap-8">
      
      {/* 1. FORENSICS OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Wallet Score */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_0_25px_rgba(0,209,255,0.02)]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#00D1FF]/5 blur-[30px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-start text-white/50 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest">Base Wallet Score</span>
            <Compass size={16} className="text-[#00D1FF]" />
          </div>
          <div>
            <div className="text-3xl font-black text-white font-mono tracking-wide drop-shadow-[0_0_8px_rgba(0,209,255,0.2)]">
              {analytics.walletScore.toLocaleString()}
            </div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-1.5">
              Accumulated Onchain weight
            </div>
          </div>
        </div>

        {/* Telemetry Rank */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_0_25px_rgba(0,209,255,0.02)]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#7B61FF]/5 blur-[30px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-start text-white/50 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest">Ecosystem Title</span>
            <Award size={16} className="text-[#7B61FF]" />
          </div>
          <div>
            <span className={`inline-block px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${getBadgeStyles(analytics.rankingBadge)}`}>
              {analytics.rankingBadge}
            </span>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-2.5">
              Based on active days & logs
            </div>
          </div>
        </div>

        {/* ETH Treasury */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_0_25px_rgba(0,209,255,0.02)]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#00FFA3]/5 blur-[30px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-start text-white/50 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest">ETH Gas Reserve</span>
            <Coins size={16} className="text-[#00FFA3]" />
          </div>
          <div>
            <div className="text-3xl font-black text-white font-mono tracking-wide">
              {analytics.ethBalance} <span className="text-xs text-white/50 font-normal">ETH</span>
            </div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-1.5">
              Active ledger balance
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_0_25px_rgba(0,209,255,0.02)]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/5 blur-[30px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-start text-white/50 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest">XP Rating</span>
            <Layers size={16} className="text-pink-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-white font-mono tracking-wide">
              {playerStats?.xp} <span className="text-xs text-white/50 font-normal">XP</span>
            </div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-1.5">
              Gamer progression score
            </div>
          </div>
        </div>

      </div>

      {/* 2. HEATMAP MATRIX AND RECENT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Heatmap (Left Column) */}
        <div className="lg:col-span-8 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 flex flex-col justify-between gap-6 shadow-[0_0_35px_rgba(0,209,255,0.03)] relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D1FF]/10 to-transparent" />
          
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <Calendar size={16} className="text-[#00D1FF]" />
              Telemetry Matrix
            </h4>
            <p className="text-xs text-white/50 mb-6">Activity calendar scanning transactions over the past 14 days</p>
            
            {/* Heatmap boxes */}
            <div className="flex flex-wrap gap-2.5 mb-2 bg-white/[0.02] border border-white/5 p-4 rounded-2xl max-w-fit">
              {analytics.heatmap.map((cell) => {
                const dateObj = new Date(cell.date);
                const dayLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <div 
                    key={cell.date}
                    className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center font-mono cursor-pointer group relative transition-all duration-300 ${getHeatmapColor(cell.count)}`}
                  >
                    <span className="text-xs font-black">{cell.count}</span>
                    
                    {/* Floating Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 pointer-events-none group-hover:opacity-100 bg-[#050816] border border-white/10 text-[9px] font-mono text-white rounded-lg px-2.5 py-1.5 whitespace-nowrap z-30 shadow-[0_0_15px_rgba(0,209,255,0.2)] transition-opacity">
                      {dayLabel}: {cell.count} txs
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Telemetry breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-5">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-[9px] text-white/40 uppercase font-mono tracking-wider">Active Days</div>
              <div className="text-lg font-black text-white font-mono mt-1">{analytics.activeDays} Days</div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-[9px] text-white/40 uppercase font-mono tracking-wider">Total Actions</div>
              <div className="text-lg font-black text-[#00D1FF] font-mono mt-1">{analytics.totalTxCount} Txs</div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-[9px] text-white/40 uppercase font-mono tracking-wider">Token count</div>
              <div className="text-lg font-black text-[#7B61FF] font-mono mt-1">{analytics.tokenActivityCount}</div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-[9px] text-white/40 uppercase font-mono tracking-wider">Deployments</div>
              <div className="text-lg font-black text-[#00FFA3] font-mono mt-1">{analytics.contractsDeployedCount}</div>
            </div>
          </div>
        </div>

        {/* Transaction ledger telemetry logs (Right Column) */}
        <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col gap-5 shadow-[0_0_35px_rgba(0,209,255,0.03)] relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#7B61FF]/10 to-transparent" />
          
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <Hash size={16} className="text-[#7B61FF]" />
              Telemetry Logs
            </h4>
            <p className="text-xs text-white/50">Recent active transactions and triggers</p>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
            {analytics.recentTransactions.map((tx) => (
              <div 
                key={tx.hash}
                className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex flex-col gap-1">
                  <div className="font-black text-white uppercase tracking-wider">{tx.method}</div>
                  <div className="font-mono text-[9px] text-white/40 truncate max-w-[120px]">{tx.hash}</div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-bold font-mono uppercase tracking-wider ${
                    tx.status === 'success' 
                      ? 'bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/20 shadow-[0_0_8px_rgba(0,255,163,0.1)]' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {tx.status}
                  </span>
                  <span className="text-[9px] text-white/30 font-mono">Gas: {parseInt(tx.gasUsed).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
