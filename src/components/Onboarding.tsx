'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Zap, AlertTriangle, RefreshCw, Activity, Layers, Terminal, Sparkles } from 'lucide-react';
import { useBaseGrid } from '../hooks/useBaseGrid';

interface OnboardingProps {
  onOnboardComplete: () => void;
}

export default function Onboarding({ onOnboardComplete }: OnboardingProps) {
  const { 
    isConnected, 
    address, 
    isBaseNetwork, 
    switchNetwork, 
    playerStats, 
    registerUsername, 
    txState 
  } = useBaseGrid();

  const [usernameInput, setUsernameInput] = useState('');
  const [errorText, setErrorText] = useState('');

  // Auto proceed if onboarded
  useEffect(() => {
    if (isConnected && isBaseNetwork && playerStats?.registered) {
      onOnboardComplete();
    }
  }, [isConnected, isBaseNetwork, playerStats, onOnboardComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (usernameInput.trim().length < 3) {
      setErrorText('Username must be at least 3 characters.');
      return;
    }
    if (usernameInput.trim().length > 20) {
      setErrorText('Username must be at most 20 characters.');
      return;
    }

    try {
      await registerUsername(usernameInput.trim());
    } catch (err: any) {
      setErrorText(err.message || 'Registration failed. Try again.');
    }
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center py-10 md:py-16">
      
      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00D1FF]/10 blur-[100px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7B61FF]/10 blur-[100px] rounded-full pointer-events-none animate-pulse" />

      {/* Two Column Grid */}
      <div className="w-full max-w-7xl px-4 md:px-8 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-center relative z-10">
        
        {/* Left Side: Brand Widescreen Hero */}
        <div className="lg:col-span-7 flex flex-col text-left justify-center relative">
          
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 max-w-fit mb-6 shadow-[0_0_15px_rgba(0,209,255,0.05)]"
          >
            <Sparkles size={13} className="text-[#00FFA3]" />
            <span className="text-[10px] md:text-xs font-mono font-bold uppercase tracking-widest text-[#00D1FF]">
              Now Live on Base Mainnet
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase leading-none mb-4"
          >
            BASE<span className="gradient-text font-black text-transparent bg-clip-text">GRID</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/60 text-base md:text-lg lg:text-xl font-normal leading-relaxed max-w-xl mb-8"
          >
            A next-generation onchain arcade ecosystem. Sync your wallet telemetry, launch custom tokens, claim streaks, and dominate the global leaderboards.
          </motion.p>

          {/* Feature Bullet Points */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col gap-3.5 mb-8"
          >
            {[
              { text: "Fast-paced connected 8x8 neon energy cube arcade grid.", color: "text-[#00D1FF]" },
              { text: "1-Click Custom ERC20 token deployer using factory logic.", color: "text-[#7B61FF]" },
              { text: "Daily streak tracking and onchain GM/GN social integrations.", color: "text-[#00FFA3]" },
              { text: "Deep wallet audits calculating score telemetry, activity and records.", color: "text-[#00D1FF]" }
            ].map((bullet, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] glow-cyan" />
                </div>
                <span className="text-white/70 text-xs md:text-sm font-medium tracking-wide">{bullet.text}</span>
              </div>
            ))}
          </motion.div>

          {/* Ecosystem live statistics */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md max-w-2xl"
          >
            <div>
              <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Nodes Syncing</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">14,809</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Ecosystem XP</div>
              <div className="text-lg font-black text-[#00D1FF] font-mono mt-0.5">3.8M+</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Deployments</div>
              <div className="text-lg font-black text-[#7B61FF] font-mono mt-0.5">2,410</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Grid Refills</div>
              <div className="text-lg font-black text-[#00FFA3] font-mono mt-0.5">99.98%</div>
            </div>
          </motion.div>

        </div>

        {/* Right Side: Wallet Panel Form */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full bg-[#050816]/75 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,209,255,0.15)] relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00D1FF] to-transparent" />

            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00D1FF] mb-6 shadow-[0_0_20px_rgba(0,209,255,0.25)]">
              <Terminal size={24} />
            </div>

            <h2 className="text-2xl font-black text-white tracking-wide uppercase mb-1">
              Access Core
            </h2>
            <p className="text-white/60 text-xs mb-8">
              Decentralized login credentials validated via Base cryptography.
            </p>

            {/* Step 1: Connect Wallet */}
            {!isConnected && (
              <div className="flex flex-col items-center gap-6">
                <div className="text-xs font-mono uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#00D1FF] rounded-full animate-ping" />
                  Connection required
                </div>
                
                <div className="scale-105 my-2">
                  <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
                </div>

                <p className="text-xs text-white/40 leading-normal max-w-xs text-center font-mono">
                  Wallet signature verifies onchain identity and validates transaction pipeline permissions.
                </p>
              </div>
            )}

            {/* Step 2: Network Switch */}
            {isConnected && !isBaseNetwork && (
              <div className="flex flex-col items-center gap-6">
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex flex-col items-center gap-2">
                  <AlertTriangle size={28} className="animate-bounce" />
                  <div className="text-xs font-mono uppercase tracking-wider">Network Violation</div>
                </div>

                <p className="text-sm text-white/70 leading-relaxed max-w-xs text-center">
                  You are currently on an unsupported network. Please switch to the <span className="text-[#00D1FF] font-bold">Base</span> network to continue.
                </p>

                <button
                  onClick={switchNetwork}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00D1FF] to-[#7B61FF] hover:scale-105 text-white font-bold py-3.5 rounded-xl border border-blue-400/20 shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-all active:scale-95 text-xs uppercase tracking-widest font-mono"
                >
                  <RefreshCw size={14} className="animate-spin" />
                  Switch to Base
                </button>
              </div>
            )}

            {/* Step 3: Register Username */}
            {isConnected && isBaseNetwork && !playerStats?.registered && (
              <div className="flex flex-col items-center w-full">
                <div className="text-xs font-mono uppercase tracking-wider text-white/40 mb-4 flex items-center gap-1.5">
                  <User size={12} />
                  Identity Registry
                </div>

                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter username..."
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      disabled={txState.loading}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#00D1FF] focus:ring-1 focus:ring-[#00D1FF] transition-all font-semibold"
                    />
                  </div>

                  {errorText && (
                    <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-lg">
                      {errorText}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={txState.loading || usernameInput.trim().length < 3}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00D1FF] to-[#7B61FF] hover:scale-102 disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-3.5 rounded-xl border border-blue-400/20 shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-all active:scale-95 text-xs uppercase tracking-widest font-mono"
                  >
                    {txState.loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Transmitting Registry...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        Register Username
                      </>
                    )}
                  </button>
                </form>

                <p className="text-[9px] text-white/30 mt-4 leading-normal text-center font-mono uppercase tracking-widest">
                  Transaction includes Ecosystem Builder Code: <span className="text-[#00D1FF]">bc_7svp73o3</span>
                </p>
              </div>
            )}

            {/* Transition Loader */}
            {isConnected && isBaseNetwork && playerStats?.registered && (
              <div className="flex flex-col items-center gap-4 py-8">
                <RefreshCw size={28} className="text-[#00FFA3] animate-spin mb-2" />
                <div className="text-xs font-mono uppercase tracking-wider text-white/40">Syncing telemetry logs...</div>
              </div>
            )}

          </motion.div>
        </div>

      </div>

    </div>
  );
}
