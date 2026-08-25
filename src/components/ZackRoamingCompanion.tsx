import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZackRetriever3D, Zack3DMood, ZackAccessoryType } from './ZackRetriever3D';
import {
  X,
  EyeOff,
  Compass,
  Moon,
  ChevronDown,
  Sparkles,
  Flame,
  Trophy,
  Award,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Zap,
  Heart,
  HelpCircle,
  Volume2
} from 'lucide-react';
import { Transaction, VaultStats, VaultHealth } from '../types';
import { calculateZackFinancialMood, ZackFinancialMoodState, ZackMilestone } from '../utils/zackMoodEngine';

export interface ZackRoamingCompanionProps {
  activeTab?: string;
  transactionCount?: number;
  isVaultLocked?: boolean;
  transactions?: Transaction[];
  stats?: VaultStats | null;
  health?: VaultHealth | null;
  onNavigate?: (tab: string) => void;
}

interface ToyItem {
  id: number;
  type: 'ball' | 'bone' | 'frisbee';
  startX: number;
  targetX: number;
  targetY: number;
}

interface Footprint {
  id: number;
  x: number;
  y: number;
  rotation: number;
}

export const ZackRoamingCompanion: React.FC<ZackRoamingCompanionProps> = ({
  activeTab = 'dashboard',
  transactionCount = 0,
  isVaultLocked = false,
  transactions = [],
  stats = null,
  health = null,
  onNavigate
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('zack_companion_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isGhostMode, setIsGhostMode] = useState<boolean>(false);
  const [mood, setMood] = useState<Zack3DMood>('idle');
  const [customSpeech, setCustomSpeech] = useState<string | null>(null);
  const [activeToy, setActiveToy] = useState<ToyItem | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [isMilestoneHubOpen, setIsMilestoneHubOpen] = useState<boolean>(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState<string | null>(null);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [dockSide, setDockSide] = useState<'right' | 'left'>('right');

  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute rich financial mood state
  const financialState: ZackFinancialMoodState = useMemo(() => {
    return calculateZackFinancialMood(transactions, stats, health);
  }, [transactions, stats, health]);

  // Sync mood with financial state when idle
  useEffect(() => {
    if (!isVaultLocked && mood === 'idle') {
      setMood(financialState.mood);
    }
  }, [financialState.mood, isVaultLocked, mood]);

  // Save user preferences
  useEffect(() => {
    localStorage.setItem('zack_companion_enabled', String(isEnabled));
  }, [isEnabled]);

  // Speech helper
  const say = useCallback((text: string, durationMs = 4000) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setCustomSpeech(text);
    speechTimerRef.current = setTimeout(() => {
      setCustomSpeech(null);
    }, durationMs);
  }, []);

  // React to lock/unlock and page / tab switches
  useEffect(() => {
    if (!isEnabled) return;

    if (isVaultLocked) {
      setMood('idle');
      say("Vault locked & secured! Enter Master Passphrase to unlock. 🛡️🐾", 3500);
      return;
    }

    const tabReactions: Record<string, string> = {
      dashboard: `Overview loaded! Mood: ${financialState.archetypeLabel} 📊🐶`,
      budget: "Budgets ready! Sniffing out spending targets! 🦴💵",
      subscriptions: "Recurring Subscriptions loaded! Sniffing out recurring drain & renewals! 🔄✂️",
      'debt-payoff': "Bone Burier Debt Suite ready! Let's eliminate balances! ⚡",
      ingestion: "Fetch Bank Statements ready! Let's ingest bank files! 📂✨",
      ledger: "Golden Ledger loaded! Scrutinizing every transaction! 🔍🐾",
      rules: "Zack's Learned Tricks ready! Rules looking sharp! 🧠🐾",
      security: "Guard Dog Vault Settings active! Private & secured! 🛡️"
    };

    if (tabReactions[activeTab]) {
      setMood(financialState.mood === 'zoomies' ? 'zoomies' : 'happy');
      setDockSide(prev => prev === 'right' ? 'left' : 'right'); // alternate side spring-bounce
      say(tabReactions[activeTab], 3200);
      const timer = setTimeout(() => setMood(financialState.mood), 2400);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isEnabled, isVaultLocked, financialState.archetypeLabel, financialState.mood, say]);

  // Milestone change detection & reactive celebration
  const prevUnlockedRef = useRef(financialState.unlockedCount);
  const prevCountRef = useRef(transactionCount || transactions.length);

  useEffect(() => {
    const currentTxCount = transactionCount || transactions.length;
    
    // Check if new milestone was unlocked
    if (financialState.unlockedCount > prevUnlockedRef.current && prevUnlockedRef.current !== 0) {
      const newlyUnlocked = financialState.milestones.find(m => m.isUnlocked);
      setMood('zoomies');
      setCelebratingMilestone(newlyUnlocked ? newlyUnlocked.title : 'Milestone');
      say(`🎉 WOOF! Milestone Unlocked: ${newlyUnlocked?.title || 'Financial Triumph'}! ${newlyUnlocked?.celebrationMessage || '🐾'}`, 5000);
      
      const timer = setTimeout(() => {
        setCelebratingMilestone(null);
        setMood(financialState.mood);
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Check if new transaction was added
    if (currentTxCount > prevCountRef.current && prevCountRef.current !== 0) {
      const diff = currentTxCount - prevCountRef.current;
      setMood(currentTxCount >= 10 ? 'zoomies' : 'happy');
      say(
        diff > 1 
          ? `WOOF! Ingested batch of ${diff} transactions! Vault updated! 🚀🦴` 
          : `Woof! New transaction saved locally! Total: ${currentTxCount} records! 🐾✨`,
        4200
      );
      const timer = setTimeout(() => setMood(financialState.mood), 3000);
      return () => clearTimeout(timer);
    }

    prevUnlockedRef.current = financialState.unlockedCount;
    prevCountRef.current = currentTxCount;
  }, [financialState.unlockedCount, financialState.milestones, financialState.mood, transactionCount, transactions.length, say]);

  // Footprints cleanup
  useEffect(() => {
    if (footprints.length === 0) return;
    const timer = setTimeout(() => {
      setFootprints(prev => prev.slice(1));
    }, 2000);
    return () => clearTimeout(timer);
  }, [footprints]);

  // Interactive Ball/Bone/Frisbee Physics Throw & Fetch
  const throwToy = (type: 'ball' | 'bone' | 'frisbee') => {
    if (isFetching) return;
    setIsFetching(true);

    const isRight = dockSide === 'right';
    const targetOffset = isRight ? 180 : -180;

    const newToy: ToyItem = {
      id: Date.now(),
      type,
      startX: isRight ? 40 : -40,
      targetX: targetOffset,
      targetY: 20
    };

    setActiveToy(newToy);
    setMood('zoomies');
    say(type === 'ball' ? "BALL THROWN! 🎾" : type === 'bone' ? "TREAT TOSS! 🦴" : "FLYING FRISBEE! 🥏", 2200);

    // Add playful footprint trail
    setFootprints(prev => [
      ...prev.slice(-4),
      { id: Date.now(), x: isRight ? 100 : -100, y: 15, rotation: isRight ? -15 : 15 }
    ]);

    // Bouncy retrieval sequence
    setTimeout(() => {
      setTimeout(() => {
        setActiveToy(null);
        setIsFetching(false);
        setMood('happy');
        say("*Tail wagging* Caught it & brought it back! 🐾", 2600);
        setTimeout(() => setMood(financialState.mood), 2000);
      }, 1000);
    }, 700);
  };

  const triggerMilestoneCelebration = () => {
    setMood('zoomies');
    say(`WOOF! Celebrating all ${financialState.unlockedCount} unlocked milestones! 🚀👑🐾`, 4500);
    setTimeout(() => setMood(financialState.mood), 4000);
  };

  if (!isEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsEnabled(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-mono shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
          title="Click to summon Zack the Golden Retriever companion"
        >
          <span className="text-sm">🐕</span>
          <span className="font-bold text-white text-[11px]">Summon Zack</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Bouncy Toy Animation with Gravity Parabolic Curve */}
      <AnimatePresence>
        {activeToy && (
          <motion.div
            key={activeToy.id}
            initial={{ 
              opacity: 0, 
              scale: 0.4, 
              x: activeToy.startX, 
              y: -80, 
              rotate: 0 
            }}
            animate={{ 
              opacity: [0, 1, 1, 1, 0.8],
              scale: [0.5, 1.2, 1, 0.9, 0.4],
              x: [activeToy.startX, activeToy.targetX * 0.5, activeToy.targetX, activeToy.targetX * 0.9],
              y: [-80, -110, 0, -35, 0],
              rotate: [0, 180, 360, 540, 720]
            }}
            exit={{ opacity: 0, scale: 0.1 }}
            transition={{ 
              duration: 0.85, 
              times: [0, 0.35, 0.65, 0.85, 1],
              ease: 'easeInOut' 
            }}
            style={{ 
              position: 'fixed',
              [dockSide]: 90,
              bottom: 45
            }}
            className="z-40 pointer-events-none text-3xl select-none filter drop-shadow-lg"
          >
            {activeToy.type === 'ball' ? '🎾' : activeToy.type === 'bone' ? '🦴' : '🥏'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Fading Pawprints */}
      <AnimatePresence>
        {footprints.map((fp) => (
          <motion.div
            key={fp.id}
            initial={{ opacity: 0.8, scale: 0.7 }}
            animate={{ opacity: 0, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              [dockSide]: fp.x + 40,
              bottom: fp.y + 15,
              transform: `rotate(${fp.rotation}deg)`
            }}
            className="z-30 pointer-events-none text-xs select-none opacity-40 filter drop-shadow-xs"
          >
            🐾
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Zack Companion Container */}
      <motion.div
        drag
        dragConstraints={{ left: -window.innerWidth + 200, right: 0, top: -window.innerHeight + 200, bottom: 0 }}
        dragElastic={0.25}
        dragTransition={{ bounceStiffness: 400, bounceDamping: 25 }}
        whileDrag={{ scale: 1.08, cursor: 'grabbing' }}
        style={{
          position: 'fixed',
          [dockSide]: 20,
          bottom: 16
        }}
        className={`z-40 flex flex-col items-center select-none ${
          isGhostMode ? 'opacity-40 hover:opacity-100 transition-opacity' : 'opacity-100'
        }`}
      >
        {isMinimized ? (
          /* Minimized Compact Badge */
          <div 
            onClick={() => setIsMinimized(false)}
            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-mono shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
            title="Click to expand Zack the Golden Retriever"
          >
            <span className="text-sm">🐕</span>
            <span className="font-bold text-white text-[11px]">Zack</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
              {financialState.archetypeBadge}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        ) : (
          /* Sleek Interactive Mascot Card */
          <motion.div 
            className="relative group flex flex-col items-center gap-1.5 cursor-pointer"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.94, rotate: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {/* 1. Receptive Speech Message Card - Positioned cleanly ABOVE the interaction control bar */}
            <AnimatePresence>
              {(customSpeech || celebratingMilestone) && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.88 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  className="relative z-50 max-w-[290px] bg-slate-950/95 text-amber-200 text-xs px-3.5 py-2 rounded-2xl border border-amber-500/40 shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-auto cursor-pointer transition-all hover:scale-102"
                  onClick={() => setCustomSpeech(null)}
                  title="Click to dismiss speech message"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span className="font-sans font-medium text-[11.5px] leading-snug text-amber-100 break-words">
                    {celebratingMilestone 
                      ? `🎉 WOOF! Unlocked "${celebratingMilestone}" milestone!` 
                      : customSpeech}
                  </span>
                  {/* Downward Speech Bubble Triangle Tail pointing towards companion */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-b border-r border-amber-500/40 rotate-45 pointer-events-none" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. Quick Companion Interactive Controls Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: showControls ? 1 : 0.9, y: 0 }}
              className="flex items-center gap-1 bg-slate-950/95 px-2.5 py-1 rounded-full border border-slate-800 shadow-xl backdrop-blur-md pointer-events-auto z-40 transition-all"
            >
              {/* Financial Mood & Milestone Hub Trigger */}
              <button
                type="button"
                onClick={() => setIsMilestoneHubOpen(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-amber-500/20 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30 transition-all hover:scale-105 cursor-pointer"
                title="Open Zack's Financial Mood & Milestone Trophy Case 🏆"
              >
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{financialState.unlockedCount}/{financialState.totalMilestones}</span>
              </button>

              <div className="w-[1px] h-3 bg-slate-700 mx-0.5"></div>

              {/* Toss Ball */}
              <button
                type="button"
                onClick={() => throwToy('ball')}
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-xs flex items-center justify-center text-white transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                title="Toss Tennis Ball with Bounce Physics 🎾"
              >
                🎾
              </button>

              {/* Toss Bone */}
              <button
                type="button"
                onClick={() => throwToy('bone')}
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-xs flex items-center justify-center text-white transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                title="Give Squeaky Treat Bone 🦴"
              >
                🦴
              </button>

              {/* Toss Frisbee */}
              <button
                type="button"
                onClick={() => throwToy('frisbee')}
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-xs flex items-center justify-center text-white transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                title="Throw Flying Frisbee 🥏"
              >
                🥏
              </button>

              <div className="w-[1px] h-3 bg-slate-700 mx-0.5"></div>

              {/* Sleep / Nap Toggle */}
              <button
                type="button"
                onClick={() => {
                  const nextMood = mood === 'sleeping' ? financialState.mood : 'sleeping';
                  setMood(nextMood);
                  say(nextMood === 'sleeping' ? "Zzz... dog nap! 💤" : `Awake & ready! Mood: ${financialState.archetypeLabel} 🐾`, 2500);
                }}
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-xs flex items-center justify-center text-indigo-300 transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                title="Toggle Sleep / Wake"
              >
                <Moon className="w-3 h-3" />
              </button>

              {/* Switch Side Dock */}
              <button
                type="button"
                onClick={() => setDockSide(prev => prev === 'right' ? 'left' : 'right')}
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-xs flex items-center justify-center text-cyan-400 transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                title="Dock to Left/Right Corner"
              >
                <Compass className="w-3 h-3" />
              </button>

              {/* Ghost Mode */}
              <button
                type="button"
                onClick={() => setIsGhostMode(!isGhostMode)}
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center transition-transform hover:scale-115 active:scale-95 cursor-pointer ${
                  isGhostMode ? 'text-amber-400' : 'text-slate-400'
                }`}
                title="Toggle Transparency"
              >
                <EyeOff className="w-3 h-3" />
              </button>

              {/* Minimize */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="w-6 h-6 rounded-full hover:bg-slate-800 text-xs flex items-center justify-center text-slate-400 hover:text-white transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                title="Minimize Zack to compact badge"
              >
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Close / Disable */}
              <button
                type="button"
                onClick={() => setIsEnabled(false)}
                className="w-6 h-6 rounded-full hover:bg-rose-900/40 text-xs flex items-center justify-center text-rose-400 transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                title="Hide Mascot"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>

            {/* 3. Dog Mascot Widget */}
            <div 
              className="pointer-events-auto cursor-grab active:cursor-grabbing"
              onClick={() => {
                say(financialState.speechBubble, 3800);
              }}
            >
              <ZackRetriever3D
                mood={mood}
                width={145}
                height={125}
                showSpeech={false}
                interactive={true}
                excitementLevel={financialState.excitementLevel}
                contentmentLevel={financialState.contentmentLevel}
                accessory={financialState.accessory}
                onInteract={(action) => {
                  if (action === 'boop') {
                    setMood('happy');
                    say("Boop! Tail wagging at max velocity! 🐾✨", 2500);
                    setTimeout(() => setMood(financialState.mood), 2000);
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Zack's Financial Mood & Milestones Hub Drawer / Modal */}
      <AnimatePresence>
        {isMilestoneHubOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
                    🐕
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      Zack's Financial Mood & Milestones
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-semibold border border-amber-500/30">
                        {financialState.levelTitle} (Rank {financialState.levelRank}/5)
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                      State-based emotional canine responsiveness to your vault health
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMilestoneHubOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Scrollable Area */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* 1. Live State & Mood Meters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Archetype & Speech Card */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Current Archetype</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold font-mono">
                        {financialState.archetypeBadge}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-sans leading-relaxed italic">
                      "{financialState.speechBubble}"
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-slate-400">Canine Stance</span>
                      <span className="text-xs font-semibold text-white capitalize">{financialState.mood}</span>
                    </div>
                  </div>

                  {/* Excitement & Contentment Gauges */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Zap className="w-3.5 h-3.5" /> Excitement Index
                        </span>
                        <span className="font-bold text-white">{financialState.excitementLevel}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${financialState.excitementLevel}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Driven by transaction volume, net savings surplus, and active tracking.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <Heart className="w-3.5 h-3.5" /> Contentment Index
                        </span>
                        <span className="font-bold text-white">{financialState.contentmentLevel}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${financialState.contentmentLevel}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Driven by zero cloud leakage, budget adherence, and positive cash flow.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Milestones Trophy Case */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Financial Milestones & Achievements
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        {financialState.unlockedCount} of {financialState.totalMilestones} Milestones Mastered
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={triggerMilestoneCelebration}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition-all hover:scale-105 flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Celebrate Unlocked!
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {financialState.milestones.map((m: ZackMilestone) => (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          m.isUnlocked
                            ? 'bg-slate-950/80 border-amber-500/40 shadow-sm shadow-amber-500/5'
                            : 'bg-slate-950/40 border-slate-800/80 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl filter drop-shadow-sm">{m.icon}</span>
                            <div>
                              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                {m.title}
                                {m.isUnlocked && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                                )}
                              </h4>
                              <p className="text-[11px] text-slate-400 line-clamp-1">
                                {m.description}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap ${
                              m.isUnlocked
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {m.progressPercent}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2.5 w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${m.progressPercent}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${
                              m.isUnlocked ? 'bg-amber-400' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>🐾 Zack continuously monitors local SQLite & storage metrics</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMilestoneHubOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
