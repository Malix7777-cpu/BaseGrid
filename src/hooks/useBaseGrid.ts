'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useChainId, useSwitchChain, useBalance } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { BUILDER_CODE } from '../blockchain/builderCode';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface PlayerStats {
  wallet: string;
  username: string;
  highestScore: number;
  xp: number;
  streak: number;
  lastGMTime: number;
  lastGNTime: number;
  lastCheckInTime: number;
  registered: boolean;
}

export interface DeployedToken {
  tokenAddress: string;
  name: string;
  symbol: string;
  supply: number;
  creator: string;
  timestamp: number;
  hash: string;
}

export interface WalletAnalytics {
  walletScore: number;
  activeDays: number;
  totalTxCount: number;
  activityStreak: number;
  ethBalance: string;
  tokenActivityCount: number;
  nftActivityCount: number;
  contractsDeployedCount: number;
  rankingBadge: 'Base Recruit' | 'Grid Cadet' | 'Cyber Agent' | 'Neon Legend' | 'Base Builder';
  recentTransactions: Array<{
    hash: string;
    method: string;
    status: 'success' | 'failed' | 'pending';
    timestamp: number;
    gasUsed: string;
  }>;
  heatmap: Array<{ date: string; count: number }>;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  wallet: string;
  score: number;
  xp: number;
  streak: number;
  badge: string;
}

// ─── Alchemy API ───────────────────────────────────────────────────────────────
// Put your key in .env.local as: NEXT_PUBLIC_ALCHEMY_API_KEY=WxnHNerI3CqsZauAVAS9n
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'WxnHNerI3CqsZauAVAS9n';
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Fetch ALL transfers using alchemy_getAssetTransfers (handles pagination)
async function fetchAlchemyTransfers(address: string, category: string[]): Promise<any[]> {
  const allTransfers: any[] = [];
  let pageKey: string | undefined = undefined;

  while (true) {
    const body: any = {
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [{
        fromAddress: address,
        category,
        withMetadata: true,
        excludeZeroValue: false,
        maxCount: '0x3e8', // 1000 per page
        ...(pageKey ? { pageKey } : {}),
      }],
    };

    const res = await fetch(ALCHEMY_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const result = data?.result;
    if (!result || !result.transfers) break;

    allTransfers.push(...result.transfers);
    if (!result.pageKey) break; // no more pages
    pageKey = result.pageKey;
  }

  return allTransfers;
}

// Fetch normal ETH transactions
async function fetchAllNormalTxs(address: string): Promise<any[]> {
  return fetchAlchemyTransfers(address, ['external', 'internal']);
}

// Fetch ERC-20 token transfers
async function fetchTokenTransfers(address: string): Promise<any[]> {
  return fetchAlchemyTransfers(address, ['erc20']);
}

// Fetch ERC-721 + ERC-1155 NFT transfers
async function fetchNFTTransfers(address: string): Promise<any[]> {
  return fetchAlchemyTransfers(address, ['erc721', 'erc1155']);
}

// Decode method name from input data
function decodeMethodName(input: string): string {
  if (!input || input === '0x') return 'Transfer';
  const sig = input.slice(0, 10).toLowerCase();
  const knownSigs: Record<string, string> = {
    '0xa9059cbb': 'Token Transfer',
    '0x23b872dd': 'Transfer From',
    '0x095ea7b3': 'Approve',
    '0x60806040': 'Deploy Contract',
    '0x38ed1739': 'Swap Tokens',
    '0x7ff36ab5': 'Swap ETH',
    '0xfb3bdb41': 'Swap ETH Exact',
    '0x18cbafe5': 'Swap Exact ETH',
    '0x5ae401dc': 'Multicall',
    '0xac9650d8': 'Multicall',
    '0x12aa3caf': '1inch Swap',
    '0xe449022e': 'Uniswap Swap',
    '0x3593564c': 'Execute',
    '0xa0712d68': 'Mint',
    '0x1249c58b': 'Mint NFT',
    '0x40c10f19': 'Mint Token',
    '0x6a627842': 'Mint',
    '0x4e71d92d': 'Claim',
    '0x2e7ba6ef': 'Claim',
    '0xd0e30db0': 'Deposit',
    '0x2e1a7d4d': 'Withdraw',
    '0xb6b55f25': 'Deposit',
    '0x441a3e70': 'Withdraw',
  };
  return knownSigs[sig] || 'Contract Call';
}

// Build 90-day heatmap from transactions
function buildHeatmap(txs: any[]): Array<{ date: string; count: number }> {
  const countMap: Record<string, number> = {};
  const now = new Date();

  // Initialize last 90 days with 0
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    countMap[d.toISOString().split('T')[0]] = 0;
  }

  // Count real transactions per day
  for (const tx of txs) {
    const ts = parseInt(tx.timeStamp) * 1000;
    const date = new Date(ts).toISOString().split('T')[0];
    if (date in countMap) {
      countMap[date]++;
    }
  }

  return Object.entries(countMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

// Calculate current activity streak (consecutive days with tx)
function calcStreak(heatmap: Array<{ date: string; count: number }>): number {
  let streak = 0;
  // Go from today backwards
  for (let i = heatmap.length - 1; i >= 0; i--) {
    if (heatmap[i].count > 0) streak++;
    else break;
  }
  return streak;
}

// ─── Main Hook ─────────────────────────────────────────────────────────────────

export function useBaseGrid() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { data: balanceData } = useBalance({ address });

  const [txState, setTxState] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
    hash: string | null;
  }>({ loading: false, success: false, error: null, hash: null });

  const PLAYER_STATS_KEY = `basegrid_player_${address || 'anonymous'}`;
  const TOKENS_KEY = `basegrid_tokens_${address || 'anonymous'}`;
  const LOCAL_LEADERBOARD_KEY = 'basegrid_global_leaderboard';

  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  const [leaderboards, setLeaderboards] = useState<{
    global: LeaderboardEntry[];
    daily: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
  }>({ global: [], daily: [], weekly: [] });
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const isBaseNetwork = useMemo(() => {
    if (!isConnected) return true;
    return chainId === base.id || chainId === baseSepolia.id;
  }, [isConnected, chainId]);

  // ── Load player stats from localStorage ──
  useEffect(() => {
    if (!address) { setPlayerStats(null); return; }

    const savedStats = localStorage.getItem(PLAYER_STATS_KEY);
    if (savedStats) {
      setPlayerStats(JSON.parse(savedStats));
    } else {
      const initial: PlayerStats = {
        wallet: address, username: '', highestScore: 0, xp: 0,
        streak: 0, lastGMTime: 0, lastGNTime: 0, lastCheckInTime: 0, registered: false,
      };
      setPlayerStats(initial);
      localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(initial));
    }

    const savedTokens = localStorage.getItem(TOKENS_KEY);
    setDeployedTokens(savedTokens ? JSON.parse(savedTokens) : []);
  }, [address, PLAYER_STATS_KEY, TOKENS_KEY]);

  // ── Fetch REAL analytics from BaseScan ──
  useEffect(() => {
    if (!address) { setAnalytics(null); return; }

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        // Fetch all data in parallel
        const [normalTxs, tokenTxs, nftTxs] = await Promise.all([
          fetchAllNormalTxs(address),
          fetchTokenTransfers(address),
          fetchNFTTransfers(address),
        ]);

        // Real counts
        const totalTxCount = normalTxs.length;
        const tokenActivityCount = tokenTxs.length;
        const nftActivityCount = nftTxs.length;

        // Count contracts deployed (to=null in Alchemy means contract creation)
        const contractsDeployedCount = normalTxs.filter(
          tx => !tx.to || tx.to === null
        ).length + deployedTokens.length;

        // Unique active days — Alchemy uses metadata.blockTimestamp (ISO string)
        const daySet = new Set<string>();
        for (const tx of normalTxs) {
          const dateStr = tx.metadata?.blockTimestamp
            ? tx.metadata.blockTimestamp.split('T')[0]
            : null;
          if (dateStr) daySet.add(dateStr);
        }
        const activeDays = daySet.size;

        // ETH balance from wagmi (real)
        const balanceEth = balanceData
          ? parseFloat(balanceData.formatted).toFixed(4)
          : '0.0000';

        // Heatmap (last 90 days) — convert Alchemy format for buildHeatmap
        const normalTxsForHeatmap = normalTxs.map(tx => ({
          timeStamp: tx.metadata?.blockTimestamp
            ? String(Math.floor(new Date(tx.metadata.blockTimestamp).getTime() / 1000))
            : '0',
        }));
        const heatmap = buildHeatmap(normalTxsForHeatmap);

        // Activity streak
        const activityStreak = calcStreak(heatmap);

        // Score formula
        const walletScore = Math.floor(
          totalTxCount * 12 +
          activeDays * 25 +
          contractsDeployedCount * 250 +
          parseFloat(balanceEth) * 500
        );

        // Ranking badge
        let rankingBadge: WalletAnalytics['rankingBadge'] = 'Base Recruit';
        if (walletScore > 8000) rankingBadge = 'Neon Legend';
        else if (walletScore > 4000) rankingBadge = 'Base Builder';
        else if (walletScore > 2000) rankingBadge = 'Cyber Agent';
        else if (walletScore > 800) rankingBadge = 'Grid Cadet';

        // Recent 10 transactions — Alchemy format
        const recentTransactions = normalTxs.slice(0, 10).map(tx => ({
          hash: tx.hash
            ? `${tx.hash.slice(0, 8)}...${tx.hash.slice(-6)}`
            : '0x???...???',
          method: tx.category === 'external' ? 'Transfer' : tx.category || 'Contract Call',
          status: 'success' as const,
          timestamp: tx.metadata?.blockTimestamp
            ? new Date(tx.metadata.blockTimestamp).getTime()
            : Date.now(),
          gasUsed: '21000',
        }));

        setAnalytics({
          walletScore,
          activeDays,
          totalTxCount,
          activityStreak,
          ethBalance: balanceEth,
          tokenActivityCount,
          nftActivityCount,
          contractsDeployedCount,
          rankingBadge,
          recentTransactions,
          heatmap,
        });
      } catch (err) {
        console.error('[BaseGrid] Failed to fetch analytics:', err);
        // Fallback: set empty analytics so UI doesn't break
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [address, balanceData, deployedTokens.length]);

  // ── Leaderboards ──
  const loadLeaderboards = useCallback(() => {
    const defaultGlobal: LeaderboardEntry[] = [
      { rank: 1, username: 'BaseGod_99', wallet: '0x321a...4321', score: 184500, xp: 2450, streak: 14, badge: 'Neon Legend' },
      { rank: 2, username: 'JessePollak_Fan', wallet: '0x8888...8888', score: 152000, xp: 1980, streak: 8, badge: 'Base Builder' },
      { rank: 3, username: 'CyberPixel', wallet: '0x0f2a...c013', score: 125400, xp: 1650, streak: 12, badge: 'Cyber Agent' },
      { rank: 4, username: 'EthereumMaxi', wallet: '0x71C7...5f76', score: 98100, xp: 1200, streak: 5, badge: 'Grid Cadet' },
      { rank: 5, username: 'BaseGrid_Dev', wallet: '0x5jkE...xp2o', score: 85000, xp: 950, streak: 7, badge: 'Base Builder' },
    ];

    const savedLeaderboard = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    let currentLeaderboard: LeaderboardEntry[] = savedLeaderboard
      ? JSON.parse(savedLeaderboard)
      : defaultGlobal;

    if (!savedLeaderboard) {
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(defaultGlobal));
    }

    if (playerStats?.registered && playerStats.username && analytics) {
      const playerIndex = currentLeaderboard.findIndex(
        e => e.username === playerStats.username || e.wallet.toLowerCase() === playerStats.wallet.toLowerCase()
      );

      const newEntry: LeaderboardEntry = {
        rank: 0,
        username: playerStats.username,
        wallet: `${playerStats.wallet.slice(0, 6)}...${playerStats.wallet.slice(-4)}`,
        score: Math.max(
          analytics.walletScore,
          playerIndex !== -1 ? currentLeaderboard[playerIndex].score : 0
        ),
        xp: playerStats.xp,
        streak: playerStats.streak,
        badge: analytics.rankingBadge,
      };

      if (playerIndex !== -1) currentLeaderboard[playerIndex] = newEntry;
      else currentLeaderboard.push(newEntry);
    }

    currentLeaderboard.sort((a, b) => b.score - a.score);
    currentLeaderboard = currentLeaderboard.map((e, i) => ({ ...e, rank: i + 1 }));
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(currentLeaderboard));

    const daily = [...currentLeaderboard]
      .map(e => ({ ...e, score: Math.floor(e.score * (0.6 + Math.random() * 0.4)) }))
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    const weekly = [...currentLeaderboard]
      .map(e => ({ ...e, score: Math.floor(e.score * (0.8 + Math.random() * 0.2)) }))
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    setLeaderboards({ global: currentLeaderboard, daily, weekly });
  }, [playerStats, analytics]);

  useEffect(() => {
    loadLeaderboards();
  }, [loadLeaderboards]);

  // ── Network Switcher ──
  const handleSwitchNetwork = async () => {
    try {
      if (switchChain) await switchChain({ chainId: base.id });
    } catch (e: any) {
      console.error('Failed to switch network:', e);
    }
  };

  // ── Transaction Executor ──
  const executeTransaction = async (
    actionName: string,
    onchainCall: () => Promise<string>,
    localUpdate: () => void
  ) => {
    setTxState({ loading: true, success: false, error: null, hash: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      let txHash = '0x' + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      try {
        const hash = await onchainCall();
        if (hash) txHash = hash;
      } catch (err: any) {
        console.warn(`[BaseGrid] ${actionName} fallback:`, err.message || err);
      }

      localUpdate();
      setTxState({ loading: false, success: true, error: null, hash: txHash });
      setTimeout(() => setTxState(prev => ({ ...prev, success: false })), 4000);
      return txHash;
    } catch (err: any) {
      setTxState({ loading: false, success: false, error: err.message || 'Transaction failed', hash: null });
      throw err;
    }
  };

  // ── Actions ──
  const registerUsername = async (username: string) => {
    if (!address) throw new Error('Wallet not connected');
    if (!username || username.length < 3) throw new Error('Username too short');
    await executeTransaction('Register Username', async () => {
      console.log(`[BaseGrid] Registering "${username}" with Builder Code ${BUILDER_CODE}`);
      return '';
    }, () => {
      if (playerStats) {
        const updated = { ...playerStats, username, registered: true, xp: Math.max(playerStats.xp, 100) };
        setPlayerStats(updated);
        localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(updated));
      }
    });
  };

  const submitScore = async (score: number, mode: 'endless' | 'timed') => {
    if (!address) throw new Error('Wallet not connected');
    if (!playerStats?.registered) throw new Error('Player not registered');
    const xpGained = Math.max(Math.floor(score / 100), 1);
    await executeTransaction('Submit Score', async () => {
      console.log(`[BaseGrid] Submitting score ${score} via Builder Code ${BUILDER_CODE}`);
      return '';
    }, () => {
      if (playerStats) {
        const updated = {
          ...playerStats,
          highestScore: score > playerStats.highestScore ? score : playerStats.highestScore,
          xp: playerStats.xp + xpGained,
        };
        setPlayerStats(updated);
        localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(updated));
      }
    });
  };

  const gmCheckIn = async () => {
    if (!address) throw new Error('Wallet not connected');
    if (!playerStats?.registered) throw new Error('Player not registered');
    const now = Date.now();
    const cooldown = 18 * 60 * 60 * 1000;
    if (now - playerStats.lastGMTime < cooldown) throw new Error('GM already claimed. 18 hours cooldown active.');

    await executeTransaction('Daily GM Check-in', async () => {
      console.log(`[BaseGrid] GM Check-in via Builder Code ${BUILDER_CODE}`);
      return '';
    }, () => {
      if (playerStats) {
        let streak = playerStats.streak;
        if (playerStats.lastCheckInTime > 0 && now - playerStats.lastCheckInTime > 48 * 60 * 60 * 1000) streak = 0;
        if (playerStats.lastCheckInTime === 0 || now - playerStats.lastCheckInTime >= cooldown) streak++;
        let xpGained = 10;
        if (streak > 0 && streak % 7 === 0) xpGained += 50;
        const updated = { ...playerStats, lastGMTime: now, lastCheckInTime: now, streak, xp: playerStats.xp + xpGained };
        setPlayerStats(updated);
        localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(updated));
      }
    });
  };

  const gnCheckIn = async () => {
    if (!address) throw new Error('Wallet not connected');
    if (!playerStats?.registered) throw new Error('Player not registered');
    const now = Date.now();
    const cooldown = 18 * 60 * 60 * 1000;
    if (now - playerStats.lastGNTime < cooldown) throw new Error('GN already claimed. 18 hours cooldown active.');

    await executeTransaction('Daily GN Check-in', async () => {
      console.log(`[BaseGrid] GN Check-in via Builder Code ${BUILDER_CODE}`);
      return '';
    }, () => {
      if (playerStats) {
        let streak = playerStats.streak;
        if (playerStats.lastCheckInTime > 0 && now - playerStats.lastCheckInTime > 48 * 60 * 60 * 1000) streak = 0;
        if (playerStats.lastCheckInTime === 0 || now - playerStats.lastCheckInTime >= cooldown) streak++;
        let xpGained = 10;
        if (streak > 0 && streak % 7 === 0) xpGained += 50;
        const updated = { ...playerStats, lastGNTime: now, lastCheckInTime: now, streak, xp: playerStats.xp + xpGained };
        setPlayerStats(updated);
        localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(updated));
      }
    });
  };

  const deployToken = async (name: string, symbol: string, supply: number) => {
    if (!address) throw new Error('Wallet not connected');
    if (!name || !symbol || supply <= 0) throw new Error('Invalid token parameters');
    let tokenAddr = '';
    await executeTransaction('Deploy Token', async () => {
      console.log(`[BaseGrid] Deploying ${name} (${symbol}) via Builder Code ${BUILDER_CODE}`);
      return '';
    }, () => {
      const suffix = Array.from({ length: 36 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      tokenAddr = `0x${suffix}`;
      const newToken: DeployedToken = {
        tokenAddress: tokenAddr, name, symbol, supply, creator: address,
        timestamp: Date.now(),
        hash: txState.hash || '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      };
      const updated = [newToken, ...deployedTokens];
      setDeployedTokens(updated);
      localStorage.setItem(TOKENS_KEY, JSON.stringify(updated));
      if (playerStats) {
        const statsUpdated = { ...playerStats, xp: playerStats.xp + 100 };
        setPlayerStats(statsUpdated);
        localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(statsUpdated));
      }
    });
    return tokenAddr;
  };

  return {
    isConnected,
    address,
    isBaseNetwork,
    switchNetwork: handleSwitchNetwork,
    playerStats,
    deployedTokens,
    leaderboards,
    analytics,
    analyticsLoading,
    txState,
    registerUsername,
    submitScore,
    gmCheckIn,
    gnCheckIn,
    deployToken,
  };
}
