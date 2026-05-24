import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Coin, FileText, BarChart, ShoppingBag, Grid } from 'lucide-react';
import ScoreCard from './ScoreCard';
import ActivityHeatmap from './ActivityHeatmap';
import StatsGrid from './StatsGrid';
import TransactionsPanel from './TransactionsPanel';

export default function WalletStatsPanel() {
  const [loading, setLoading] = useState(true);
  const [mockData, setMockData] = useState<any>(null);

  useEffect(() => {
    // Simulate async fetch
    const timer = setTimeout(() => {
      setMockData({
        score: 12345,
        ethBalance: 1.23,
        txCount: 56,
        tokenTransfers: 78,
        nftTransfers: 9,
        contractsDeployed: 3,
        activeDays: 12,
        streak: { current: 4, longest: 10 },
      });
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const skeleton = (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-white/10 rounded w-1/3"></div>
      <div className="h-40 bg-white/10 rounded"></div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-black text-white text-center">Wallet Stats</h1>
      {loading ? (
        skeleton
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid gap-6 lg:grid-cols-2"
        >
          <ScoreCard score={mockData.score} ethBalance={mockData.ethBalance} />
          <ActivityHeatmap />
          <StatsGrid
            txCount={mockData.txCount}
            tokenTransfers={mockData.tokenTransfers}
            nftTransfers={mockData.nftTransfers}
            contractsDeployed={mockData.contractsDeployed}
            activeDays={mockData.activeDays}
            currentStreak={mockData.streak.current}
            longestStreak={mockData.streak.longest}
          />
          <TransactionsPanel />
        </motion.div>
      )}
    </div>
  );
}
