'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ShieldCheck } from 'lucide-react';
import { useBaseGrid } from '../hooks/useBaseGrid';

export default function BaseHeader() {
  const { isConnected, isBaseNetwork, playerStats } = useBaseGrid();

  const wallet = playerStats?.wallet ?? '';
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : '';

  return (
    <header className="flex items-center justify-between bg-[#050816] px-6 py-5 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(0,209,255,0.04)]">
      <div className="flex flex-col">
        <h1 className="text-2xl font-black text-white tracking-wider uppercase">Base Wallet Stats</h1>
        <p className="text-white/60 text-sm max-w-md">
          Real‑time on‑chain analytics for your Base wallet – transactions, activity heatmap, token swaps and more.
        </p>
      </div>
      <div className="flex items-center gap-4">
        {isConnected && (
          <div className="flex items-center gap-1.5 bg-[#00FFA3]/10 border border-[#00FFA3]/20 text-[#00FFA3] text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-[0_0_10px_rgba(0,255,163,0.1)]">
            <ShieldCheck size={12} />
            {shortWallet}
          </div>
        )}
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </div>
    </header>
  );
}
