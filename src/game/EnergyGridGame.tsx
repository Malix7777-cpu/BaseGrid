'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ShieldAlert, Award, Clock, Flame, Zap, Compass, Activity, Volume2, VolumeX, Sparkles } from 'lucide-react';

// Block Definition
interface Block {
  id: string;
  color: 'blue' | 'cyan' | 'purple' | 'pink' | 'green';
  type: 'normal' | 'surge' | 'pulse' | 'core';
}

interface FloatingText {
  id: string;
  text: string;
  x: number; // grid percentage X
  y: number; // grid percentage Y
  color: string;
}

interface EnergyGridGameProps {
  mode: 'endless' | 'timed';
  onGameOver: (score: number) => void;
  onBackToDashboard: () => void;
}

const COLORS: Block['color'][] = ['blue', 'cyan', 'purple', 'pink', 'green'];
const COLOR_MAP: Record<Block['color'], { bg: string; border: string; glow: string; text: string; lightGlow: string }> = {
  blue: { 
    bg: 'bg-gradient-to-br from-[#0052FF] to-[#002D9E]', 
    border: 'border-[#00D1FF]/40', 
    glow: 'rgba(0,209,255,0.5)', 
    text: 'text-[#00D1FF]',
    lightGlow: 'shadow-[0_0_15px_rgba(0,209,255,0.4)]'
  },
  cyan: { 
    bg: 'bg-gradient-to-br from-[#00F0FF] to-[#00949E]', 
    border: 'border-[#A3F7FF]/50', 
    glow: 'rgba(0,240,255,0.5)', 
    text: 'text-[#00F0FF]',
    lightGlow: 'shadow-[0_0_15px_rgba(0,240,255,0.4)]'
  },
  purple: { 
    bg: 'bg-gradient-to-br from-[#7B61FF] to-[#452D9E]', 
    border: 'border-[#EA9CFF]/50', 
    glow: 'rgba(123,97,255,0.5)', 
    text: 'text-[#7B61FF]',
    lightGlow: 'shadow-[0_0_15px_rgba(123,97,255,0.4)]'
  },
  pink: { 
    bg: 'bg-gradient-to-br from-[#FF007A] to-[#9E004B]', 
    border: 'border-[#FFA8D3]/50', 
    glow: 'rgba(255,0,122,0.5)', 
    text: 'text-[#FF007A]',
    lightGlow: 'shadow-[0_0_15px_rgba(255,0,122,0.4)]'
  },
  green: { 
    bg: 'bg-gradient-to-br from-[#00FFA3] to-[#009E64]', 
    border: 'border-[#C2FFD6]/50', 
    glow: 'rgba(0,255,163,0.5)', 
    text: 'text-[#00FFA3]',
    lightGlow: 'shadow-[0_0_15px_rgba(0,255,163,0.4)]'
  },
};

// Web Audio API Synthesizer Helper
const playSound = (type: 'match' | 'special' | 'combo' | 'gameover' | 'level', soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'match') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'special') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'combo') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.65);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.65);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } else if (type === 'level') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
};

export default function EnergyGridGame({ mode, onGameOver, onBackToDashboard }: EnergyGridGameProps) {
  const GRID_SIZE = 8;
  
  // Game states
  const [grid, setGrid] = useState<Block[][]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [energy, setEnergy] = useState(100); 
  const [timeLeft, setTimeLeft] = useState(60); 
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [comboTimeout, setComboTimeout] = useState<NodeJS.Timeout | null>(null);

  const energyInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Sound toggler
  const toggleSound = () => setSoundEnabled(!soundEnabled);

  // Initialize a random block
  const createRandomBlock = useCallback((forceType?: Block['type']): Block => {
    const id = Math.random().toString(36).substring(2, 9);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    let type: Block['type'] = 'normal';
    if (forceType) {
      type = forceType;
    } else {
      const rand = Math.random();
      if (rand < 0.02) type = 'core';
      else if (rand < 0.05) type = 'pulse';
      else if (rand < 0.08) type = 'surge';
    }

    return { id, color, type };
  }, []);

  // Generate 8x8 starting grid
  const generateGrid = useCallback(() => {
    const newGrid: Block[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: Block[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(createRandomBlock());
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  }, [GRID_SIZE, createRandomBlock]);

  // Start the game
  const startGame = () => {
    setScore(0);
    setCombo(1);
    setEnergy(100);
    setTimeLeft(60);
    setIsEnded(false);
    setIsStarted(true);
    generateGrid();
    playSound('level', soundEnabled);
  };

  // End the game
  const endGame = useCallback(() => {
    setIsEnded(true);
    setIsStarted(false);
    playSound('gameover', soundEnabled);
    onGameOver(score);
  }, [score, onGameOver, soundEnabled]);

  // Manage Timers
  useEffect(() => {
    if (isStarted && !isEnded) {
      if (mode === 'timed') {
        timerInterval.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerInterval.current!);
              endGame();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Endless Mode - energy drains over time, drains faster as score increases!
        energyInterval.current = setInterval(() => {
          setEnergy((prev) => {
            const drainRate = 2.2 + score / 4200.0; 
            const nextEnergy = prev - drainRate;
            if (nextEnergy <= 0) {
              clearInterval(energyInterval.current!);
              endGame();
              return 0;
            }
            return nextEnergy;
          });
        }, 1000);
      }
    }

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (energyInterval.current) clearInterval(energyInterval.current);
    };
  }, [isStarted, isEnded, mode, score, endGame]);

  // Find all connected blocks of same color (BFS)
  const findConnected = (startRow: number, startCol: number, targetColor: Block['color'], currentGrid: Block[][]) => {
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const queue: [number, number][] = [[startRow, startCol]];
    const group: [number, number][] = [];
    visited[startRow][startCol] = true;

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      group.push([r, c]);

      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];

      for (const [nr, nc] of neighbors) {
        if (
          nr >= 0 &&
          nr < GRID_SIZE &&
          nc >= 0 &&
          nc < GRID_SIZE &&
          !visited[nr][nc] &&
          currentGrid[nr][nc] &&
          currentGrid[nr][nc].color === targetColor
        ) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }

    return group;
  };

  // Add floating text
  const addFloatingText = (text: string, row: number, col: number, colorClass: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const x = (col / GRID_SIZE) * 100 + 6;
    const y = (row / GRID_SIZE) * 100 + 6;

    const newText: FloatingText = { id, text, x, y, color: colorClass };
    setFloatingTexts((prev) => [...prev, newText]);

    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
    }, 1000);
  };

  // Handle Tap Action
  const handleBlockTap = (row: number, col: number) => {
    if (!isStarted || isEnded) return;

    const tappedBlock = grid[row]?.[col];
    if (!tappedBlock) return;

    const targetColor = tappedBlock.color;
    const connectedGroup = findConnected(row, col, targetColor, grid);

    const isSpecialTapped = tappedBlock.type !== 'normal';
    if (connectedGroup.length < 2 && !isSpecialTapped) return;

    const blocksToDestroy = new Set<string>(); 
    
    connectedGroup.forEach(([r, c]) => {
      blocksToDestroy.add(`${r},${c}`);
    });

    let specialTriggered = false;
    const newSpawns: { r: number; c: number; type: Block['type'] }[] = [];

    const triggerSpecial = (r: number, c: number, type: Block['type']) => {
      specialTriggered = true;
      if (type === 'surge') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              blocksToDestroy.add(`${nr},${nc}`);
            }
          }
        }
      } else if (type === 'pulse') {
        for (let nc = 0; nc < GRID_SIZE; nc++) {
          blocksToDestroy.add(`${r},${nc}`);
        }
      } else if (type === 'core') {
        for (let nc = 0; nc < GRID_SIZE; nc++) {
          blocksToDestroy.add(`${r},${nc}`);
        }
        for (let nr = 0; nr < GRID_SIZE; nr++) {
          blocksToDestroy.add(`${nr},${col}`);
        }
      }
    };

    connectedGroup.forEach(([r, c]) => {
      const b = grid[r][c];
      if (b.type !== 'normal') {
        triggerSpecial(r, c, b.type);
      }
    });

    if (isSpecialTapped && connectedGroup.length < 2) {
      triggerSpecial(row, col, tappedBlock.type);
    }

    if (connectedGroup.length >= 6 && !specialTriggered) {
      let spawnType: Block['type'] = 'surge';
      if (connectedGroup.length >= 10) spawnType = 'core';
      else if (connectedGroup.length >= 8) spawnType = 'pulse';
      
      newSpawns.push({ r: row, c: col, type: spawnType });
    }

    const finalDestroyCoords = Array.from(blocksToDestroy).map((str) => {
      const [r, c] = str.split(',').map(Number);
      return { r, c };
    });

    const destroyCount = finalDestroyCoords.length;

    if (comboTimeout) clearTimeout(comboTimeout);
    
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    playSound(specialTriggered ? 'special' : 'match', soundEnabled);
    if (nextCombo > 2) {
      playSound('combo', soundEnabled);
    }

    const tOut = setTimeout(() => {
      setCombo(1);
    }, 1500);
    setComboTimeout(tOut);

    const basePts = destroyCount * 10;
    const finalPts = basePts * combo;
    setScore((prev) => prev + finalPts);

    const colorStyle = COLOR_MAP[targetColor].text;
    const floatMsg = `+${finalPts}${combo > 1 ? ` (x${combo} Multiplier!)` : ''}`;
    addFloatingText(floatMsg, row, col, colorStyle);

    if (mode === 'endless') {
      setEnergy((prev) => Math.min(prev + (destroyCount * 0.85 * combo), 100));
    }

    const nextGrid = [...grid.map((r) => [...r])];

    finalDestroyCoords.forEach(({ r, c }) => {
      nextGrid[r][c] = null as any;
    });

    for (let c = 0; c < GRID_SIZE; c++) {
      const survivors: Block[] = [];
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (nextGrid[r][c] !== null) {
          survivors.push(nextGrid[r][c]);
        }
      }

      const colSpawns = newSpawns.filter(s => s.c === c);

      let writeIdx = GRID_SIZE - 1;
      survivors.forEach((block) => {
        nextGrid[writeIdx][c] = block;
        writeIdx--;
      });

      colSpawns.forEach(spawn => {
        if (writeIdx >= 0) {
          nextGrid[writeIdx][c] = createRandomBlock(spawn.type);
          writeIdx--;
        }
      });

      while (writeIdx >= 0) {
        nextGrid[writeIdx][c] = createRandomBlock();
        writeIdx--;
      }
    }

    setGrid(nextGrid);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-4 md:px-0">
      
      {/* HUD Header with glassmorphism */}
      <div className="w-full flex items-center justify-between bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-5 mb-6 gap-4 shadow-[0_0_35px_rgba(0,209,255,0.06)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D1FF]/20 to-transparent" />
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#00D1FF]/10 border border-[#00D1FF]/20 text-[#00D1FF] shadow-[0_0_15px_rgba(0,209,255,0.15)]">
            <Compass size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="text-[9px] text-white/40 font-mono tracking-widest uppercase">Grid Mode</div>
            <div className="text-xs md:text-sm font-black text-white uppercase flex items-center gap-1.5 mt-0.5 font-mono">
              {mode === 'endless' ? (
                <>
                  <Activity size={14} className="text-[#00FFA3] animate-pulse" />
                  Endless Survival
                </>
              ) : (
                <>
                  <Clock size={14} className="text-[#00D1FF]" />
                  60s Challenge
                </>
              )}
            </div>
          </div>
        </div>

        {/* Score Counter */}
        <div className="text-center">
          <div className="text-[9px] text-white/40 font-mono tracking-widest uppercase">Telemetry Score</div>
          <motion.div 
            key={score}
            initial={{ scale: 1.15, textShadow: '0 0 20px rgba(0,209,255,0.8)' }}
            animate={{ scale: 1, textShadow: '0 0 0px rgba(0,0,0,0)' }}
            transition={{ duration: 0.2 }}
            className="text-2xl md:text-3xl font-black text-[#00D1FF] font-mono mt-0.5 tracking-wide drop-shadow-[0_0_10px_rgba(0,209,255,0.4)]"
          >
            {score.toLocaleString()}
          </motion.div>
        </div>

        {/* Timer or Energy Bar */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            {mode === 'timed' ? (
              <>
                <div className="text-[9px] text-white/40 font-mono tracking-widest uppercase font-mono">Time Left</div>
                <div className={`text-xl md:text-2xl font-black font-mono mt-0.5 ${timeLeft < 15 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
                  {timeLeft}s
                </div>
              </>
            ) : (
              <>
                <div className="text-[9px] text-white/40 font-mono tracking-widest uppercase">Grid Energy</div>
                <div className="w-24 md:w-32 bg-white/10 h-3 rounded-full overflow-hidden border border-white/5 mt-1.5 p-[1px] relative">
                  <motion.div 
                    animate={{ width: `${energy}%` }}
                    transition={{ ease: 'easeOut', duration: 0.4 }}
                    className={`h-full rounded-full ${
                      energy > 50 ? 'bg-gradient-to-r from-[#00D1FF] to-[#7B61FF] shadow-[0_0_10px_rgba(0,209,255,0.4)]' : 
                      energy > 20 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 
                      'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    }`}
                  />
                </div>
              </>
            )}
          </div>

          <button 
            onClick={toggleSound}
            className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/80 transition-all shadow-[0_0_10px_rgba(255,255,255,0.02)]"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Main Grid Viewport (Widescreen up to 560px) */}
      <div className="relative w-full aspect-square max-w-[560px] bg-white/[0.01] rounded-[32px] border border-white/10 shadow-[0_0_40px_rgba(0,209,255,0.08)] p-4 overflow-hidden flex items-center justify-center backdrop-blur-md">
        
        {/* Onboarding Start Panel Overlay */}
        <AnimatePresence>
          {!isStarted && !isEnded && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00D1FF] mb-5 shadow-[0_0_20px_rgba(0,209,255,0.25)]">
                <Zap size={36} className="animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-wide uppercase">
                BaseGrid Core Grid
              </h2>
              <p className="text-white/60 text-sm max-w-sm mb-8 leading-relaxed">
                Connect adjacent blocks of 2 or more of the same color. Create large matching blocks of 6+ to spawn Pulse, Surge, and Core specials!
              </p>

              <button
                onClick={startGame}
                className="group relative flex items-center gap-2.5 bg-gradient-to-r from-[#00D1FF] to-[#7B61FF] hover:scale-105 text-white font-black px-10 py-4 rounded-2xl border border-blue-400/20 shadow-[0_0_25px_rgba(0,209,255,0.4)] transition-all text-sm tracking-widest uppercase font-mono"
              >
                <Play size={18} fill="white" className="group-hover:translate-x-0.5 transition-transform" />
                Initialize Grid
              </button>
            </motion.div>
          )}

          {/* Game Over Panel Overlay */}
          {isEnded && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-5 shadow-[0_0_20px_rgba(239,68,68,0.25)] animate-pulse">
                <ShieldAlert size={36} />
              </div>
              <h2 className="text-3xl font-black text-white mb-1 tracking-wide uppercase text-red-500">
                Core Overloaded
              </h2>
              <p className="text-white/50 text-[10px] font-mono uppercase mb-6 tracking-widest">
                Grid Telemetry Safe shutdown
              </p>
              
              <div className="bg-white/5 border border-white/5 rounded-3xl py-5 px-10 mb-8 backdrop-blur-sm min-w-[220px]">
                <div className="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-1.5">Score Captured</div>
                <div className="text-4xl font-black text-[#00D1FF] font-mono leading-none tracking-wide drop-shadow-[0_0_12px_rgba(0,209,255,0.5)]">
                  {score.toLocaleString()}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#00D1FF] to-[#7B61FF] hover:scale-105 text-white font-bold px-7 py-4 rounded-xl border border-blue-400/20 shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-all active:scale-95 text-xs uppercase tracking-wider font-mono"
                >
                  <RotateCcw size={16} />
                  Re-Initialize
                </button>
                
                <button
                  onClick={onBackToDashboard}
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/15 px-7 py-4 rounded-xl transition-all active:scale-95 text-xs font-semibold tracking-wider font-mono"
                >
                  Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 8x8 Grid Container */}
        {grid.length > 0 && (
          <div className="grid grid-cols-8 grid-rows-8 gap-2 w-full h-full relative">
            {grid.map((row, rIdx) => 
              row.map((block, cIdx) => {
                if (!block) return <div key={`empty-${rIdx}-${cIdx}`} className="bg-transparent" />;
                
                const styles = COLOR_MAP[block.color];

                return (
                  <motion.button
                    key={block.id}
                    layoutId={block.id}
                    onClick={() => handleBlockTap(rIdx, cIdx)}
                    whileHover={{ scale: 1.08, zIndex: 10 }}
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                    className={`w-full h-full rounded-2xl border-2 ${styles.bg} ${styles.border} flex items-center justify-center relative cursor-pointer group shadow-lg`}
                    style={{
                      boxShadow: `0 0 12px ${styles.glow}, inset 0 2px 4px rgba(255,255,255,0.25)`
                    }}
                  >
                    {/* Glowing Aura inside */}
                    <div className="absolute inset-1 bg-white/10 rounded-xl blur-[1px] opacity-40 group-hover:opacity-100 transition-opacity" />

                    {/* Special Block Icons and Animations */}
                    {block.type === 'surge' && (
                      <div className="absolute inset-0 flex items-center justify-center text-white z-10 animate-pulse">
                        <Zap size={20} fill="white" className="drop-shadow-[0_0_8px_white] text-white" />
                      </div>
                    )}
                    {block.type === 'pulse' && (
                      <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                        <span className="w-5 h-1.5 bg-white rounded-full animate-ping absolute" />
                        <span className="w-6 h-2 bg-white/95 rounded-full drop-shadow-[0_0_8px_white] z-10" />
                      </div>
                    )}
                    {block.type === 'core' && (
                      <div className="absolute inset-0 flex items-center justify-center text-white z-10 animate-spin">
                        <RotateCcw size={20} className="text-white drop-shadow-[0_0_10px_white]" />
                      </div>
                    )}
                  </motion.button>
                );
              })
            )}

            {/* Floating Score/Combo Texts */}
            <AnimatePresence>
              {floatingTexts.map((txt) => (
                <motion.div
                  key={txt.id}
                  initial={{ opacity: 0, y: `${txt.y}%`, scale: 0.6 }}
                  animate={{ opacity: 1, y: `${txt.y - 14}%`, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                  className={`absolute font-black z-30 font-mono pointer-events-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] text-center text-base md:text-xl`}
                  style={{
                    left: `${txt.x}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className={`${txt.color} drop-shadow-[0_0_10px_currentColor]`}>{txt.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Combo / Multiplier Spark HUD with glows */}
      <div className="w-full max-w-[560px] flex items-center justify-center gap-1.5 mt-4 h-12">
        <AnimatePresence>
          {combo > 1 && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="flex items-center gap-2 bg-[#7B61FF]/10 border border-[#7B61FF]/30 px-5 py-2 rounded-full backdrop-blur-md text-xs font-bold text-white shadow-[0_0_20px_rgba(123,97,255,0.25)] font-mono tracking-widest uppercase"
            >
              <Flame size={14} className="text-[#FF007A] animate-pulse" />
              Active Combo <span className="text-[#00D1FF] font-black font-sans text-sm">x{combo}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick HUD notes */}
      <div className="mt-4 text-center max-w-md">
        <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest">
          Surge: 3x3 Blast • Pulse: Row Sweep • Core: Cross Blast Core
        </div>
      </div>
    </div>
  );
}
