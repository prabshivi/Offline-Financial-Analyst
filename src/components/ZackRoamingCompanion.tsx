import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZackRetriever3D, Zack3DMood } from './ZackRetriever3D';
import {
  X,
  EyeOff,
  Compass,
  Moon,
  ChevronDown,
  Sparkles,
  Move,
  RotateCcw,
  Volume2
} from 'lucide-react';

interface ZackRoamingCompanionProps {
  activeTab?: string;
  transactionCount?: number;
  isVaultLocked?: boolean;
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
  isVaultLocked = false
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('zack_companion_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isGhostMode, setIsGhostMode] = useState<boolean>(false);
  const [isRoaming, setIsRoaming] = useState<boolean>(false);
  const [facingLeft, setFacingLeft] = useState<boolean>(true);
  const [mood, setMood] = useState<Zack3DMood>('idle');
  const [customSpeech, setCustomSpeech] = useState<string | null>(null);
  const [activeToy, setActiveToy] = useState<ToyItem | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [dockSide, setDockSide] = useState<'right' | 'left'>('right');

  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const roamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save user preferences
  useEffect(() => {
    localStorage.setItem('zack_companion_enabled', String(isEnabled));
  }, [isEnabled]);

  // Speech helper
  const say = useCallback((text: string, durationMs = 3500) => {
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
      say("Vault locked & secured! Enter PIN to unlock. 🛡️🐾", 3500);
      return;
    }

    const tabReactions: Record<string, string> = {
      dashboard: "Financial overview loaded! 📊🐶",
      budget: "Monthly budget tracker active! 🦴💵",
      'debt-payoff': "Mortgage & Debt Eliminator! ⚡",
      ingestion: "Bank statement dropzone ready! 📂✨",
      'auto-fetch': "Automated PDF statement sync! 🎾",
      ledger: "Full transaction ledger! 🔍",
      rules: "Smart categorization rules! 🧠",
      security: "Encrypted & secured locally! 🛡️",
      nightly: "Security Peace of Mind Audit! ✨🛡️"
    };

    if (tabReactions[activeTab]) {
      setMood('happy');
      say(tabReactions[activeTab], 3200);
      const timer = setTimeout(() => setMood('idle'), 2200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isEnabled, isVaultLocked, say]);

  // React to new transactions added
  const prevCountRef = useRef(transactionCount);
  useEffect(() => {
    if (transactionCount > prevCountRef.current && prevCountRef.current !== 0) {
      setMood('zoomies');
      say("Woof! New transaction saved to local vault! 🎉🐾", 3800);
      setTimeout(() => setMood('happy'), 2500);
    }
    prevCountRef.current = transactionCount;
  }, [transactionCount, say]);

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
        setTimeout(() => setMood('idle'), 2000);
      }, 1000);
    }, 700);
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

      {/* Main Zack Companion Container - Drag-Enabled with Real Spring Physics */}
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
          /* Minimized Compact Badge (Only 28px tall, ultra-clean) */
          <div 
            onClick={() => setIsMinimized(false)}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-mono shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
            title="Click to expand Zack the Golden Retriever"
          >
            <span className="text-sm">🐕</span>
            <span className="font-bold text-white text-[11px]">Zack</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        ) : (
          /* Sleek, Non-Obstructive Interactive Mascot Card */
          <div 
            className="relative group flex flex-col items-center"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Quick Companion Interactive Physics Bar (Reveals on hover) */}
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: showControls ? 1 : 0.85, y: 0 }}
              className="mb-1 flex items-center gap-1 bg-slate-950/95 px-2.5 py-1 rounded-full border border-slate-800 shadow-xl backdrop-blur-md pointer-events-auto z-40 transition-all"
            >
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
                  const nextMood = mood === 'sleeping' ? 'idle' : 'sleeping';
                  setMood(nextMood);
                  say(nextMood === 'sleeping' ? "Zzz... dog nap! 💤" : "Awake and guarding! 🐾", 2500);
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

            {/* Dog Mascot Widget */}
            <div className="pointer-events-auto cursor-grab active:cursor-grabbing">
              <ZackRetriever3D
                mood={mood}
                width={145}
                height={125}
                showSpeech={true}
                customSpeech={customSpeech}
                interactive={true}
                onInteract={(action) => {
                  if (action === 'boop') {
                    setMood('happy');
                    setTimeout(() => setMood('idle'), 2000);
                  }
                }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
};
