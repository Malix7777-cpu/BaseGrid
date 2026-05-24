'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchBar({ onAnalyze }: { onAnalyze: (address: string) => void }) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address) onAnalyze(address);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-2xl mx-auto mb-8">
      <input
        type="text"
        placeholder="Enter Base wallet address…"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#00D1FF] transition-colors"
      />
      <button
        type="submit"
        className="flex items-center gap-2 bg-[#00D1FF] hover:bg-[#00D1FF]/90 text-white font-medium py-2 px-5 rounded-2xl shadow-[0_0_15px_rgba(0,209,255,0.4)] transition-transform active:scale-95"
      >
        <Search size={16} />
        Analyze Wallet
      </button>
    </form>
  );
}
