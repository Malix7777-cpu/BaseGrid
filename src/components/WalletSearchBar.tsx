import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface WalletSearchBarProps {
  onAnalyze?: (address: string) => void;
}

export default function WalletSearchBar({ onAnalyze }: WalletSearchBarProps) {
  const [address, setAddress] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAnalyze && address) onAnalyze(address);
  };
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-md mx-auto w-full">
      <input
        type="text"
        placeholder="Enter wallet address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="flex-1 px-4 py-2 bg-[#020817]/60 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00D1FF] transition-colors"
      />
      <button
        type="submit"
        className="flex items-center gap-1 px-4 py-2 bg-[#00D1FF]/20 border border-[#00D1FF]/30 text-[#00D1FF] rounded-xl hover:bg-[#00D1FF]/30 transition-colors"
      >
        <Search size={16} />
        Analyze
      </button>
    </form>
  );
}
