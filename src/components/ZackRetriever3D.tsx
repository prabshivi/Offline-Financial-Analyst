import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type Zack3DMood = 
  | 'idle' 
  | 'happy' 
  | 'panting' 
  | 'covering' 
  | 'peeking' 
  | 'zoomies' 
  | 'bellyrub' 
  | 'headtilt' 
  | 'curious' 
  | 'sit' 
  | 'sleeping' 
  | 'barking' 
  | 'success' 
  | 'error' 
  | 'fetching';

export type ZackAccessoryType = 'none' | 'star_aura' | 'gold_medal' | 'party_hat' | 'crown' | 'shield_badge';

interface ZackRetriever3DProps {
  mood?: Zack3DMood;
  isPasswordMode?: boolean;
  pinLength?: number;
  isTyping?: boolean;
  hasError?: boolean;
  isSuccess?: boolean;
  onInteract?: (action: string) => void;
  width?: number | string;
  height?: number | string;
  showSpeech?: boolean;
  customSpeech?: string | null;
  cameraDistance?: number;
  allowBellyRub?: boolean;
  interactive?: boolean;
  excitementLevel?: number; // 0 to 100
  contentmentLevel?: number; // 0 to 100
  accessory?: ZackAccessoryType;
}

export const ZackRetriever3D: React.FC<ZackRetriever3DProps> = ({
  mood: externalMood,
  isPasswordMode = false,
  pinLength = 0,
  isTyping = false,
  hasError = false,
  isSuccess = false,
  onInteract,
  width = 160,
  height = 135,
  showSpeech = true,
  customSpeech = null,
  allowBellyRub = true,
  interactive = true,
  excitementLevel = 35,
  contentmentLevel = 50,
  accessory = 'none',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalMood, setInternalMood] = useState<Zack3DMood>('idle');
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [pokeCount, setPokeCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; scale: number }[]>([]);
  const [isBlinking, setIsBlinking] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [isBooped, setIsBooped] = useState(false);
  const [squash, setSquash] = useState({ scaleX: 1, scaleY: 1 });

  const activeMood: Zack3DMood = isSuccess
    ? 'success'
    : hasError
    ? 'error'
    : isPasswordMode
    ? (internalMood === 'peeking' ? 'peeking' : 'covering')
    : externalMood || internalMood;

  // Realistic 2D/3D Eye Gaze Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      
      // Clamp eye movement within canine anatomical range
      setGaze({
        x: Math.max(-5, Math.min(5, dx * 6)),
        y: Math.max(-4, Math.min(4, dy * 5))
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Natural Canine Blinking Loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (activeMood === 'sleeping' || activeMood === 'covering') return;
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 3800 + Math.random() * 2500);

    return () => clearInterval(blinkInterval);
  }, [activeMood]);

  // Update speech bubble on external custom input
  useEffect(() => {
    if (customSpeech) {
      setSpeechBubble(customSpeech);
    }
  }, [customSpeech]);

  // Handle Nose Boop with Spring Physics
  const handleNoseBoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive) return;

    setIsBooped(true);
    setSquash({ scaleX: 1.15, scaleY: 0.85 });
    setSpeechBubble("Boop! ✨🐶");

    // Add heart burst
    const rect = containerRef.current?.getBoundingClientRect() || { width: 100, height: 100 };
    setHearts(prev => [
      ...prev.slice(-4),
      { id: Date.now(), x: 0, y: -20, scale: 1.2 },
      { id: Date.now() + 1, x: -15, y: -25, scale: 0.9 },
      { id: Date.now() + 2, x: 15, y: -25, scale: 0.9 }
    ]);

    setTimeout(() => {
      setSquash({ scaleX: 0.92, scaleY: 1.08 });
      setTimeout(() => setSquash({ scaleX: 1, scaleY: 1 }), 150);
    }, 150);

    setTimeout(() => setIsBooped(false), 1200);
    if (onInteract) onInteract('boop');
  };

  // Click & Pet Interactions
  const handleInteraction = useCallback((e?: React.MouseEvent) => {
    if (!interactive) return;

    if (isPasswordMode) {
      setInternalMood(prev => (prev === 'peeking' ? 'covering' : 'peeking'));
      setSpeechBubble(internalMood === 'peeking' ? "🙈 Eyes covered!" : "👀 Just a quick peek!");
      return;
    }

    const nextCount = pokeCount + 1;
    setPokeCount(nextCount);

    // Spring squash effect on touch
    setSquash({ scaleX: 1.08, scaleY: 0.92 });
    setTimeout(() => {
      setSquash({ scaleX: 0.96, scaleY: 1.04 });
      setTimeout(() => setSquash({ scaleX: 1, scaleY: 1 }), 140);
    }, 120);

    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left - rect.width / 2;
      const clickY = e.clientY - rect.top - rect.height / 2;

      setHearts(prev => [
        ...prev.slice(-3),
        { id: Date.now() + Math.random(), x: clickX * 0.3, y: clickY * 0.3, scale: 1 }
      ]);
    }

    const moods: Zack3DMood[] = allowBellyRub 
      ? ['happy', 'panting', 'headtilt', 'bellyrub', 'curious', 'zoomies']
      : ['happy', 'panting', 'headtilt', 'curious'];

    const nextMood = moods[nextCount % moods.length];
    setInternalMood(nextMood);

    const speechResponses: Record<string, string> = {
      happy: "*Happy tail wagging* 🐾",
      panting: "Ready to guard your financial vault! ⚡",
      headtilt: "Did someone say fresh dividends? 🦴",
      bellyrub: "Belly rubs! Best companion ever! 💛",
      curious: "Sniffing out any duplicate bank fees! 🔍",
      zoomies: "100% Zero-Cloud Airgap verified! 🚀"
    };

    setSpeechBubble(speechResponses[nextMood] || "Woof!");

    if (onInteract) {
      onInteract(nextMood);
    }
  }, [allowBellyRub, interactive, internalMood, isPasswordMode, onInteract, pokeCount]);

  // Clean up floating particles
  useEffect(() => {
    if (hearts.length === 0) return;
    const timer = setTimeout(() => {
      setHearts(prev => prev.slice(1));
    }, 1600);
    return () => clearTimeout(timer);
  }, [hearts]);

  // Auto-hide speech bubble
  useEffect(() => {
    if (!speechBubble) return;
    const timer = setTimeout(() => {
      setSpeechBubble(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [speechBubble]);

  // Dynamic Head Rotation & Tilts
  const getHeadRotation = () => {
    if (isBooped) return 4;
    switch (activeMood) {
      case 'headtilt': return 16;
      case 'curious': return -12;
      case 'bellyrub': return 180;
      case 'sleeping': return 8;
      case 'zoomies': return -8;
      default: return 0;
    }
  };

  // Dynamic Tail Wagging Velocity scales with mood & excitement level
  const baseTailSpeed = 
    activeMood === 'zoomies' ? 0.14 :
    activeMood === 'happy' || isHovered ? 0.28 :
    activeMood === 'panting' ? 0.38 :
    activeMood === 'sleeping' ? 2.5 :
    0.68;
  const tailSpeed = activeMood === 'sleeping' 
    ? 2.5 
    : Math.max(0.11, baseTailSpeed * (1 - (excitementLevel / 220)));

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className="relative flex items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* High Excitement Sparkles & Star Particles - Contained within companion frame */}
      {excitementLevel >= 55 && (
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.1, 0.95], y: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="absolute top-1 right-5 text-amber-300 font-bold text-xs pointer-events-none filter drop-shadow-md select-none z-30"
        >
          ✨
        </motion.div>
      )}
      {excitementLevel >= 75 && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9], y: [2, -2, 2] }}
          transition={{ repeat: Infinity, duration: 2.2, delay: 0.4, ease: 'easeInOut' }}
          className="absolute top-2 left-5 text-yellow-400 font-bold text-xs pointer-events-none filter drop-shadow-md select-none z-30"
        >
          ⭐
        </motion.div>
      )}

      {/* Floating Interactive Hearts & Sparkles Particles */}
      <AnimatePresence>
        {hearts.map(h => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, scale: 0.3, x: h.x, y: h.y }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.2 * h.scale, 1.4 * h.scale],
              y: h.y - 65,
              x: h.x + (Math.random() * 20 - 10)
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute z-30 pointer-events-none text-rose-400 font-bold text-sm filter drop-shadow-md"
          >
            💛
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Floating Dynamic Speech Bubble */}
      <AnimatePresence>
        {showSpeech && speechBubble && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.85 }}
            transition={{ duration: 0.22 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-amber-300 text-[11px] font-mono font-bold px-3 py-1.5 rounded-full border border-amber-500/40 shadow-xl backdrop-blur-md whitespace-nowrap flex items-center gap-1.5 pointer-events-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-white font-semibold">{speechBubble}</span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-b border-r border-amber-500/40 rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photorealistic Golden Retriever Canine Vector & Kinetic Shader Composite */}
      <motion.div
        onClick={interactive ? handleInteraction : undefined}
        animate={{
          scaleX: squash.scaleX,
          scaleY: squash.scaleY
        }}
        whileHover={interactive ? { scale: 1.03 } : undefined}
        whileTap={interactive ? { scale: 0.95 } : undefined}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`relative w-full h-full flex items-center justify-center ${
          interactive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
        }`}
      >
        <svg
          viewBox="0 0 200 180"
          className="w-full h-full drop-shadow-xl overflow-visible"
        >
          <defs>
            {/* Rich Multi-Toned Golden Fur Gradients */}
            <radialGradient id="furBase" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="45%" stopColor="#D97706" />
              <stop offset="85%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#78350F" />
            </radialGradient>

            <linearGradient id="creamMuzzle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="70%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            <linearGradient id="chestFeather" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FEF9C3" />
              <stop offset="60%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            <radialGradient id="earGradient" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="70%" stopColor="#92400E" />
              <stop offset="100%" stopColor="#78350F" />
            </radialGradient>

            {/* Realistic Canine Hazel/Amber Eye Iris */}
            <radialGradient id="canineIris" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="35%" stopColor="#D97706" />
              <stop offset="75%" stopColor="#78350F" />
              <stop offset="100%" stopColor="#291404" />
            </radialGradient>

            {/* Wet Leather Nose Gradient */}
            <radialGradient id="noseLeather" cx="45%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="40%" stopColor="#1E293B" />
              <stop offset="85%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Moist Panting Tongue Gradient */}
            <linearGradient id="tongueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDA4AF" />
              <stop offset="55%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>

            {/* Bridle Leather Collar */}
            <linearGradient id="collarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>

            {/* Realistic Soft Contact Ground Shadow */}
            <radialGradient id="dogShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="60%" stopColor="rgba(0,0,0,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>

          {/* Ground Soft Shadow */}
          <ellipse cx="100" cy="168" rx="55" ry="8" fill="url(#dogShadow)" />

          {/* 1. Voluminous Feathered Plume Tail (Wagging Animation) */}
          <motion.g
            animate={{
              rotate: [12, -18, 12],
              originX: '150px',
              originY: '140px'
            }}
            transition={{
              repeat: Infinity,
              duration: tailSpeed,
              ease: 'easeInOut'
            }}
          >
            {/* Base Tail Curve */}
            <path
              d="M140 135 C165 125 185 105 180 80 C175 60 155 75 145 95 C138 110 135 125 140 135 Z"
              fill="url(#furBase)"
            />
            {/* Tail Feather Tufts */}
            <path
              d="M180 80 C188 88 192 105 175 120 C165 130 150 138 145 135 C158 122 172 105 180 80 Z"
              fill="url(#creamMuzzle)"
              opacity="0.9"
            />
          </motion.g>

          {/* 2. Main Body & Muscular Canine Torso with Natural Respiration */}
          <motion.g
            animate={{
              scaleY: [1, 1.025, 1],
              originY: '145px'
            }}
            transition={{
              repeat: Infinity,
              duration: 2.8,
              ease: 'easeInOut'
            }}
          >
            {/* Torso Silhouette */}
            <path
              d="M60 120 C50 135 55 160 70 162 C90 165 110 165 130 162 C145 160 150 135 140 120 C135 105 125 98 100 98 C75 98 65 105 60 120 Z"
              fill="url(#furBase)"
            />

            {/* Cream Chest Feathering (Keel) */}
            <path
              d="M78 115 C85 130 92 152 100 155 C108 152 115 130 122 115 C118 108 108 104 100 104 C92 104 82 108 78 115 Z"
              fill="url(#chestFeather)"
              opacity="0.95"
            />

            {/* Chest Fur Texture Tufts */}
            <path d="M92 135 L96 142 L100 136 L104 142 L108 135" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
            <path d="M88 145 L94 150 L100 146 L106 150 L112 145" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4" />

            {/* Paws Resting Cleanly on Ground */}
            {/* Left Paw */}
            <ellipse cx="76" cy="162" rx="14" ry="7" fill="url(#furBase)" />
            <path d="M72 165 C72 162 74 160 76 160 C78 160 80 162 80 165" stroke="#92400E" strokeWidth="1" fill="none" />
            <path d="M68 165 C68 162 70 161 72 161" stroke="#92400E" strokeWidth="1" fill="none" />
            <path d="M80 161 C82 161 84 162 84 165" stroke="#92400E" strokeWidth="1" fill="none" />

            {/* Right Paw */}
            <ellipse cx="124" cy="162" rx="14" ry="7" fill="url(#furBase)" />
            <path d="M120 165 C120 162 122 160 124 160 C126 160 128 162 128 165" stroke="#92400E" strokeWidth="1" fill="none" />
            <path d="M116 165 C116 162 118 161 120 161" stroke="#92400E" strokeWidth="1" fill="none" />
            <path d="M128 161 C130 161 132 162 132 165" stroke="#92400E" strokeWidth="1" fill="none" />

            {/* Bridle Leather Collar with Vault Medallion & Milestone Trophy */}
            <path
              d="M75 106 C85 112 115 112 125 106 C126 109 124 112 122 113 C112 118 88 118 78 113 C76 112 74 109 75 106 Z"
              fill="url(#collarGrad)"
              stroke="#0369A1"
              strokeWidth="0.8"
            />
            {/* Collar Stitching & Hardware Tag */}
            {accessory === 'gold_medal' || accessory === 'crown' || accessory === 'shield_badge' ? (
              <g transform="translate(100, 116)">
                <circle cx="0" cy="0" r="5.5" fill="#F59E0B" stroke="#78350F" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="3.5" fill="#FDE047" />
                {/* Mini Star / Shield on Medal */}
                <path d="M0 -2.2 L0.7 -0.7 L2.2 -0.5 L1.1 0.6 L1.4 2.1 L0 1.3 L-1.4 2.1 L-1.1 0.6 L-2.2 -0.5 L-0.7 -0.7 Z" fill="#B45309" />
              </g>
            ) : (
              <>
                <circle cx="100" cy="115" r="4.5" fill="#F59E0B" stroke="#78350F" strokeWidth="0.8" />
                <circle cx="100" cy="115" r="2" fill="#FEF08A" />
              </>
            )}
          </motion.g>

          {/* 3. Golden Retriever Head, Facial Anatomy & Expressive Features */}
          <motion.g
            animate={{
              rotate: getHeadRotation(),
              y: activeMood === 'panting' || isHovered ? [0, -1.5, 0] : 0,
              originX: '100px',
              originY: '80px'
            }}
            transition={{
              rotate: { type: 'spring', stiffness: 320, damping: 22 },
              y: { repeat: Infinity, duration: 0.35, ease: 'easeInOut' }
            }}
          >
            {/* Ambient Star Aura behind head */}
            {accessory === 'star_aura' && (
              <g transform="translate(100, 42)">
                <motion.g
                  animate={{ rotate: [0, 360], scale: [1, 1.08, 1] }}
                  transition={{ rotate: { repeat: Infinity, duration: 16, ease: 'linear' }, scale: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } }}
                  style={{ transformOrigin: '0px 0px' }}
                >
                  <circle cx="0" cy="0" r="34" fill="none" stroke="#FDE047" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                  <circle cx="0" cy="0" r="38" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
                </motion.g>
              </g>
            )}

            {/* Flop Ears with Natural Golden Waves */}
            {/* Left Ear */}
            <motion.g
              animate={{
                rotate: isHovered ? [0, -4, 0] : (activeMood === 'curious' ? -6 : 0),
                originX: '65px',
                originY: '35px'
              }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            >
              <path
                d="M65 35 C50 40 38 60 40 85 C42 102 52 108 58 102 C65 95 68 75 68 55 Z"
                fill="url(#earGradient)"
              />
              {/* Ear Fold & Dark Shadow */}
              <path
                d="M58 50 C52 65 48 85 54 96 C50 82 52 60 62 45 Z"
                fill="#78350F"
                opacity="0.4"
              />
            </motion.g>

            {/* Right Ear */}
            <motion.g
              animate={{
                rotate: isHovered ? [0, 4, 0] : (activeMood === 'curious' ? 6 : 0),
                originX: '135px',
                originY: '35px'
              }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', delay: 0.2 }}
            >
              <path
                d="M135 35 C150 40 162 60 160 85 C158 102 148 108 142 102 C135 95 132 75 132 55 Z"
                fill="url(#earGradient)"
              />
              {/* Ear Fold & Dark Shadow */}
              <path
                d="M142 50 C148 65 152 85 146 96 C150 82 148 60 138 45 Z"
                fill="#78350F"
                opacity="0.4"
              />
            </motion.g>

            {/* Main Skull & Broad Forehead with Defined Stop */}
            <path
              d="M65 45 C65 25 80 18 100 18 C120 18 135 25 135 45 C135 70 130 85 100 85 C70 85 65 70 65 45 Z"
              fill="url(#furBase)"
            />

            {/* Special Milestone Head Accessories - Anchored precisely on top of skull at (x=100, y=18) */}
            {accessory === 'crown' && (
              <g transform="translate(85, 2)">
                <motion.g
                  initial={{ scale: 0, y: -8 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  style={{ transformOrigin: '15px 16px' }}
                >
                  {/* 3-Pointed Golden Royal Crown */}
                  <path d="M0 16 L3 4 L11 11 L15 1 L19 11 L27 4 L30 16 Z" fill="#F59E0B" stroke="#78350F" strokeWidth="1" />
                  <rect x="0" y="16" width="30" height="3" rx="1" fill="#D97706" />
                  {/* Crown Jewels */}
                  <circle cx="15" cy="5" r="1.6" fill="#EF4444" />
                  <circle cx="5" cy="8" r="1.3" fill="#3B82F6" />
                  <circle cx="25" cy="8" r="1.3" fill="#10B981" />
                </motion.g>
              </g>
            )}

            {accessory === 'party_hat' && (
              <g transform="translate(90, -8)">
                <motion.g
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: -6 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  style={{ transformOrigin: '10px 24px' }}
                >
                  {/* Party Cone Hat */}
                  <path d="M0 24 L10 2 L20 24 Z" fill="#6366F1" stroke="#4338CA" strokeWidth="0.8" />
                  <path d="M4 16 L16 16 L18 20 L2 20 Z" fill="#F43F5E" />
                  <path d="M6 10 L14 10 L15 13 L5 13 Z" fill="#FBBF24" />
                  {/* Pom-pom */}
                  <circle cx="10" cy="2" r="3" fill="#FDE047" />
                </motion.g>
              </g>
            )}

            {accessory === 'shield_badge' && (
              <g transform="translate(92, 6)">
                <motion.g
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  style={{ transformOrigin: '8px 9px' }}
                >
                  <path d="M8 0 L16 3 L16 9 C16 14 8 18 8 18 C8 18 0 14 0 9 L0 3 Z" fill="#0284C7" stroke="#0369A1" strokeWidth="0.8" />
                  <path d="M4 8 L7 11 L12 5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </motion.g>
              </g>
            )}

            {/* Forehead Ridge / Fur Texture */}
            <path d="M96 24 C98 32 100 38 100 45" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <path d="M104 24 C102 32 100 38 100 45" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

            {/* Expressive Canine Brow Arches */}
            <motion.g
              animate={{
                y: activeMood === 'curious' || activeMood === 'headtilt' ? -2.5 : 0
              }}
            >
              <path d="M72 40 C78 36 86 38 88 43" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              <path d="M128 40 C122 36 114 38 112 43" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </motion.g>

            {/* Realistic Hazel/Amber Canine Eyes with Gaze & Blinking */}
            {/* Left Eye */}
            <g transform={`translate(${gaze.x * 0.7}, ${gaze.y * 0.7})`}>
              {/* Eye Socket Shadow & Lacrimal Tear Duct */}
              <ellipse cx="80" cy="50" rx="9" ry="8" fill="#1E120A" />
              
              {/* Hazel Amber Iris */}
              <circle cx="80" cy="50" r="7.5" fill="url(#canineIris)" />
              
              {/* Pupil */}
              <circle cx="80" cy="50" r="4.2" fill="#050302" />
              
              {/* Corneal Specular Highlights (Wet Catchlights) */}
              <circle cx="78" cy="48" r="2.2" fill="#FFFFFF" opacity="0.95" />
              <circle cx="82.5" cy="52" r="1.1" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Right Eye */}
            <g transform={`translate(${gaze.x * 0.7}, ${gaze.y * 0.7})`}>
              {/* Eye Socket Shadow & Lacrimal Tear Duct */}
              <ellipse cx="120" cy="50" rx="9" ry="8" fill="#1E120A" />
              
              {/* Hazel Amber Iris */}
              <circle cx="120" cy="50" r="7.5" fill="url(#canineIris)" />
              
              {/* Pupil */}
              <circle cx="120" cy="50" r="4.2" fill="#050302" />
              
              {/* Corneal Specular Highlights (Wet Catchlights) */}
              <circle cx="118" cy="48" r="2.2" fill="#FFFFFF" opacity="0.95" />
              <circle cx="122.5" cy="52" r="1.1" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Natural Eyelid Blink Overlay */}
            {isBlinking && (
              <>
                <ellipse cx="80" cy="50" rx="9.5" ry="8.5" fill="url(#furBase)" />
                <path d="M71 50 C76 54 84 54 89 50" stroke="#78350F" strokeWidth="1.5" fill="none" />
                <ellipse cx="120" cy="50" rx="9.5" ry="8.5" fill="url(#furBase)" />
                <path d="M111 50 C116 54 124 54 129 50" stroke="#78350F" strokeWidth="1.5" fill="none" />
              </>
            )}

            {/* Cream Soft Muzzle with Whiskers & Whisker Bed Pores */}
            <path
              d="M78 62 C74 78 82 92 100 92 C118 92 126 78 122 62 C115 56 85 56 78 62 Z"
              fill="url(#creamMuzzle)"
            />

            {/* Whisker Pores */}
            <circle cx="88" cy="74" r="1" fill="#78350F" opacity="0.7" />
            <circle cx="85" cy="78" r="1" fill="#78350F" opacity="0.7" />
            <circle cx="90" cy="80" r="1" fill="#78350F" opacity="0.7" />
            <circle cx="112" cy="74" r="1" fill="#78350F" opacity="0.7" />
            <circle cx="115" cy="78" r="1" fill="#78350F" opacity="0.7" />
            <circle cx="110" cy="80" r="1" fill="#78350F" opacity="0.7" />

            {/* Moist Panting Tongue (Visible when happy, panting, or hovered) */}
            {(activeMood === 'panting' || activeMood === 'happy' || activeMood === 'zoomies' || isHovered) && (
              <motion.g
                animate={{
                  scaleY: [1, 1.15, 1],
                  originY: '82px'
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.35,
                  ease: 'easeInOut'
                }}
              >
                {/* Tongue Body */}
                <path
                  d="M93 84 C93 96 95 106 100 106 C105 106 107 96 107 84 Z"
                  fill="url(#tongueGrad)"
                  stroke="#9F1239"
                  strokeWidth="0.8"
                />
                {/* Central Lingual Sulcus Groove */}
                <line x1="100" y1="86" x2="100" y2="102" stroke="#BE123C" strokeWidth="1" strokeLinecap="round" />
              </motion.g>
            )}

            {/* Black Canine Flews (Upper Lips) & Philtrum */}
            <path
              d="M86 80 C92 84 98 83 100 81 C102 83 108 84 114 80"
              stroke="#1E293B"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Philtrum Vertical Line */}
            <line x1="100" y1="72" x2="100" y2="81" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />

            {/* Wet Cobblestone Leather Nose (Clickable Boop Target) */}
            <g
              onClick={handleNoseBoop}
              className="cursor-pointer group"
              title="Click to boop Zack's nose! ✨"
            >
              {/* Nose Body */}
              <path
                d="M90 62 C88 62 87 66 92 72 C96 76 104 76 108 72 C113 66 112 62 110 62 C104 60 96 60 90 62 Z"
                fill="url(#noseLeather)"
                className="transition-transform group-hover:scale-105"
              />
              {/* Nostril Cavity Slits */}
              <ellipse cx="94" cy="69" rx="2" ry="1.2" fill="#020617" />
              <ellipse cx="106" cy="69" rx="2" ry="1.2" fill="#020617" />
              {/* Wet Specular Moisture Highlight */}
              <ellipse cx="98" cy="64" rx="4" ry="1.5" fill="#94A3B8" opacity="0.6" />
              <circle cx="96" cy="64" r="1.2" fill="#FFFFFF" opacity="0.9" />
            </g>
          </motion.g>

          {/* 4. Interactive Peek-a-boo Paws for Password/PIN Shield */}
          {(isPasswordMode || activeMood === 'covering' || activeMood === 'peeking') && (
            <motion.g
              initial={{ y: 50, opacity: 0 }}
              animate={{
                y: activeMood === 'peeking' ? 18 : 0,
                opacity: 1
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 24 }}
            >
              {/* Left P Shield Paw */}
              <g transform="translate(68, 48)">
                <ellipse cx="10" cy="10" rx="14" ry="10" fill="url(#furBase)" stroke="#92400E" strokeWidth="1" />
                {/* Toe Pads */}
                <circle cx="2" cy="7" r="3.2" fill="#D97706" />
                <circle cx="8" cy="4" r="3.2" fill="#D97706" />
                <circle cx="14" cy="5" r="3.2" fill="#D97706" />
                <circle cx="19" cy="9" r="3" fill="#D97706" />
                {/* Main Pad */}
                <path d="M5 12 C6 10 14 10 15 12 C15 16 5 16 5 12 Z" fill="#78350F" opacity="0.6" />
              </g>

              {/* Right P Shield Paw */}
              <g transform="translate(108, 48)">
                <ellipse cx="14" cy="10" rx="14" ry="10" fill="url(#furBase)" stroke="#92400E" strokeWidth="1" />
                {/* Toe Pads */}
                <circle cx="5" cy="9" r="3" fill="#D97706" />
                <circle cx="10" cy="5" r="3.2" fill="#D97706" />
                <circle cx="16" cy="4" r="3.2" fill="#D97706" />
                <circle cx="22" cy="7" r="3.2" fill="#D97706" />
                {/* Main Pad */}
                <path d="M9 12 C10 10 18 10 19 12 C19 16 9 16 9 12 Z" fill="#78350F" opacity="0.6" />
              </g>
            </motion.g>
          )}
        </svg>
      </motion.div>
    </div>
  );
};
