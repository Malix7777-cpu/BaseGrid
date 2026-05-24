'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Sparkles, Coins, Hash, RefreshCw, Compass, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useBaseGrid } from '../hooks/useBaseGrid';

export default function TokenLauncher() {
  const { launchERC20Token, txState, deployedTokens } = useBaseGrid();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [supply, setSupply] = useState('1000000');
  const [errorText, setErrorText] = useState('');
  const [successToken, setSuccessToken] = useState<{ address: string; name: string; symbol: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setSuccessToken(null);

    if (!name.trim()) return setErrorText('Token Name is required.');
    if (!symbol.trim()) return setErrorText('Token Symbol is required.');
    
    const supplyNum = parseFloat(supply);
    if (isNaN(supplyNum) || supplyNum <= 0) {
      return setErrorText('Total Supply must be a positive number.');
    }

    try {
      const res = await launchERC20Token(name.trim(), symbol.trim(), supplyNum);
      if (res && res.contractAddress) {
        setSuccessToken({
          address: res.contractAddress,
          name: name.trim(),
          symbol: symbol.trim(),
        });
        setName('');
        setSymbol('');
        setSupply('1000000');
      }
    } catch (err: any) {
      setErrorText(err.message || 'Token generation transaction rejected.');
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* 1. CREATION PANEL (Left) */}
      <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-[0_0_35px_rgba(0,209,255,0.03)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00D1FF]/20 to-transparent" />
        
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00D1FF] shadow-[0_0_20px_rgba(0,209,255,0.25)]">
            <Rocket size={24} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">
              Token Factory Blueprints
            </h3>
            <p className="text-white/50 text-xs mt-0.5">Deploy customized ERC20 smart contracts on Base in 1-click</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Inputs Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/50 uppercase font-mono tracking-widest">Token Name</label>
              <input
                type="text"
                placeholder="e.g. Cyber Energy"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))}
                disabled={txState.loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#00D1FF] focus:ring-1 focus:ring-[#00D1FF] transition-all font-semibold"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/50 uppercase font-mono tracking-widest">Token Symbol</label>
              <input
                type="text"
                placeholder="e.g. CORE"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                disabled={txState.loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#00D1FF] focus:ring-1 focus:ring-[#00D1FF] transition-all font-semibold"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-white/50 uppercase font-mono tracking-widest">Initial Total Supply</label>
            <div className="relative">
              <input
                type="number"
                placeholder="e.g. 1000000"
                value={supply}
                onChange={(e) => setSupply(e.target.value)}
                disabled={txState.loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#00D1FF] focus:ring-1 focus:ring-[#00D1FF] transition-all font-semibold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/30 uppercase">
                Cubes
              </span>
            </div>
            <p className="text-[9px] text-white/30 font-mono uppercase mt-1">
              100% of supply is minted directly into the deploying wallet
            </p>
          </div>

          {errorText && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold">
              <AlertTriangle size={14} className="shrink-0 animate-pulse" />
              {errorText}
            </div>
          )}

          <button
            type="submit"
            disabled={txState.loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00D1FF] to-[#7B61FF] hover:scale-102 disabled:opacity-50 disabled:pointer-events-none text-white font-black py-4 rounded-xl border border-blue-400/20 shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-all active:scale-95 text-xs uppercase tracking-widest font-mono"
          >
            {txState.loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Processing Base Broadcast...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Deploy Smart Contract
              </>
            )}
          </button>
        </form>

        {/* Builder watermark */}
        <p className="text-[9px] text-white/30 text-center mt-5 font-mono uppercase tracking-widest">
          Deployments are signed with Base Builder Code: <span className="text-[#00D1FF]">bc_5jkexp2o</span>
        </p>

        {/* Success Modal */}
        <AnimatePresence>
          {successToken && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mt-6 p-5 bg-[#00FFA3]/5 border border-[#00FFA3]/20 rounded-2xl flex flex-col gap-3.5 relative overflow-hidden"
            >
              <div className="flex items-center gap-2 text-xs font-black text-[#00FFA3] uppercase tracking-wider font-mono">
                <CheckCircle2 size={16} />
                Contract successfully deployed!
              </div>
              <div className="text-xs text-white/70">
                Token <span className="text-white font-bold">{successToken.name} ({successToken.symbol})</span> is live on Base.
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-[10px] font-mono text-white/60">
                <span className="truncate flex-1">{successToken.address}</span>
                <a 
                  href={`https://basescan.org/address/${successToken.address}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[#00D1FF] hover:underline flex items-center gap-0.5 shrink-0"
                >
                  View <ExternalLink size={10} />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 2. REGISTRY HISTORY (Right) */}
      <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-[0_0_35px_rgba(0,209,255,0.03)] flex flex-col gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#7B61FF]/20 to-transparent" />
        
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
            <Coins size={16} className="text-[#7B61FF]" />
            Your Created Tokens
          </h4>
          <p className="text-xs text-white/50 font-medium">Onchain archive of your factory contracts</p>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto max-h-[340px] pr-1.5 scrollbar-thin">
          {deployedTokens.length === 0 ? (
            <div className="text-center py-10 bg-white/5 border border-white/5 rounded-2xl text-white/30 font-mono text-xs uppercase tracking-wider">
              No custom blueprints deployed yet
            </div>
          ) : (
            deployedTokens.map((token) => (
              <div 
                key={token.address}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-2 text-xs relative"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-black text-white text-sm">{token.name}</span>
                    <span className="bg-[#7B61FF]/10 text-[#7B61FF] font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-lg border border-[#7B61FF]/20 ml-2">
                      {token.symbol}
                    </span>
                  </div>
                  <a 
                    href={`https://basescan.org/address/${token.address}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-white/40 hover:text-[#00D1FF] transition-colors"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div className="font-mono text-[9px] text-white/30 truncate select-all">
                  {token.address}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
