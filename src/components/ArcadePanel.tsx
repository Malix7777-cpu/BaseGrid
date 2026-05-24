'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { Trophy, Flame, Zap, Play, RotateCcw, Award } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID = 20;
const CELL = 20;
const TICK_MS = 120;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = { x: number; y: number };

interface LeaderEntry {
  wallet: string;
  score: number;
  txHash: string;
  timestamp: number;
}

const LB_KEY = 'basegrid_snake_leaderboard';

function loadLB(): LeaderEntry[] {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]'); } catch { return []; }
}
function saveLB(lb: LeaderEntry[]) {
  localStorage.setItem(LB_KEY, JSON.stringify(lb));
}

function randFood(snake: Pos[]): Pos {
  let pos: Pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

const INIT_SNAKE: Pos[] = [
  { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }
];

export default function ArcadePanel() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [snake, setSnake] = useState<Pos[]>(INIT_SNAKE);
  const [food, setFood] = useState<Pos>({ x: 15, y: 10 });
  const [dir, setDir] = useState<Dir>('RIGHT');
  const [nextDir, setNextDir] = useState<Dir>('RIGHT');
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');
  const [totalGames, setTotalGames] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({ snake: INIT_SNAKE, food: { x: 15, y: 10 }, dir: 'RIGHT' as Dir, score: 0 });

  useEffect(() => {
    const lb = loadLB();
    setLeaderboard(lb);
    if (address) {
      const myBest = lb.filter(e => e.wallet === address).sort((a, b) => b.score - a.score)[0];
      if (myBest) setHighScore(myBest.score);
    }
  }, [address]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#050816';
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

    // Grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
      }
    }

    // Snake
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#00D1FF' : `rgba(0, 209, 255, ${Math.max(0.3, 1 - i * 0.04)})`;
      ctx.shadowColor = isHead ? '#00D1FF' : 'transparent';
      ctx.shadowBlur = isHead ? 12 : 0;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Food
    ctx.fillStyle = '#00FFA3';
    ctx.shadowColor = '#00FFA3';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Game over overlay
    if (gameOver) {
      ctx.fillStyle = 'rgba(5,8,22,0.75)';
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 20;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', GRID * CELL / 2, GRID * CELL / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`Score: ${score}`, GRID * CELL / 2, GRID * CELL / 2 + 20);
    }

    // Not started overlay
    if (!running && !gameOver) {
      ctx.fillStyle = 'rgba(5,8,22,0.6)';
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);
      ctx.fillStyle = '#00D1FF';
      ctx.shadowColor = '#00D1FF';
      ctx.shadowBlur = 15;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS PLAY', GRID * CELL / 2, GRID * CELL / 2);
      ctx.shadowBlur = 0;
    }
  }, [snake, food, gameOver, running, score]);

  // Game tick
  useEffect(() => {
    if (!running || gameOver) return;
    const interval = setInterval(() => {
      const { snake, food, dir, score } = gameRef.current;
      const head = snake[0];
      const newDir = nextDir;

      // Prevent reverse
      const blocked = (newDir === 'UP' && dir === 'DOWN') || (newDir === 'DOWN' && dir === 'UP') ||
        (newDir === 'LEFT' && dir === 'RIGHT') || (newDir === 'RIGHT' && dir === 'LEFT');
      const actualDir = blocked ? dir : newDir;
      gameRef.current.dir = actualDir;
      setDir(actualDir);

      const newHead: Pos = {
        x: head.x + (actualDir === 'RIGHT' ? 1 : actualDir === 'LEFT' ? -1 : 0),
        y: head.y + (actualDir === 'DOWN' ? 1 : actualDir === 'UP' ? -1 : 0),
      };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
        setRunning(false);
        setGameOver(true);
        setTotalGames(g => g + 1);
        autoSaveScore(score);
        return;
      }

      // Self collision
      if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        setRunning(false);
        setGameOver(true);
        setTotalGames(g => g + 1);
        autoSaveScore(score);
        return;
      }

      const ateFood = newHead.x === food.x && newHead.y === food.y;
      const newSnake = ateFood ? [newHead, ...snake] : [newHead, ...snake.slice(0, -1)];
      const newFood = ateFood ? randFood(newSnake) : food;
      const newScore = ateFood ? score + 10 : score;

      gameRef.current.snake = newSnake;
      gameRef.current.food = newFood;
      gameRef.current.score = newScore;

      setSnake([...newSnake]);
      setFood({ ...newFood });
      setScore(newScore);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [running, gameOver, nextDir]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' || e.key === 'w') setNextDir('UP');
      if (e.key === 'ArrowDown' || e.key === 's') setNextDir('DOWN');
      if (e.key === 'ArrowLeft' || e.key === 'a') setNextDir('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd') setNextDir('RIGHT');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function startGame() {
    setTxError('');
    setTxHash('');
    setSubmitted(false);

    // Pehle txn karo, phir game shuru hoga
    if (walletClient && address) {
      setSubmitting(true);
      try {
        const memo = `BaseGrid:Snake:GameStart:${Date.now()}`;
        const data = ('0x' + Buffer.from(memo, 'utf8').toString('hex')) as `0x${string}`;
        const hash = await walletClient.sendTransaction({
          to: address,
          value: BigInt(0),
          data,
        });
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        setTxHash(hash);
        setSubmitting(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error';
        setTxError(msg.includes('rejected') ? 'Transaction cancel kar di! Game shuru nahi hoga.' : msg.slice(0, 80));
        setSubmitting(false);
        return; // Txn fail — game mat chalao
      }
    }

    // Txn ho gayi — ab game shuru karo
    const initSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    const initFood = randFood(initSnake);
    gameRef.current = { snake: initSnake, food: initFood, dir: 'RIGHT', score: 0 };
    setSnake(initSnake);
    setFood(initFood);
    setDir('RIGHT');
    setNextDir('RIGHT');
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }

  // Auto save score locally on game over (no txn needed)
  function autoSaveScore(finalScore: number) {
    if (!address || finalScore === 0) return;
    const entry: LeaderEntry = {
      wallet: address,
      score: finalScore,
      txHash: txHash || 'local',
      timestamp: Date.now(),
    };
    const lb = loadLB();
    const updated = [...lb, entry].sort((a, b) => b.score - a.score).slice(0, 20);
    saveLB(updated);
    setLeaderboard(updated);
    setSubmitted(true);
    if (finalScore > highScore) setHighScore(finalScore);
  }

  async function submitScore() {
    if (!walletClient || !address || score === 0) return;
    setSubmitting(true);
    setTxError('');
    try {
      const memo = `BaseGrid:Snake:Score:${score}`;
      const data = ('0x' + Buffer.from(memo, 'utf8').toString('hex')) as `0x${string}`;
      const hash = await walletClient.sendTransaction({
        to: address,
        value: BigInt(0),
        data,
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });

      const entry: LeaderEntry = {
        wallet: address,
        score,
        txHash: hash,
        timestamp: Date.now(),
      };

      const lb = loadLB();
      const updated = [...lb, entry].sort((a, b) => b.score - a.score).slice(0, 20);
      saveLB(updated);
      setLeaderboard(updated);
      setTxHash(hash);
      setSubmitted(true);
      if (score > highScore) setHighScore(score);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setTxError(msg.includes('rejected') ? 'Transaction cancel kar di!' : msg.slice(0, 80));
    } finally {
      setSubmitting(false);
    }
  }

  // Mobile controls
  function mobileDir(d: Dir) {
    setNextDir(d);
  }

  return (
    <div className="w-full flex flex-col items-center gap-6">

      <h1 className="text-4xl font-black uppercase tracking-widest text-white mt-2">Arcade</h1>
      <p className="text-white/40 text-xs font-mono">Play Snake · Submit score on Base · Top leaderboard!</p>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
          <div className="text-[9px] text-white/40 font-mono uppercase mb-1">Score</div>
          <div className="text-2xl font-black text-[#00D1FF] font-mono">{score}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
          <div className="text-[9px] text-white/40 font-mono uppercase mb-1">Best</div>
          <div className="text-2xl font-black text-yellow-400 font-mono">{highScore}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
          <div className="text-[9px] text-white/40 font-mono uppercase mb-1">Games</div>
          <div className="text-2xl font-black text-[#00FFA3] font-mono">{totalGames}</div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID * CELL}
          height={GRID * CELL}
          className="rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,209,255,0.1)]"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-3">
          {!running && !gameOver && (
            <button onClick={startGame} disabled={submitting}
              className="flex items-center gap-2 bg-[#00D1FF] hover:bg-[#00baff] disabled:opacity-60 disabled:cursor-wait text-black font-black uppercase tracking-widest text-xs px-8 py-3.5 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(0,209,255,0.3)]">
              <Play size={16} /> {submitting ? 'Txn ho rahi hai...' : 'Play'}
            </button>
          )}
          {running && (
            <button onClick={() => { setRunning(false); setGameOver(true); setTotalGames(g => g + 1); }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs px-6 py-3.5 rounded-xl transition-all">
              Stop
            </button>
          )}
          {gameOver && (
            <button onClick={startGame} disabled={submitting}
              className="flex items-center gap-2 bg-[#00D1FF] hover:bg-[#00baff] disabled:opacity-60 disabled:cursor-wait text-black font-black uppercase tracking-widest text-xs px-6 py-3.5 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(0,209,255,0.3)]">
              <RotateCcw size={16} /> {submitting ? '⏳ Txn ho rahi hai...' : 'Play Again'}
            </button>
          )}
        </div>
        {submitting && (
          <div className="text-[10px] text-[#00D1FF] font-mono animate-pulse">
            ⛓️ Base pe txn ho rahi hai — wallet confirm karo...
          </div>
        )}
        {txError && (
          <div className="text-[10px] text-red-400 font-mono">{txError}</div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="flex flex-col items-center gap-2 md:hidden">
        <button onClick={() => mobileDir('UP')} className="w-14 h-10 bg-white/10 rounded-xl text-white font-black text-lg active:bg-white/20">↑</button>
        <div className="flex gap-2">
          <button onClick={() => mobileDir('LEFT')} className="w-14 h-10 bg-white/10 rounded-xl text-white font-black text-lg active:bg-white/20">←</button>
          <button onClick={() => mobileDir('DOWN')} className="w-14 h-10 bg-white/10 rounded-xl text-white font-black text-lg active:bg-white/20">↓</button>
          <button onClick={() => mobileDir('RIGHT')} className="w-14 h-10 bg-white/10 rounded-xl text-white font-black text-lg active:bg-white/20">→</button>
        </div>
        <div className="text-[9px] text-white/30 font-mono mt-1">Mobile controls</div>
      </div>

      {/* Leaderboard */}
      <div className="w-full max-w-lg bg-white/[0.02] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={14} className="text-yellow-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">Snake Leaderboard</span>
        </div>
        {leaderboard.length === 0 ? (
          <div className="text-center py-6 text-white/20 text-xs font-mono">Abhi koi score nahi — pehle khelo!</div>
        ) : (
          <div className="flex flex-col gap-2">
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div key={i} className={`flex items-center justify-between bg-black/20 rounded-xl px-4 py-2.5 border ${entry.wallet === address ? 'border-[#00D1FF]/30' : 'border-white/5'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div>
                    <div className="text-[10px] font-bold text-white font-mono">
                      {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                      {entry.wallet === address && <span className="ml-1 text-[#00D1FF]">(YOU)</span>}
                    </div>
                    <a href={`https://basescan.org/tx/${entry.txHash}`} target="_blank" rel="noopener noreferrer"
                      className="text-[9px] text-white/30 font-mono hover:text-[#00D1FF]">
                      {entry.txHash.slice(0, 10)}...
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-[#00D1FF] font-mono">{entry.score}</div>
                  <div className="text-[9px] text-white/30 font-mono">pts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[9px] text-white/20 font-mono uppercase tracking-widest">
        WASD / Arrow Keys to control · Submit score on Base
      </div>
    </div>
  );
}
