'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Flame, Activity, Sparkles, Trophy, Clock, Zap } from 'lucide-react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';

// ── Constants ─────────────────────────────────────────────────────────────────
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const POINTS_PER_ACTION = 2;

// ── Types ─────────────────────────────────────────────────────────────────────
interface HistoryEntry {
  type: 'GM' | 'GN' | 'CHECKIN';
  points: number;
  txHash: string;
  timestamp: number;
}

interface Stats {
  totalPoints: number;
  totalTxns: number;
  streak: number;
  lastGMTime: number;
  lastGNTime: number;
  lastCheckIn: number;
  history: HistoryEntry[];
}

function getKey(address: string) {
  return `basegrid_daily_${address}`;
}

function loadStats(address: string): Stats {
  try {
    const saved = localStorage.getItem(getKey(address));
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    totalPoints: 0,
    totalTxns: 0,
    streak: 0,
    lastGMTime: 0,
    lastGNTime: 0,
    lastCheckIn: 0,
    history: [],
  };
}

function saveStats(address: string, stats: Stats) {
  localStorage.setItem(getKey(address), JSON.stringify(stats));
}

function timeLeft(lastTime: number): string {
  const next = lastTime + COOLDOWN_MS;
  const diff = next - Date.now();
  if (diff <= 0) return '';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function progressPct(lastTime: number): number {
  if (lastTime === 0) return 100;
  const diff = Date.now() - lastTime;
  return Math.min(100, Math.max(0, (diff / COOLDOWN_MS) * 100));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GMGNPanel() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [stats, setStats] = useState<Stats>({
    totalPoints: 0, totalTxns: 0, streak: 0,
    lastGMTime: 0, lastGNTime: 0, lastCheckIn: 0, history: [],
  });
  const [loading, setLoading] = useState<'GM' | 'GN' | 'CHECKIN' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [now, setNow] = useState(Date.now());

  // Refresh cooldown timer every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Load stats from localStorage
  useEffect(() => {
    if (address) setStats(loadStats(address));
  }, [address]);

  if (!isConnected || !address) {
    return (
      <div className="w-full text-center py-16 bg-[#050816]/65 border border-white/10 backdrop-blur-2xl rounded-3xl p-8">
        <Flame className="text-white/20 mx-auto animate-pulse mb-4" size={48} />
        <h3 className="text-white text-lg font-black uppercase tracking-wider">Connect Wallet</h3>
        <p className="text-white/40 text-xs mt-2">Daily streak ke liye wallet connect karo.</p>
      </div>
    );
  }

  const gmAvailable = stats.lastGMTime === 0 || now - stats.lastGMTime >= COOLDOWN_MS;
  const gnAvailable = stats.lastGNTime === 0 || now - stats.lastGNTime >= COOLDOWN_MS;
  const checkInAvailable = stats.lastCheckIn === 0 || now - stats.lastCheckIn >= COOLDOWN_MS;

  // ── Send minimal Base tx (0 ETH self-transfer with data) ──────────────────
  async function sendBaseTx(memo: string): Promise<string> {
    if (!walletClient || !address) throw new Error('Wallet not connected');

    // Encode memo as hex data
    const data = ('0x' + Buffer.from(memo, 'utf8').toString('hex')) as `0x${string}`;

    const hash = await walletClient.sendTransaction({
      to: address, // self transfer — 0 ETH
      value: BigInt(0),
      data,
    });

    // Wait for confirmation
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash });
    }

    return hash;
  }

  // ── GM Action ─────────────────────────────────────────────────────────────
  async function handleGM() {
    if (!gmAvailable || loading) return;
    setLoading('GM');
    setError('');
    setSuccess('');
    try {
      const hash = await sendBaseTx('BaseGrid:GM:CheckIn');
      const newStats: Stats = {
        ...stats,
        totalPoints: stats.totalPoints + POINTS_PER_ACTION,
        totalTxns: stats.totalTxns + 1,
        lastGMTime: Date.now(),
        streak: stats.streak + 1,
        history: [
          { type: 'GM', points: POINTS_PER_ACTION, txHash: hash, timestamp: Date.now() },
          ...stats.history.slice(0, 19),
        ],
      };
      setStats(newStats);
      saveStats(address, newStats);
      setSuccess(`GM! +${POINTS_PER_ACTION} points 🌅`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setError(msg.includes('rejected') ? 'Transaction cancel kar di!' : msg.slice(0, 80));
    } finally {
      setLoading(null);
    }
  }

  // ── GN Action ─────────────────────────────────────────────────────────────
  async function handleGN() {
    if (!gnAvailable || loading) return;
    setLoading('GN');
    setError('');
    setSuccess('');
    try {
      const hash = await sendBaseTx('BaseGrid:GN:CheckIn');
      const newStats: Stats = {
        ...stats,
        totalPoints: stats.totalPoints + POINTS_PER_ACTION,
        totalTxns: stats.totalTxns + 1,
        lastGNTime: Date.now(),
        streak: stats.streak + 1,
        history: [
          { type: 'GN', points: POINTS_PER_ACTION, txHash: hash, timestamp: Date.now() },
          ...stats.history.slice(0, 19),
        ],
      };
      setStats(newStats);
      saveStats(address, newStats);
      setSuccess(`GN! +${POINTS_PER_ACTION} points 🌙`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setError(msg.includes('rejected') ? 'Transaction cancel kar di!' : msg.slice(0, 80));
    } finally {
      setLoading(null);
    }
  }

  // ── Daily Check-in ────────────────────────────────────────────────────────
  async function handleCheckIn() {
    if (!checkInAvailable || loading) return;
    setLoading('CHECKIN');
    setError('');
    setSuccess('');
    try {
      const hash = await sendBaseTx('BaseGrid:DailyCheckIn');
      const newStats: Stats = {
        ...stats,
        totalPoints: stats.totalPoints + POINTS_PER_ACTION,
        totalTxns: stats.totalTxns + 1,
        lastCheckIn: Date.now(),
        streak: stats.streak + 1,
        history: [
          { type: 'CHECKIN', points: POINTS_PER_ACTION, txHash: hash, timestamp: Date.now() },
          ...stats.history.slice(0, 19),
        ],
      };
      setStats(newStats);
      saveStats(address, newStats);
      setSuccess(`Check-in done! +${POINTS_PER_ACTION} points ✅`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setError(msg.includes('rejected') ? 'Transaction cancel kar di!' : msg.slice(0, 80));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Total Points */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 blur-2xl rounded-full" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Total Points</span>
            <Trophy size={14} className="text-yellow-400" />
          </div>
          <div className="text-3xl font-black text-yellow-400 font-mono">{stats.totalPoints}</div>
          <div className="text-[9px] text-white/30 font-mono mt-1">+{POINTS_PER_ACTION} per action</div>
        </div>

        {/* Streak */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 blur-2xl rounded-full" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Streak</span>
            <Flame size={14} className="text-orange-400" />
          </div>
          <div className="text-3xl font-black text-orange-400 font-mono">{stats.streak}d</div>
          <div className="text-[9px] text-white/30 font-mono mt-1">Active streak</div>
        </div>

        {/* Total Txns */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#00D1FF]/5 blur-2xl rounded-full" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Total Txns</span>
            <Activity size={14} className="text-[#00D1FF]" />
          </div>
          <div className="text-3xl font-black text-[#00D1FF] font-mono">{stats.totalTxns}</div>
          <div className="text-[9px] text-white/30 font-mono mt-1">On Base chain</div>
        </div>

        {/* Network */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FFA3]/5 blur-2xl rounded-full" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Network</span>
            <Zap size={14} className="text-[#00FFA3]" />
          </div>
          <div className="text-sm font-black text-[#00FFA3] font-mono mt-1">{chain?.name || 'Unknown'}</div>
          <div className="text-[9px] text-white/30 font-mono mt-1">
            {chain?.id === 8453 ? '✓ Base Mainnet' : '⚠ Switch to Base'}
          </div>
        </div>

      </div>

      {/* ── Feedback ── */}
      {success && (
        <div className="bg-[#00FFA3]/5 border border-[#00FFA3]/20 rounded-xl px-4 py-3 text-[12px] text-[#00FFA3] font-mono text-center">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 text-[12px] text-red-400 font-mono text-center">
          {error}
        </div>
      )}

      {/* ── GM + GN + Check-in Panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* GM Panel */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Sun size={20} className="text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-white uppercase tracking-wider">Good Morning</div>
              <div className="text-[9px] text-white/40 font-mono">Every 12 hours · +{POINTS_PER_ACTION} pts</div>
            </div>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase font-mono border ${
              gmAvailable ? 'bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/20 animate-pulse' : 'bg-white/5 text-white/30 border-white/5'
            }`}>
              {gmAvailable ? 'Ready' : 'Cooldown'}
            </span>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-[9px] font-mono text-white/30 mb-1.5">
              <span>Cooldown</span>
              <span>{gmAvailable ? '✓ Ready' : timeLeft(stats.lastGMTime)}</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-500"
                style={{ width: `${progressPct(stats.lastGMTime)}%` }} />
            </div>
          </div>

          <button
            onClick={handleGM}
            disabled={!gmAvailable || loading !== null}
            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest font-mono border transition-all active:scale-95 ${
              gmAvailable && !loading
                ? 'bg-gradient-to-r from-yellow-500 to-orange-400 text-white border-yellow-400/20 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
            }`}
          >
            {loading === 'GM' ? '⏳ Sending...' : '🌅 GM (+2 pts)'}
          </button>
        </div>

        {/* GN Panel */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Moon size={20} className="text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-white uppercase tracking-wider">Good Night</div>
              <div className="text-[9px] text-white/40 font-mono">Every 12 hours · +{POINTS_PER_ACTION} pts</div>
            </div>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase font-mono border ${
              gnAvailable ? 'bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/20 animate-pulse' : 'bg-white/5 text-white/30 border-white/5'
            }`}>
              {gnAvailable ? 'Ready' : 'Cooldown'}
            </span>
          </div>

          <div>
            <div className="flex justify-between text-[9px] font-mono text-white/30 mb-1.5">
              <span>Cooldown</span>
              <span>{gnAvailable ? '✓ Ready' : timeLeft(stats.lastGNTime)}</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-500"
                style={{ width: `${progressPct(stats.lastGNTime)}%` }} />
            </div>
          </div>

          <button
            onClick={handleGN}
            disabled={!gnAvailable || loading !== null}
            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest font-mono border transition-all active:scale-95 ${
              gnAvailable && !loading
                ? 'bg-gradient-to-r from-indigo-500 to-purple-400 text-white border-indigo-400/20 shadow-[0_0_20px_rgba(129,140,248,0.2)]'
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
            }`}
          >
            {loading === 'GN' ? '⏳ Sending...' : '🌙 GN (+2 pts)'}
          </button>
        </div>

        {/* Daily Check-in Panel */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FFA3]/30 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center">
              <Flame size={20} className="text-[#00FFA3]" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-white uppercase tracking-wider">Daily Check-in</div>
              <div className="text-[9px] text-white/40 font-mono">Every 12 hours · +{POINTS_PER_ACTION} pts</div>
            </div>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase font-mono border ${
              checkInAvailable ? 'bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/20 animate-pulse' : 'bg-white/5 text-white/30 border-white/5'
            }`}>
              {checkInAvailable ? 'Ready' : 'Cooldown'}
            </span>
          </div>

          <div>
            <div className="flex justify-between text-[9px] font-mono text-white/30 mb-1.5">
              <span>Cooldown</span>
              <span>{checkInAvailable ? '✓ Ready' : timeLeft(stats.lastCheckIn)}</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#00FFA3] to-[#00D1FF] transition-all duration-500"
                style={{ width: `${progressPct(stats.lastCheckIn)}%` }} />
            </div>
          </div>

          <button
            onClick={handleCheckIn}
            disabled={!checkInAvailable || loading !== null}
            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest font-mono border transition-all active:scale-95 ${
              checkInAvailable && !loading
                ? 'bg-gradient-to-r from-[#00FFA3] to-[#00D1FF] text-black border-[#00FFA3]/20 shadow-[0_0_20px_rgba(0,255,163,0.2)]'
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
            }`}
          >
            {loading === 'CHECKIN' ? '⏳ Sending...' : '🔥 Check-in (+2 pts)'}
          </button>
        </div>

      </div>

      {/* ── History ── */}
      {stats.history.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={13} className="text-white/40" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">Transaction History</span>
          </div>
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
            {stats.history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between bg-black/20 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    {entry.type === 'GM' ? '🌅' : entry.type === 'GN' ? '🌙' : '🔥'}
                  </span>
                  <div>
                    <div className="text-[10px] font-bold text-white font-mono">{entry.type}</div>
                    <div className="text-[9px] text-white/30 font-mono">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-yellow-400 font-mono">+{entry.points} pts</span>
                  <a
                    href={`https://basescan.org/tx/${entry.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-[#00D1FF] font-mono hover:underline"
                  >
                    {entry.txHash.slice(0, 8)}...
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
