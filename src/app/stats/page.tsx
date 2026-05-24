'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, Activity, Flame, Rocket, Award, Zap, Terminal, ExternalLink, 
  Coins, Compass, Layers, Search, RefreshCw, AlertCircle, Calendar, 
  Clock, Cpu, DollarSign, Gift, Globe, CreditCard, Image as ImageIcon, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBaseGrid } from '../../hooks/useBaseGrid';
import { useSearchParams, useRouter } from 'next/navigation';
import DeployPanel from '../../components/DeployPanel';
import ArcadePanel from '../../components/ArcadePanel';
import GMGNPanel from '../../components/GMGNPanel';

function isValidAddress(addr: string): boolean {
  return !!addr && addr.startsWith('0x') && addr.length === 42;
}

async function safeFetch(url: string) {
  const res = await fetch(url);
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid API response — check API key');
  }
  const data = await res.json();
  if (data.status === '0' && data.message === 'NOTOK') {
    throw new Error(data.result || 'BaseScan API Error');
  }
  return data;
}

// ── Placeholder panels ──────────────────────────────────────────────────────

function DailyStreakPanel() {
  return <GMGNPanel />;
}

function LeaderboardPanel() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl flex items-center justify-center">
        <Award size={40} className="text-yellow-400" />
      </div>
      <h2 className="text-3xl font-black uppercase tracking-widest text-white">Leaderboard</h2>
      <p className="text-white/40 text-sm max-w-md">Top onchain performers on Base Mainnet. Rankings coming soon.</p>
    </div>
  );
}

function StatsPageInner() {
  const { address } = useAccount();
  const { isBaseNetwork, switchNetwork } = useBaseGrid();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab') || 'wallet-stats';

  const [inputAddress, setInputAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'txs' | 'tokens' | 'nfts'>('txs');

  useEffect(() => {
    if (address) {
      setInputAddress(address);
      fetchStats(address);
    }
  }, [address]);

  async function fetchStats(addr: string) {
    if (!isValidAddress(addr)) {
      setError('Enter valid 42-char 0x address');
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    setTimeout(() => setLoadingStep(1), 600);
    setTimeout(() => setLoadingStep(2), 1400);
    setTimeout(() => setLoadingStep(3), 2200);
    setError('');
    setStats(null);
    try {
      const res = await fetch(`/api/stats?address=${addr}`);
      const { txData, tokenData, balData, nftData } = await res.json();

      const txs = txData.result || [];
      const tokenTxs = tokenData.result || [];
      const ethBalance = (parseInt(balData.result) / 1e18).toFixed(4);
      const nftTxs: any[] = nftData.result || [];

      if (txs.length === 0 && tokenTxs.length === 0) {
        setStats({ isEmpty: true, address: addr, ethBalance });
        setLoading(false);
        return;
      }

      const days = [...new Set(txs.map((tx: any) =>
        new Date(tx.timeStamp * 1000).toDateString()
      ))];
      const uniqueDays = days.length;

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 1;
      const sortedDays = days.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      for (let i = 1; i < sortedDays.length; i++) {
        const diff = (new Date(sortedDays[i]).getTime() - new Date(sortedDays[i - 1]).getTime()) / 86400000;
        if (Math.round(diff) === 1) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
        else if (Math.round(diff) > 1) { tempStreak = 1; }
      }
      if (uniqueDays > 0 && longestStreak === 0) longestStreak = 1;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (days.includes(today) || days.includes(yesterday)) currentStreak = tempStreak;

      const totalTx = txs.length;
      const contractsDeployed = txs.filter((tx: any) => tx.to === '').length;
      const tokenTransfers = tokenTxs.filter((tx: any) => tx.from.toLowerCase() === addr.toLowerCase()).length;
      const tokenSwaps = tokenTxs.filter((tx: any) => tx.from.toLowerCase() === addr.toLowerCase() && tx.to.toLowerCase() !== addr.toLowerCase()).length;

      const tokenBalances: { [key: string]: any } = {};
      tokenTxs.forEach((tx: any) => {
        const symbol = tx.tokenSymbol || 'Token';
        const name = tx.tokenName || 'Unknown Token';
        const addressKey = tx.contractAddress.toLowerCase();
        const dec = parseInt(tx.tokenDecimal || '18');
        const val = parseFloat(tx.value) / Math.pow(10, dec);
        if (!tokenBalances[addressKey]) tokenBalances[addressKey] = { name, symbol, balance: 0, contract: tx.contractAddress };
        if (tx.to.toLowerCase() === addr.toLowerCase()) tokenBalances[addressKey].balance += val;
        else if (tx.from.toLowerCase() === addr.toLowerCase()) tokenBalances[addressKey].balance -= val;
      });

      const tokenList = Object.values(tokenBalances)
        .filter((t: any) => t.balance > 0.00001)
        .map((t: any) => ({ name: t.name, symbol: t.symbol, balance: t.balance.toFixed(4), contract: t.contract }));

      const nftsMap: { [key: string]: any } = {};
      nftTxs.forEach((tx: any) => {
        const key = `${tx.contractAddress}-${tx.tokenID}`;
        const isIncoming = tx.to.toLowerCase() === addr.toLowerCase();
        if (isIncoming) nftsMap[key] = { name: tx.tokenName || 'Collectible', symbol: tx.tokenSymbol || 'NFT', tokenId: tx.tokenID, contract: tx.contractAddress };
        else delete nftsMap[key];
      });
      const nftList = Object.values(nftsMap);

      // Base.fun style score formula (0-100)
      const txWeight = Math.min(30, totalTx) * 1.5;
      const dateWeight = Math.min(20, uniqueDays) * 1.5;
      const volWeight = Math.min(10, parseFloat(ethBalance)) * 2.0;
      const deployWeight = Math.min(5, contractsDeployed) * 2.0;
      const tokenWeight = Math.min(5, Object.keys(tokenBalances).length) * 2.0;
      const score = Math.min(100, Math.round(txWeight + dateWeight + volWeight + deployWeight + tokenWeight));
      const rank = Math.max(1, Math.round(100 - score * 0.9));

      setStats({ isEmpty: false, score, rank, totalTx, uniqueDays, longestStreak, currentStreak, contractsDeployed, tokenTransfers, tokenSwaps, nftTransfers: nftTxs.length, ethBalance, txList: txs.slice(-10).reverse(), tokenList, nftList, rawTxs: txs });
    } catch (e: any) {
      setError(e.message || 'API request failed — retry');
    }
    setLoading(false);
  }

  function RenderHeatmap({ txs }: { txs: any[] }) {
    const now = new Date();
    const daysArray = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      daysArray.push(d);
    }
    const txCounts: { [key: string]: number } = {};
    txs.forEach((tx) => {
      const dateStr = new Date(tx.timeStamp * 1000).toDateString();
      txCounts[dateStr] = (txCounts[dateStr] || 0) + 1;
    });
    const getIntensityClass = (count: number) => {
      if (!count || count === 0) return 'bg-white/5 border-white/5 text-white/20';
      if (count === 1) return 'bg-[#00D4FF]/25 border-[#00D4FF]/30 text-white/80';
      if (count <= 3) return 'bg-[#00D4FF]/50 border-[#00D4FF]/60 text-white shadow-[0_0_8px_rgba(0,212,255,0.2)]';
      return 'bg-[#00D4FF] border-[#00FFA3] text-black font-bold shadow-[0_0_12px_rgba(0,212,255,0.6)]';
    };
    return (
      <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,209,255,0.03)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00D4FF]/25 to-transparent" />
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-[#00D4FF]" />
              Telemetry Heatmap
            </h3>
            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Base activity density index (last 90 days)</p>
          </div>
          <span className="text-[10px] font-mono bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-white/60">90 DAYS</span>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3.5 bg-black/40 border border-white/5 rounded-2xl justify-start">
          {daysArray.map((day, idx) => {
            const dateStr = day.toDateString();
            const count = txCounts[dateStr] || 0;
            return (
              <div key={idx} className={`w-3.5 h-3.5 rounded-sm transition-all duration-200 hover:scale-125 cursor-pointer relative group ${getIntensityClass(count)}`}>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#0A0F1E] border border-white/10 text-[9px] font-mono text-white rounded px-2.5 py-1.5 whitespace-nowrap z-50 shadow-[0_0_15px_rgba(0,212,255,0.4)]">
                  {day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: {count} tx{count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[9px] font-mono text-white/30 mt-3 uppercase tracking-widest">
          <span>90 Days Ago</span>
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded bg-white/5 border border-white/5" />
            <div className="w-2.5 h-2.5 rounded bg-[#00D4FF]/25 border border-[#00D4FF]/30" />
            <div className="w-2.5 h-2.5 rounded bg-[#00D4FF]/50 border border-[#00D4FF]/60" />
            <div className="w-2.5 h-2.5 rounded bg-[#00D4FF] border border-[#00FFA3]" />
            <span>More</span>
          </div>
          <span>Today</span>
        </div>
      </div>
    );
  }

  const sidebarLinks = [
    { id: 'arcade', label: 'Arcade', href: '/?tab=arcade', icon: <Gamepad2 size={18} /> },
    { id: 'wallet-stats', label: 'Wallet Stats', href: '/?tab=wallet-stats', icon: <Activity size={18} /> },
    { id: 'daily-streak', label: 'Daily Streak', href: '/?tab=daily-streak', icon: <Flame size={18} /> },
    { id: 'deploy', label: 'Deploy', href: '/?tab=deploy', icon: <Rocket size={18} /> },
    { id: 'leaderboard', label: 'Leaderboard', href: '/?tab=leaderboard', icon: <Award size={18} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      
      <div className="radial-glow-top" />
      <div className="radial-glow-bottom" />

      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-72 bg-white/[0.01] border-r border-white/5 backdrop-blur-2xl py-10 px-6 flex-col justify-between z-20 shrink-0 relative">
        <div className="flex flex-col gap-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#00D1FF] to-[#7B61FF] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,209,255,0.4)]">
              <Zap size={22} className="text-white drop-shadow-[0_2px_4px_black]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-white via-white to-cyan-400 bg-clip-text text-transparent">BASEGRID</h1>
              <p className="text-[9px] text-[#00FFA3] font-mono tracking-widest uppercase mt-0.5">ONCHAIN ARCADE</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {sidebarLinks.map((link) => {
              const active = link.id === tabParam;
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 relative ${
                    active
                      ? 'text-white bg-gradient-to-r from-white/[0.07] to-transparent shadow-[inset_0_0_15px_rgba(0,209,255,0.03)] border-l-2 border-[#00D1FF]'
                      : 'text-white/45 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <span className={active ? 'text-[#00D1FF]' : 'text-white/45'}>{link.icon}</span>
                  <div>{link.label}</div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] absolute right-4 animate-pulse" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/5 pt-6 font-mono text-[9px] text-white/30 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <Terminal size={10} className="text-[#00D1FF]" />
            Ecosystem Builder
          </div>
          <div className="text-xs text-white/50 font-bold truncate">bc_5jkexp2o</div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="lg:hidden bg-[#050816]/80 border-b border-white/5 backdrop-blur-xl px-5 py-4 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#00D1FF] to-[#7B61FF] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,209,255,0.3)]">
            <Zap size={18} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider uppercase text-white">BASEGRID</h1>
            <p className="text-[8px] text-[#00FFA3] font-mono tracking-widest uppercase">ONCHAIN ARCADE</p>
          </div>
        </div>
        <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
      </header>

      {/* MAIN */}
      <main className="flex-1 px-4 md:px-8 lg:px-14 py-8 lg:py-10 flex flex-col gap-8 overflow-x-hidden relative z-10 max-w-7xl mx-auto w-full mb-16 lg:mb-0">

        {/* Desktop top bar */}
        <div className="hidden lg:flex justify-between items-center bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <Activity className="text-[#00D1FF] animate-pulse" size={20} />
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-white/70">
              Onchain Analytics Telemetry Scanners
            </span>
          </div>
          <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">

          {/* ARCADE */}
          {tabParam === 'arcade' && (
            <motion.div key="arcade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ArcadePanel />
            </motion.div>
          )}

          {/* DAILY STREAK */}
          {tabParam === 'daily-streak' && (
            <motion.div key="daily-streak" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DailyStreakPanel />
            </motion.div>
          )}

          {/* DEPLOY */}
          {tabParam === 'deploy' && (
            <motion.div key="deploy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DeployPanel />
            </motion.div>
          )}

          {/* LEADERBOARD */}
          {tabParam === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <LeaderboardPanel />
            </motion.div>
          )}

          {/* WALLET STATS (default) */}
          {(tabParam === 'wallet-stats' || tabParam === null) && (
            <motion.div key="wallet-stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-8">

              {/* Search */}
              <div className="w-full bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 flex flex-col gap-5 relative">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D1FF]/20 to-transparent" />
                <div>
                  <h2 className="text-lg font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <Compass size={18} className="text-[#00D1FF]" />
                    BASE GRID TELEMETRY PORTAL
                  </h2>
                  <p className="text-xs text-white/50 mt-1">Forensic wallet analysis on Base Mainnet. Works instantly without wallet connection.</p>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); fetchStats(inputAddress); }} className="flex flex-col md:flex-row items-stretch gap-3 w-full">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input
                      type="text"
                      value={inputAddress}
                      onChange={(e) => setInputAddress(e.target.value)}
                      placeholder="Enter Base wallet address (0x...)"
                      className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/5 rounded-2xl text-white placeholder-white/30 font-mono text-sm focus:outline-none focus:border-[#00D1FF] focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 py-3.5 px-8 font-black uppercase tracking-widest rounded-2xl text-xs text-black bg-[#00D1FF] hover:bg-[#00D1FF]/90 active:scale-95 shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all disabled:opacity-50">
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                    Analyze Wallet
                  </button>
                </form>
              </div>

              {/* Terminal Loading */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-full max-w-lg bg-[#050f1a] border border-[#00D1FF]/20 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,209,255,0.08)]">
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      <span className="ml-3 text-[10px] font-mono text-white/40 uppercase tracking-widest">BASE.FUN ~ STATS-ENGINE</span>
                      <span className="ml-auto text-[10px] font-mono text-[#00D1FF]/60">{inputAddress.slice(0,8)}...{inputAddress.slice(-4)}</span>
                    </div>
                    <div className="p-6 flex flex-col gap-5">
                      <div className="text-[#00D1FF] font-mono text-sm font-bold">&gt; Analyzing wallet activity...</div>
                      {[
                        { label: 'Checking on-chain activities', sub: 'Completed' },
                        { label: 'Fetching real-time data from RPC', sub: 'Analyzing...' },
                        { label: 'Analyzing transaction history', sub: 'Awaiting' },
                        { label: 'Calculating Onchain Score', sub: 'Awaiting' },
                      ].map((step, i) => {
                        const done = loadingStep > i;
                        const running = loadingStep === i;
                        return (
                          <div key={i} className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${done ? 'bg-[#00FFA3]' : running ? 'bg-[#00D1FF] animate-pulse' : 'border border-white/20'}`} />
                              <div>
                                <div className={`font-mono text-xs ${done || running ? 'text-[#00D1FF]' : 'text-white/30'}`}>&gt; {step.label}</div>
                                <div className={`font-mono text-[10px] mt-0.5 ${done ? 'text-[#00FFA3]' : running ? 'text-[#00D1FF]/60' : 'text-white/20'}`}>{done ? 'Completed' : step.sub}</div>
                              </div>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg border ${done ? 'text-[#00FFA3] border-[#00FFA3]/20 bg-[#00FFA3]/10' : running ? 'text-[#00D1FF] border-[#00D1FF]/20 bg-[#00D1FF]/10' : 'text-white/20 border-white/5'}`}>
                              {done ? '● done' : running ? '● running' : '● pending'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 rounded-3xl p-6 md:p-8 max-w-xl mx-auto flex flex-col items-center gap-4 text-center">
                  <AlertCircle size={36} className="text-red-400 animate-bounce" />
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-widest text-sm">Telemetry Query Failed</h4>
                    <p className="text-xs text-white/50 mt-1">{error}</p>
                  </div>
                  <button onClick={() => fetchStats(inputAddress)} className="flex items-center gap-2 py-2 px-5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-all font-mono text-xs font-bold uppercase tracking-wider">
                    <RefreshCw size={12} /> Retry Scan
                  </button>
                </div>
              )}

              {/* Empty */}
              {stats?.isEmpty && (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 max-w-xl mx-auto flex flex-col items-center gap-5 text-center relative">
                  <div className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-white/30">
                    <Compass size={28} />
                  </div>
                  <div>
                    <h4 className="font-black text-white uppercase tracking-widest text-sm">No transactions found on Base Mainnet</h4>
                    <p className="text-xs text-white/40 mt-1.5 font-mono truncate max-w-xs md:max-w-md mx-auto">{stats.address}</p>
                    <p className="text-xs text-white/50 mt-4 leading-relaxed max-w-sm mx-auto">This address does not have active ledger records on Base Mainnet.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono bg-white/5 border border-white/5 rounded-xl px-4 py-2 mt-2">
                    <span className="text-white/40">ETH balance:</span>
                    <span className="text-[#00D1FF] font-bold">{stats.ethBalance} ETH</span>
                  </div>
                </div>
              )}

              {/* Full stats */}
              {stats && !stats.isEmpty && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid gap-8 lg:grid-cols-12 items-stretch">
                  
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Score */}
                    <div className="bg-white/[0.02] border border-[#00D1FF]/25 backdrop-blur-xl rounded-3xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D1FF]/5 blur-[35px] rounded-full" />
                      <div className="flex justify-between items-center text-white/45 text-xs font-mono uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Activity size={14} className="text-[#00D1FF]" /> Base Onchain Score</span>
                        <span className="text-[10px] bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/20 px-2.5 py-0.5 rounded-lg font-bold">TOP {stats.rank}%</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-4">
                        <span className="text-5xl font-black text-white font-mono tracking-wider drop-shadow-[0_0_12px_rgba(0,212,255,0.3)]">{stats.score}</span>
                        <span className="text-lg font-mono text-white/30">/100</span>
                      </div>
                      <div className="text-[10px] text-white/40 font-mono uppercase tracking-widest mt-4">Treasury Reserve balance</div>
                      <div className="text-2xl font-black text-[#00D1FF] font-mono mt-1 tracking-wide">{stats.ethBalance} <span className="text-sm font-bold text-white/60">ETH</span></div>
                    </div>

                    <RenderHeatmap txs={stats.rawTxs} />

                    {/* Metrics */}
                    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col gap-4 relative">
                      <div className="text-xs font-black uppercase text-white/50 tracking-wider">Core Forensic ledger metrics</div>
                      {/* Big numbers row 1 */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Transactions\non Base', val: stats.totalTx, color: 'text-[#00D1FF]' },
                          { label: 'Unique days\nactive', val: stats.uniqueDays, color: 'text-[#00D1FF]' },
                          { label: 'Day longest\nstreak', val: stats.longestStreak, color: 'text-[#00D1FF]' },
                        ].map((m, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <span className={`text-2xl font-black font-mono ${m.color}`}>{m.val}</span>
                            <span className="text-[9px] text-white/40 font-mono leading-tight whitespace-pre-line">{m.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="h-px bg-white/5" />
                      {/* Big numbers row 2 */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Day current\nstreak', val: stats.currentStreak, color: 'text-[#00D1FF]' },
                          { label: 'Day activity\nperiod', val: stats.uniqueDays * 2, color: 'text-[#00D1FF]' },
                          { label: 'Native ETH\nBalance', val: stats.ethBalance, color: 'text-[#00D1FF]' },
                        ].map((m, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <span className={`text-2xl font-black font-mono ${m.color}`}>{m.val}</span>
                            <span className="text-[9px] text-white/40 font-mono leading-tight whitespace-pre-line">{m.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="h-px bg-white/5" />
                      {/* Row 3 */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Token swaps\nperformed', val: stats.tokenSwaps, color: 'text-[#00D1FF]' },
                          { label: 'Token\ntransfers', val: stats.tokenTransfers, color: 'text-[#00D1FF]' },
                          { label: 'NFT\ntransfers', val: stats.nftTransfers, color: 'text-[#00D1FF]' },
                        ].map((m, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <span className={`text-2xl font-black font-mono ${m.color}`}>{m.val}</span>
                            <span className="text-[9px] text-white/40 font-mono leading-tight whitespace-pre-line">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right panel */}
                  <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative">
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#7B61FF]/25 to-transparent" />
                    <div className="flex gap-2.5 border-b border-white/5 pb-4">
                      {(['txs', 'tokens', 'nfts'] as const).map((tab) => {
                        const active = activeTab === tab;
                        return (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all duration-300 ${active ? 'bg-[#7B61FF]/10 text-white border-[#7B61FF]/30 shadow-[0_0_15px_rgba(123,97,255,0.2)]' : 'bg-white/5 text-white/40 border-transparent hover:text-white hover:bg-white/10'}`}>
                            {tab === 'txs' ? '📜 TXS' : tab === 'tokens' ? '🪙 TOKENS' : '🎨 NFTs'}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex-1">
                      {activeTab === 'txs' && (
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[650px] pr-1.5">
                          {stats.txList.length === 0 ? <div className="text-center py-12 text-white/30 text-xs">No standard transactions indexable</div> : stats.txList.map((tx: any) => (
                            <div key={tx.hash} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.08] transition-colors">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                  {tx.to === '' ? '🛠️ DEPLOY CONTRACT' : tx.input && tx.input !== '0x' ? '📞 SMART CALL' : '💸 TRANSFER'}
                                  <a href={`https://basescan.org/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-[#00D1FF] hover:underline inline-flex items-center"><ExternalLink size={10} className="ml-1" /></a>
                                </span>
                                <span className="font-mono text-[10px] text-white/40 truncate max-w-[180px] sm:max-w-sm">{tx.hash}</span>
                                <span className="text-[10px] text-white/30 font-mono mt-0.5">BLOCK: {tx.blockNumber} • {new Date(tx.timeStamp * 1000).toLocaleDateString()}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="font-black text-white font-mono">{(parseInt(tx.value) / 1e18).toFixed(4)} ETH</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${tx.isError === '0' ? 'bg-[#00FFA3]/10 text-[#00FFA3] border border-[#00FFA3]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{tx.isError === '0' ? 'success' : 'failed'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {activeTab === 'tokens' && (
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[650px] pr-1.5">
                          {stats.tokenList.length === 0 ? <div className="text-center py-12 text-white/30 text-xs">No active standard tokens found</div> : stats.tokenList.map((token: any) => (
                            <div key={token.contract} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.08] transition-colors">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">{token.name}<a href={`https://basescan.org/token/${token.contract}`} target="_blank" rel="noopener noreferrer" className="text-[#00D1FF] hover:underline"><ExternalLink size={10} className="ml-1" /></a></span>
                                <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Symbol: {token.symbol}</span>
                                <span className="font-mono text-[9px] text-white/30 truncate max-w-[180px] sm:max-w-sm">{token.contract}</span>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <span className="font-black text-[#00D1FF] font-mono text-sm">{token.balance}</span>
                                <span className="text-[9px] text-white/40 font-bold block uppercase mt-0.5">{token.symbol}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {activeTab === 'nfts' && (
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[650px] pr-1.5">
                          {stats.nftList.length === 0 ? <div className="text-center py-12 text-white/30 text-xs">No standard NFTs (ERC721/1155) found</div> : stats.nftList.map((nft: any, idx: number) => (
                            <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.08] transition-colors">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">{nft.name}<a href={`https://basescan.org/token/${nft.contract}`} target="_blank" rel="noopener noreferrer" className="text-[#00D1FF] hover:underline"><ExternalLink size={10} className="ml-1" /></a></span>
                                <span className="text-[10px] text-[#00FFA3] font-mono uppercase tracking-wider">{nft.symbol} • TOKEN ID: #{nft.tokenId}</span>
                                <span className="font-mono text-[9px] text-white/30 truncate max-w-[180px] sm:max-w-sm">{nft.contract}</span>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="px-2.5 py-1 bg-[#00FFA3]/10 text-[#00FFA3] border border-[#00FFA3]/20 rounded-xl text-[10px] font-bold uppercase tracking-wider">NFT OWNED</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}

        </AnimatePresence>

        {/* Footer */}
        <footer className="w-full text-center pt-8 text-[10px] text-white/20 font-mono uppercase tracking-widest flex flex-col items-center gap-1.5 border-t border-white/5 mt-8 mb-4">
          <div>BaseGrid Shield Core Secure</div>
          <div className="flex items-center gap-2">
            <span>Ecosystem Node: <span className="text-[#00D1FF] font-bold">bc_5jkexp2o</span></span>
            <span className="text-white/10">•</span>
            <span>Encoded Payload: <span className="text-[#7B61FF] font-bold">0x6263...1v</span></span>
          </div>
        </footer>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050816]/90 border-t border-white/5 backdrop-blur-2xl z-30 flex items-center justify-around py-3 px-2">
        {sidebarLinks.map((link) => {
          const active = link.id === tabParam;
          return (
            <Link key={link.id} href={link.href} className={`flex flex-col items-center gap-1 transition-all duration-200 ${active ? 'text-[#00D1FF]' : 'text-white/40'}`}>
              <div className={active ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,209,255,0.4)]' : ''}>{link.icon}</div>
              <span className="text-[8px] font-bold uppercase tracking-wider">{link.label}</span>
            </Link>
          );
        })}
      </div>

    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0F1E]" />}>
      <StatsPageInner />
    </Suspense>
  );
}
