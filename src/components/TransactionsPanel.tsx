'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';

// Placeholder transaction list with fake data for demo
const sampleTxs = Array.from({ length: 10 }, (_, i) => ({
  hash: `0x${(i + 1).toString(16).padStart(64, '0')}`,
  method: i % 2 === 0 ? 'Swap' : 'Transfer',
  status: i % 3 === 0 ? 'success' : 'pending',
  gasUsed: (21000 + i * 5000).toString(),
}));

export default function TransactionsPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 overflow-y-auto max-h-[500px] shadow-[0_0_30px_rgba(0,209,255,0.03)]"
    >
      <h3 className="text-lg font-black text-white mb-4">Recent Transactions</h3>
      <div className="space-y-3">
        {sampleTxs.map((tx) => (
          <div
            key={tx.hash}
            className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-mono text-white/80">{tx.method}</span>
              <span className="text-xs text-white/40 font-mono">{tx.hash.slice(0, 8)}...{tx.hash.slice(-8)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded text-white/80 ${tx.status === 'success' ? 'bg-[#00FFA3]/10 border-[#00FFA3]/20' : 'bg-red-500/10 border-red-500/20'}`}> {tx.status} </span>
              <span className="text-white/50">Gas {parseInt(tx.gasUsed).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
