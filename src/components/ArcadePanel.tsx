'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { Trophy, Zap, Play, RotateCcw } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const LANE_COUNT = 3;
const CAR_W = 42;
const CAR_H = 84;
const OBJ_W = 40;
const OBJ_H = 50;
const NITRO_MAX = 220;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string; alpha: number;
  size: number; decay: number;
}

interface GameObject {
  x: number; y: number;
  lane: number;
  type: 'obstacle' | 'coin' | 'nitro';
  active: boolean;
}

interface LeaderEntry {
  wallet: string;
  score: number;
  txHash: string;
  timestamp: number;
}

const LB_KEY = 'basegrid_car_leaderboard';

function loadLB(): LeaderEntry[] {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]'); } catch { return []; }
}
function saveLB(lb: LeaderEntry[]) {
  localStorage.setItem(LB_KEY, JSON.stringify(lb));
}

export default function ArcadePanel() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [nitroActive, setNitroActive] = useState(false);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');

  // Touch state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const gameState = useRef({
    playerLane: 1,
    speed: 6,
    baseSpeed: 6,
    distance: 0,
    objects: [] as GameObject[],
    particles: [] as Particle[],
    lastObjectSpawn: 0,
    nitroTimer: 0,
    laneWidth: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    shakeTime: 0,
    shakeIntensity: 0,
    roadOffset: 0,
    score: 0,
    combo: 1,
    maxCombo: 1,
    nitroActive: false,
  });

  const isPlayingRef = useRef(false);
  const isGameOverRef = useRef(false);

  // Load leaderboard & highscore
  useEffect(() => {
    const lb = loadLB();
    setLeaderboard(lb);
    if (address) {
      const myBest = lb.filter(e => e.wallet === address).sort((a, b) => b.score - a.score)[0];
      if (myBest) setHighScore(myBest.score);
    }
  }, [address]);

  // ── Particle helpers ─────────────────────────────────────────────────────────
  const spawnExplosion = (x: number, y: number, color: string, count = 15) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      gameState.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color, alpha: 1,
        size: Math.random() * 4 + 2,
        decay: Math.random() * 0.03 + 0.015,
      });
    }
  };

  const spawnSparkle = (x: number, y: number, color: string) => {
    gameState.current.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2 + 1,
      color, alpha: 0.8,
      size: Math.random() * 2 + 1,
      decay: 0.022,
    });
  };

  const spawnObject = () => {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const r = Math.random();
    const type: GameObject['type'] = r > 0.93 ? 'nitro' : r > 0.75 ? 'coin' : 'obstacle';
    gameState.current.objects.push({ x: 0, y: -OBJ_H, lane, type, active: true });
  };

  const triggerShake = (dur: number, intens: number) => {
    gameState.current.shakeTime = dur;
    gameState.current.shakeIntensity = intens;
  };

  // ── Auto save score ───────────────────────────────────────────────────────────
  const autoSaveScore = useCallback((finalScore: number) => {
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
    if (finalScore > highScore) setHighScore(finalScore);
  }, [address, txHash, highScore]);

  // ── End game ─────────────────────────────────────────────────────────────────
  const endGame = useCallback(() => {
    const s = gameState.current;
    isPlayingRef.current = false;
    isGameOverRef.current = true;
    setIsPlaying(false);
    setIsGameOver(true);
    setScore(s.score);
    setMaxCombo(s.maxCombo);
    setTotalGames(g => g + 1);
    autoSaveScore(s.score);
  }, [autoSaveScore]);

  // ── Draw car ────────────────────────────────────────────────────────────────
  const drawCar = (ctx: CanvasRenderingContext2D, pX: number, pY: number, nitro: boolean) => {
    ctx.save();
    ctx.shadowColor = nitro ? '#00ffff' : '#ff00ff';
    ctx.shadowBlur = nitro ? 30 : 20;
    ctx.fillStyle = nitro ? '#ffffff' : '#141426';
    ctx.beginPath();
    (ctx as any).roundRect(pX, pY, CAR_W, CAR_H, 8);
    ctx.fill();
    ctx.strokeStyle = nitro ? '#00ffff' : '#ff00ff';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Side panels
    ctx.fillStyle = nitro ? '#00e1ff' : '#8800cc';
    ctx.fillRect(pX + 2, pY + 18, 6, CAR_H - 36);
    ctx.fillRect(pX + CAR_W - 8, pY + 18, 6, CAR_H - 36);
    // Spoilers
    ctx.fillStyle = nitro ? '#00e1ff' : '#bd00ff';
    ctx.fillRect(pX - 4, pY + CAR_H - 22, 4, 18);
    ctx.fillRect(pX + CAR_W, pY + CAR_H - 22, 4, 18);
    // Windshield
    ctx.fillStyle = nitro ? 'rgba(0,255,255,0.7)' : 'rgba(255,0,255,0.6)';
    ctx.beginPath();
    (ctx as any).roundRect(pX + 6, pY + 22, CAR_W - 12, CAR_H * 0.28, 4);
    ctx.fill();
    // Headlights
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
    ctx.fillRect(pX + 5, pY - 4, 8, 5);
    ctx.fillRect(pX + CAR_W - 13, pY - 4, 8, 5);
    // Taillights
    ctx.fillStyle = '#ff0055'; ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 8;
    ctx.fillRect(pX + 4, pY + CAR_H - 3, 10, 4);
    ctx.fillRect(pX + CAR_W - 14, pY + CAR_H - 3, 10, 4);
    ctx.restore();
  };

  const drawEnemyCar = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
    ctx.save();
    ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#1a0010';
    ctx.beginPath();
    (ctx as any).roundRect(obj.x, obj.y, OBJ_W, OBJ_H, 6);
    ctx.fill();
    ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2.5; ctx.stroke();
    // Front lights
    ctx.fillStyle = '#ff4444'; ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 8;
    ctx.fillRect(obj.x + 4, obj.y, 8, 4);
    ctx.fillRect(obj.x + OBJ_W - 12, obj.y, 8, 4);
    // Windshield
    ctx.fillStyle = 'rgba(255,0,80,0.4)';
    ctx.beginPath();
    (ctx as any).roundRect(obj.x + 5, obj.y + 10, OBJ_W - 10, 14, 3);
    ctx.fill();
    // Rear lights
    ctx.fillStyle = '#ffaa00'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 6;
    ctx.fillRect(obj.x + 4, obj.y + OBJ_H - 4, 8, 4);
    ctx.fillRect(obj.x + OBJ_W - 12, obj.y + OBJ_H - 4, 8, 4);
    ctx.restore();
  };

  // ── Main game loop ────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize
    const wrap = canvas.parentElement;
    if (wrap) {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gameState.current.canvasWidth = w;
        gameState.current.canvasHeight = h;
        gameState.current.laneWidth = w / LANE_COUNT;
      }
    }

    const s = gameState.current;

    // ── Update ───────────────────────────────────────────────────────────────
    if (isPlayingRef.current && !isGameOverRef.current) {
      s.roadOffset = (s.roadOffset + s.speed) % 80;
      s.distance += s.speed;

      if (!s.nitroActive) {
        s.speed = s.baseSpeed + Math.floor(s.distance / 1200);
      } else {
        s.speed = s.baseSpeed * 2.3;
        s.nitroTimer--;
        if (s.nitroTimer <= 0) {
          s.nitroActive = false;
          setNitroActive(false);
        }
      }

      if (s.shakeTime > 0) s.shakeTime--;

      // Score
      const sc = Math.floor(s.distance / 12);
      if (sc > s.score) { s.score = sc; setScore(sc); }

      // Spawn
      s.lastObjectSpawn++;
      const spawnRate = Math.max(25, 90 - s.speed * 2);
      if (s.lastObjectSpawn > spawnRate) { spawnObject(); s.lastObjectSpawn = 0; }

      // Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
        if (p.alpha <= 0) s.particles.splice(i, 1);
      }

      const pX = s.laneWidth * s.playerLane + (s.laneWidth - CAR_W) / 2;
      const pY = s.canvasHeight - CAR_H - 35;

      // Exhaust sparkles
      if (s.nitroActive) {
        spawnSparkle(pX + CAR_W * 0.25, pY + CAR_H, '#00ffff');
        spawnSparkle(pX + CAR_W * 0.75, pY + CAR_H, '#00ffff');
      } else {
        spawnSparkle(pX + CAR_W * 0.25, pY + CAR_H, '#ff00ff');
        spawnSparkle(pX + CAR_W * 0.75, pY + CAR_H, '#ff00ff');
      }

      // Object update + collision
      for (let i = s.objects.length - 1; i >= 0; i--) {
        const obj = s.objects[i];
        if (!obj.active) continue;
        obj.y += s.speed;
        obj.x = s.laneWidth * obj.lane + (s.laneWidth - OBJ_W) / 2;

        const hit = pX < obj.x + OBJ_W && pX + CAR_W > obj.x && pY < obj.y + OBJ_H && pY + CAR_H > obj.y;
        if (hit) {
          if (obj.type === 'obstacle') {
            if (!s.nitroActive) {
              triggerShake(35, 12);
              spawnExplosion(obj.x + OBJ_W / 2, obj.y + OBJ_H / 2, '#ff3b30', 30);
              spawnExplosion(pX + CAR_W / 2, pY + CAR_H / 2, '#ffcc00', 20);
              endGame();
              return;
            } else {
              obj.active = false;
              triggerShake(15, 6);
              spawnExplosion(obj.x + OBJ_W / 2, obj.y + OBJ_H / 2, '#00f6ff', 15);
              s.score += 100 * s.combo;
              s.combo++;
              if (s.combo > s.maxCombo) s.maxCombo = s.combo;
              setCombo(s.combo);
            }
          } else if (obj.type === 'coin') {
            obj.active = false;
            triggerShake(5, 2);
            spawnExplosion(obj.x + OBJ_W / 2, obj.y + OBJ_H / 2, '#ffcc00', 10);
            s.score += 150 * s.combo;
            s.combo++;
            if (s.combo > s.maxCombo) s.maxCombo = s.combo;
            setCombo(s.combo);
          } else if (obj.type === 'nitro') {
            obj.active = false;
            triggerShake(20, 8);
            spawnExplosion(obj.x + OBJ_W / 2, obj.y + OBJ_H / 2, '#00ffff', 20);
            s.nitroActive = true;
            s.nitroTimer = NITRO_MAX;
            setNitroActive(true);
            s.combo += 2;
            if (s.combo > s.maxCombo) s.maxCombo = s.combo;
            setCombo(s.combo);
          }
        }
        if (obj.y > s.canvasHeight) s.objects.splice(i, 1);
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    ctx.save();
    if (s.shakeTime > 0) {
      ctx.translate((Math.random() - 0.5) * s.shakeIntensity, (Math.random() - 0.5) * s.shakeIntensity);
    }

    // Background
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);
    const grad = ctx.createLinearGradient(0, 0, 0, s.canvasHeight);
    grad.addColorStop(0, 'rgba(255,0,128,0.12)');
    grad.addColorStop(0.3, 'rgba(0,240,255,0.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);

    // Road borders
    ctx.strokeStyle = 'rgba(0,255,240,0.2)'; ctx.lineWidth = 4;
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(5, 0); ctx.lineTo(5, s.canvasHeight);
    ctx.moveTo(s.canvasWidth - 5, 0); ctx.lineTo(s.canvasWidth - 5, s.canvasHeight);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Moving horizontal stripes
    ctx.strokeStyle = 'rgba(255,0,240,0.1)'; ctx.lineWidth = 6;
    for (let y = s.roadOffset - 80; y < s.canvasHeight; y += 80) {
      ctx.beginPath(); ctx.moveTo(5, y); ctx.lineTo(s.canvasWidth - 5, y); ctx.stroke();
    }

    // Lane dashes
    ctx.strokeStyle = 'rgba(0,255,240,0.3)'; ctx.lineWidth = 3;
    for (let i = 1; i < LANE_COUNT; i++) {
      ctx.beginPath(); ctx.setLineDash([30, 30]); ctx.lineDashOffset = -s.distance;
      ctx.moveTo(s.laneWidth * i, 0); ctx.lineTo(s.laneWidth * i, s.canvasHeight); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Particles
    for (const p of s.particles) {
      ctx.save(); ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Objects
    for (const obj of s.objects) {
      if (!obj.active) continue;
      if (obj.type === 'obstacle') {
        drawEnemyCar(ctx, obj);
      } else if (obj.type === 'coin') {
        ctx.save(); ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffff00'; ctx.beginPath();
        ctx.arc(obj.x + OBJ_W / 2, obj.y + OBJ_H / 2, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 4; ctx.beginPath();
        ctx.arc(obj.x + OBJ_W / 2, obj.y + OBJ_H / 2, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (obj.type === 'nitro') {
        ctx.save(); ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#00ffff'; ctx.beginPath();
        ctx.moveTo(obj.x + OBJ_W / 2, obj.y);
        ctx.lineTo(obj.x + OBJ_W, obj.y + OBJ_H);
        ctx.lineTo(obj.x, obj.y + OBJ_H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 4; ctx.beginPath();
        ctx.moveTo(obj.x + OBJ_W / 2, obj.y + 10);
        ctx.lineTo(obj.x + OBJ_W - 10, obj.y + OBJ_H - 8);
        ctx.lineTo(obj.x + 10, obj.y + OBJ_H - 8); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    // Player car
    if (s.canvasWidth > 0) {
      const pX = s.laneWidth * s.playerLane + (s.laneWidth - CAR_W) / 2;
      const pY = s.canvasHeight - CAR_H - 35;
      drawCar(ctx, pX, pY, s.nitroActive);
    }

    ctx.restore();

    // Press Play overlay
    if (!isPlayingRef.current && !isGameOverRef.current) {
      ctx.fillStyle = 'rgba(5,8,22,0.72)';
      ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);
      ctx.fillStyle = '#00D1FF'; ctx.shadowColor = '#00D1FF'; ctx.shadowBlur = 16;
      ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
      ctx.fillText(isConnected ? 'PRESS PLAY' : 'WALLET CONNECT KARO', s.canvasWidth / 2, s.canvasHeight / 2 - 14);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '13px monospace';
      ctx.fillText(isConnected ? 'Fee: 0.00035 ETH · A/D · ← → · Swipe' : 'Connect wallet to play', s.canvasWidth / 2, s.canvasHeight / 2 + 14);
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [endGame]);

  // Start RAF on mount
  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isPlayingRef.current || isGameOverRef.current) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')
        gameState.current.playerLane = Math.max(0, gameState.current.playerLane - 1);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')
        gameState.current.playerLane = Math.min(LANE_COUNT - 1, gameState.current.playerLane + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Touch ────────────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isPlayingRef.current || isGameOverRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 35 && Math.abs(dy) < 60) {
      if (dx < 0) gameState.current.playerLane = Math.max(0, gameState.current.playerLane - 1);
      else gameState.current.playerLane = Math.min(LANE_COUNT - 1, gameState.current.playerLane + 1);
    }
  }, []);

  // ── Start game ───────────────────────────────────────────────────────────────
  async function startGame() {
    setTxError('');
    setTxHash('');

    // Wallet connect nahi toh game nahi chalega
    if (!isConnected || !address || !walletClient) {
      setTxError('⚠️ Pehle wallet connect karo!');
      return;
    }

    setSubmitting(true);
    try {
      // 70% of 0.0005 ETH = 0.00035 ETH treasury fee
      const TREASURY = '0x000000000000000000000000000000000000dEaD';
      const FEE = BigInt('350000000000000'); // 0.00035 ETH in wei
      const memo = `BaseGrid:Car:GameStart:${Date.now()}`;
      const data = ('0x' + Buffer.from(memo, 'utf8').toString('hex')) as `0x${string}`;
      const hash = await walletClient.sendTransaction({
        to: TREASURY,
        value: FEE,
        data,
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setSubmitting(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setTxError(msg.includes('rejected') ? 'Transaction reject kar di! Game nahi chala.' : msg.slice(0, 80));
      setSubmitting(false);
      return;
    }

    // Reset game state
    const s = gameState.current;
    s.playerLane = 1; s.speed = 6; s.baseSpeed = 6;
    s.distance = 0; s.objects = []; s.particles = [];
    s.lastObjectSpawn = 0; s.nitroTimer = 0;
    s.shakeTime = 0; s.shakeIntensity = 0; s.roadOffset = 0;
    s.score = 0; s.combo = 1; s.maxCombo = 1; s.nitroActive = false;

    setScore(0); setCombo(1); setMaxCombo(1); setNitroActive(false);
    isPlayingRef.current = true;
    isGameOverRef.current = false;
    setIsPlaying(true);
    setIsGameOver(false);
  }

  function resetToMenu() {
    isPlayingRef.current = false;
    isGameOverRef.current = false;
    setIsPlaying(false);
    setIsGameOver(false);
    setScore(0); setCombo(1); setNitroActive(false);
  }

  return (
    <div className="w-full flex flex-col items-center gap-6">

      <h1 className="text-4xl font-black uppercase tracking-widest text-white mt-2">Arcade</h1>
      <p className="text-white/40 text-xs font-mono">Turbo Drift Arc · Dodge traffic · Grab nitro · Submit score on Base!</p>

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
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,209,255,0.1)]"
        style={{ height: '520px' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ background: '#050508', touchAction: 'none' }}
        />

        {/* Nitro bar */}
        {nitroActive && isPlaying && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
            <p className="text-xs font-black text-[#00ffff] tracking-widest animate-pulse mb-1" style={{ textShadow: '0 0 10px #00ffff' }}>
              ⚡ NITRO ACTIVE
            </p>
            <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden border border-[#00ffff]/30">
              <div
                className="h-full bg-[#00ffff] transition-all duration-100"
                style={{ width: `${(gameState.current.nitroTimer / NITRO_MAX) * 100}%`, boxShadow: '0 0 8px #00ffff' }}
              />
            </div>
          </div>
        )}

        {/* Combo badge */}
        {combo > 1 && isPlaying && (
          <div className="absolute top-3 left-3 pointer-events-none z-10">
            <p className="text-sm font-black text-yellow-400 animate-pulse tracking-widest" style={{ textShadow: '0 0 8px #ffcc00' }}>
              {combo}x COMBO
            </p>
          </div>
        )}

        {/* Game over overlay */}
        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md z-10 text-center p-6">
            <h2 className="text-5xl font-extrabold text-red-500 mb-1 uppercase tracking-widest animate-bounce" style={{ textShadow: '0 0 20px red' }}>
              CRASHED!
            </h2>
            <p className="text-white/40 text-xs font-mono tracking-widest uppercase mb-6">Warp core unstable</p>
            <div className="grid grid-cols-2 gap-6 mb-6 w-full max-w-xs">
              <div className="p-4 bg-white/[0.03] rounded-xl border border-red-500/20">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Final Score</p>
                <p className="text-3xl font-mono font-black text-[#00D1FF]">{score}</p>
              </div>
              <div className="p-4 bg-white/[0.03] rounded-xl border border-red-500/20">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Max Combo</p>
                <p className="text-3xl font-mono font-black text-yellow-400">{maxCombo}x</p>
              </div>
            </div>
            <button
              onClick={startGame}
              disabled={submitting}
              className="flex items-center gap-2 bg-[#00D1FF] hover:bg-[#00baff] disabled:opacity-60 text-black font-black uppercase tracking-widest text-sm px-8 py-3.5 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(0,209,255,0.3)]"
            >
              <RotateCcw size={16} /> {submitting ? 'Txn ho rahi hai...' : 'Race Again'}
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-3">
          {!isPlaying && !isGameOver && (
            <div className="flex flex-col items-center gap-2">
              {!isConnected && (
                <p className="text-[11px] text-yellow-400 font-mono animate-pulse">⚠️ Wallet connect karo game khelne ke liye</p>
              )}
              <button
                onClick={startGame}
                disabled={submitting || !isConnected}
                className="flex items-center gap-2 bg-[#00D1FF] hover:bg-[#00baff] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black uppercase tracking-widest text-xs px-8 py-3.5 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(0,209,255,0.3)]"
              >
                <Play size={16} /> {submitting ? 'Txn ho rahi hai...' : 'Play'}
              </button>
              {isConnected && (
                <p className="text-[10px] text-white/30 font-mono">Entry fee: 0.00035 ETH (~$0.0005 ka 70%)</p>
              )}
            </div>
          )}
          {isPlaying && (
            <button
              onClick={() => { endGame(); }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs px-6 py-3.5 rounded-xl transition-all"
            >
              Stop
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

      {/* Mobile Touch Buttons */}
      <div className="flex justify-between w-full max-w-lg px-4 md:hidden">
        <button
          className="w-16 h-16 rounded-full border-2 border-[#00D1FF]/40 bg-[#00D1FF]/06 backdrop-blur-sm text-[#00D1FF] text-2xl font-black active:scale-90 active:bg-[#00D1FF]/20 transition-all"
          onTouchStart={(e) => { e.preventDefault(); if (isPlayingRef.current) gameState.current.playerLane = Math.max(0, gameState.current.playerLane - 1); }}
        >←</button>
        <button
          className="w-16 h-16 rounded-full border-2 border-[#00D1FF]/40 bg-[#00D1FF]/06 backdrop-blur-sm text-[#00D1FF] text-2xl font-black active:scale-90 active:bg-[#00D1FF]/20 transition-all"
          onTouchStart={(e) => { e.preventDefault(); if (isPlayingRef.current) gameState.current.playerLane = Math.min(LANE_COUNT - 1, gameState.current.playerLane + 1); }}
        >→</button>
      </div>

      {/* Leaderboard */}
      <div className="w-full max-w-lg bg-white/[0.02] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={14} className="text-yellow-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">Car Race Leaderboard</span>
        </div>
        {leaderboard.length === 0 ? (
          <div className="text-center py-6 text-white/20 text-xs font-mono">Abhi koi score nahi — pehle khelo!</div>
        ) : (
          <div className="flex flex-col gap-2">
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between bg-black/20 rounded-xl px-4 py-2.5 border ${entry.wallet === address ? 'border-[#00D1FF]/30' : 'border-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div>
                    <div className="text-[10px] font-bold text-white font-mono">
                      {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                      {entry.wallet === address && <span className="ml-1 text-[#00D1FF]">(YOU)</span>}
                    </div>
                    <a
                      href={`https://basescan.org/tx/${entry.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-white/30 font-mono hover:text-[#00D1FF]"
                    >
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
        A/D · Arrow Keys to steer · Coins +150pts · Nitro destroys obstacles
      </div>
    </div>
  );
}
