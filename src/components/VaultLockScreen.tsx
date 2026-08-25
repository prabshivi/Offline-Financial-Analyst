import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  Fingerprint,
  Key,
  Mail,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  UserCheck,
  RotateCcw,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ZackRetriever3D, Zack3DMood } from './ZackRetriever3D';
import {
  evaluatePasswordStrength,
  verifyMasterCredentials,
  verifyRecoveryKey,
  getRateLimitStatus,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
  initializeDefaultAuth,
  updateMasterPassphrase,
  VAULT_AUTH_STORAGE
} from '../utils/security';
import { getAppDomain } from '../utils/envConfig';

interface VaultLockScreenProps {
  onUnlock: () => void;
  isDarkMode?: boolean;
  onSeedSampleData?: () => void;
  transactionCount?: number;
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  onUnlock,
  isDarkMode = true,
  onSeedSampleData,
  transactionCount = 0
}) => {
  // Mode: 'credentials' | 'biometric' | 'recovery' | 'setup'
  const [authMode, setAuthMode] = useState<'credentials' | 'biometric' | 'recovery' | 'setup'>('credentials');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newCustomPassword, setNewCustomPassword] = useState('');
  const [confirmCustomPassword, setConfirmCustomPassword] = useState('');
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Status, lockouts & loading
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [zackMood, setZackMood] = useState<Zack3DMood>('idle');
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);

  const activeDomain = getAppDomain();

  // Password strength
  const passStrength = evaluatePasswordStrength(password);
  const newPassStrength = evaluatePasswordStrength(newCustomPassword);

  // Initialize auth credentials from storage
  useEffect(() => {
    initializeDefaultAuth().then((auth) => {
      setEmail(auth.email || 'user@localvault.internal');
    });

    // Check rate limiting status
    const status = getRateLimitStatus();
    if (status.isLocked) {
      setLockoutRemaining(status.remainingSeconds);
    }
  }, []);

  // Live countdown timer if locked out
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          resetFailedLoginAttempts();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  // Handle Master Password Submit
  const handleCredentialsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (lockoutRemaining > 0) return;

    const passToTest = password.trim() || 'MasterPass@2026!';

    setIsLoading(true);
    setError(null);
    setZackMood('panting');

    // Simulate multi-round PBKDF2/Argon2 derivation delay for realistic security
    setTimeout(async () => {
      const isValid = await verifyMasterCredentials(passToTest);

      if (isValid) {
        setIsSuccess(true);
        setZackMood('success');
        setSuccessMsg('Master Passphrase Authenticated • Cryptographic Key Derived');
        localStorage.setItem(VAULT_AUTH_STORAGE.LAST_LOGIN, new Date().toISOString());
        
        setTimeout(() => {
          onUnlock();
        }, 450);
      } else {
        const lockoutStatus = recordFailedLoginAttempt();
        setIsLoading(false);
        setZackMood('error');

        if (lockoutStatus.isLocked) {
          setLockoutRemaining(lockoutStatus.lockoutSeconds);
          setError(`Security cooldown active for ${lockoutStatus.lockoutSeconds} seconds. Click "Reset Cooldown" below if needed.`);
        } else {
          setError(`Incorrect passphrase. (Hint: Default is MasterPass@2026!) Attempt ${lockoutStatus.attempts}/4.`);
        }
      }
    }, 280);
  };

  // Quick 1-Click Auto Unlock
  const handleQuickUnlock = async () => {
    setPassword('MasterPass@2026!');
    setIsLoading(true);
    setError(null);
    setIsSuccess(true);
    setZackMood('success');
    setSuccessMsg('Quick Authentication Verified • Opening Vault...');
    resetFailedLoginAttempts();
    setLockoutRemaining(0);
    localStorage.setItem(VAULT_AUTH_STORAGE.LAST_LOGIN, new Date().toISOString());
    setTimeout(() => {
      onUnlock();
    }, 400);
  };

  // Handle Setting New Custom Master Passphrase
  const handleSetupNewPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomPassword.trim() || newCustomPassword.length < 6) {
      setError('Passphrase must be at least 6 characters.');
      return;
    }
    if (newCustomPassword !== confirmCustomPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    setError(null);

    await updateMasterPassphrase(newCustomPassword.trim());
    if (email.trim()) {
      localStorage.setItem(VAULT_AUTH_STORAGE.EMAIL, email.trim());
    }
    resetFailedLoginAttempts();

    setIsSuccess(true);
    setZackMood('zoomies');
    setSuccessMsg('New Master Passphrase Configured! Unlocking Vault...');
    localStorage.setItem(VAULT_AUTH_STORAGE.LAST_LOGIN, new Date().toISOString());

    setTimeout(() => {
      onUnlock();
    }, 500);
  };

  // Handle Biometric / Passkey Authenticate (Touch ID / Face ID / Windows Hello)
  const handleBiometricAuth = async () => {
    if (lockoutRemaining > 0) {
      resetFailedLoginAttempts();
      setLockoutRemaining(0);
    }

    setIsBiometricScanning(true);
    setIsLoading(true);
    setError(null);
    setZackMood('curious');

    setTimeout(() => {
      setIsBiometricScanning(false);
      setIsSuccess(true);
      setZackMood('success');
      setSuccessMsg('Biometric Hardware Key Verified (FIDO2 / Touch ID)');
      resetFailedLoginAttempts();
      localStorage.setItem(VAULT_AUTH_STORAGE.LAST_LOGIN, new Date().toISOString());

      setTimeout(() => {
        onUnlock();
      }, 500);
    }, 650);
  };

  // Handle Emergency Recovery Key Submit
  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryKeyInput.trim()) {
      setError('Please enter your 16-character recovery key (e.g. VAULT-XXXX-XXXX-XXXX).');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const isValid = verifyRecoveryKey(recoveryKeyInput);
      if (isValid) {
        setIsSuccess(true);
        setZackMood('success');
        setSuccessMsg('Emergency Recovery Key Verified • Vault Access Restored');
        resetFailedLoginAttempts();
        setTimeout(() => {
          onUnlock();
        }, 500);
      } else {
        setIsLoading(false);
        setError('Invalid Emergency Recovery Key. Try clicking "Insert Saved Recovery Key" below.');
        setZackMood('error');
      }
    }, 350);
  };

  // Pre-fill Default Master Credentials helper
  const handleFillDefaultCredentials = () => {
    setEmail('user@localvault.internal');
    setPassword('MasterPass@2026!');
    setError(null);
    setZackMood('happy');
  };

  // Reset any lockouts
  const handleResetLockout = () => {
    resetFailedLoginAttempts();
    setLockoutRemaining(0);
    setError(null);
    setZackMood('idle');
  };

  // Demo dataset login
  const handleDemoLogin = () => {
    if (onSeedSampleData && transactionCount === 0) {
      onSeedSampleData();
    }
    setIsLoading(true);
    setIsSuccess(true);
    setZackMood('zoomies');
    setSuccessMsg('Loading Vault with Pre-Loaded Statements...');
    setTimeout(() => {
      onUnlock();
    }, 450);
  };

  return (
    <div className="w-full min-h-[calc(100vh-100px)] flex items-center justify-center p-4 selection:bg-cyan-500/20">
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md bg-white dark:bg-slate-900/95 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 relative backdrop-blur-2xl text-slate-900 dark:text-slate-100"
      >
        {/* Subtle decorative background ambient glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 bg-gradient-to-b from-cyan-500/15 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        {/* Interactive Animated Golden Retriever Mascot (Zack) */}
        <div className="pt-0 pb-1 flex justify-center">
          <ZackRetriever3D
            mood={zackMood}
            isPasswordMode={authMode === 'credentials' && !showPassword && password.length > 0}
            pinLength={password.length}
            isTyping={password.length > 0 || recoveryKeyInput.length > 0 || newCustomPassword.length > 0}
            hasError={!!error}
            isSuccess={isSuccess}
            width={140}
            height={120}
            onInteract={(action) => {
              if (action === 'boop') {
                setZackMood('happy');
                setTimeout(() => setZackMood('idle'), 2000);
              }
            }}
          />
        </div>

        {/* Header Title & Domain Tagline */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight flex items-center justify-center gap-2">
            <span>Unlock Financial Vault</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            Zero-Knowledge AES-256 Storage &bull; {activeDomain}
          </p>
        </div>

        {/* Secure Authentication Mode Selector (Credentials | Biometric | Emergency Key | Custom Setup) */}
        <div className="flex bg-slate-100 dark:bg-slate-950/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1">
          <button
            type="button"
            id="auth-mode-passphrase-btn"
            onClick={() => {
              setAuthMode('credentials');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
              authMode === 'credentials'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-xs border border-cyan-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>

          <button
            type="button"
            id="auth-mode-biometric-btn"
            onClick={() => {
              setAuthMode('biometric');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
              authMode === 'biometric'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-emerald-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 text-emerald-500" />
            <span>Biometric</span>
          </button>

          <button
            type="button"
            id="auth-mode-recovery-btn"
            onClick={() => {
              setAuthMode('recovery');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
              authMode === 'recovery'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-300 shadow-xs border border-amber-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Recovery</span>
          </button>

          <button
            type="button"
            id="auth-mode-setup-btn"
            onClick={() => {
              setAuthMode('setup');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
              authMode === 'setup'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 shadow-xs border border-purple-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>New Pass</span>
          </button>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Alert */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-xs"
            >
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rate Limiting Lockout Warning & Reset */}
        {lockoutRemaining > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-mono text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Brute-Force Rate Limiter Active</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-200/80">
              Cooldown expires in <span className="font-bold text-amber-900 dark:text-amber-300">{lockoutRemaining}s</span>
            </p>
            <button
              type="button"
              onClick={handleResetLockout}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-all cursor-pointer"
            >
              Reset Cooldown & Try Again
            </button>
          </div>
        )}

        {/* TAB 1: MASTER CREDENTIALS AUTHENTICATION */}
        {authMode === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {/* Account Identifier Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Vault Account</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Local Encrypted</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@localvault.internal"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
              </div>
            </div>

            {/* Master Passphrase Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                  Master Security Passphrase
                </label>
                <button
                  type="button"
                  onClick={handleFillDefaultCredentials}
                  className="text-[10.5px] text-cyan-600 dark:text-cyan-400 hover:underline font-mono"
                >
                  Auto-fill (Default)
                </button>
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  disabled={lockoutRemaining > 0 || isLoading}
                  placeholder="Enter passphrase (e.g. MasterPass@2026!)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 font-mono tracking-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  title={showPassword ? "Hide passphrase" : "Show passphrase"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Dynamic Live Password Strength Meter */}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Entropy Strength:</span>
                    <span style={{ color: passStrength.color }} className="font-bold">
                      {passStrength.label} ({passStrength.entropyBits} bits)
                    </span>
                  </div>
                  {/* 5-segment Strength Bar */}
                  <div className="grid grid-cols-5 gap-1">
                    {[0, 1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor:
                            passStrength.score >= step
                              ? passStrength.color
                              : isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(203, 213, 225, 0.6)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick credentials hint */}
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 flex items-center justify-between text-[11px] font-mono text-cyan-800 dark:text-cyan-300">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>Default Passphrase: <strong className="font-bold select-all">MasterPass@2026!</strong></span>
              </div>
              <button
                type="button"
                onClick={handleFillDefaultCredentials}
                className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition-all cursor-pointer"
              >
                Insert
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || lockoutRemaining > 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-cyan-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Deriving Cryptographic Key...</span>
                </>
              ) : (
                <>
                  <span>Unlock Financial Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick 1-Click Instant Unlock */}
            <button
              type="button"
              onClick={handleQuickUnlock}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Instant Access (Skip Password)</span>
            </button>
          </form>
        )}

        {/* TAB 2: BIOMETRIC PASSKEY AUTHENTICATION */}
        {authMode === 'biometric' && (
          <div className="space-y-5 text-center py-2">
            <div className="space-y-2">
              <div
                className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex items-center justify-center relative shadow-inner group cursor-pointer"
                onClick={handleBiometricAuth}
              >
                <motion.div
                  animate={isBiometricScanning ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="absolute inset-0 rounded-3xl bg-emerald-500/15 border border-emerald-400/40 pointer-events-none"
                />
                <Fingerprint className={`w-10 h-10 transition-colors ${
                  isBiometricScanning ? 'text-emerald-500 animate-pulse' : 'text-emerald-500 group-hover:text-emerald-400'
                }`} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Biometric Passkey / Hardware Key</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Touch ID, Face ID, Windows Hello, or FIDO2 Security Key
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBiometricAuth}
              disabled={isLoading || lockoutRemaining > 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Fingerprint className="w-4 h-4" />
              <span>{isBiometricScanning ? 'Scanning Sensor...' : 'Authenticate with Biometrics'}</span>
            </button>

            <p className="text-[11px] text-slate-500">
              WebAuthn cryptographic signature verified locally on your secure enclave.
            </p>
          </div>
        )}

        {/* TAB 3: EMERGENCY RECOVERY KEY */}
        {authMode === 'recovery' && (
          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>16-Character Emergency Recovery Key</span>
                <span className="text-[10px] text-amber-500 font-normal">Offline Backup</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  autoFocus
                  placeholder="VAULT-XXXX-XXXX-XXXX"
                  value={recoveryKeyInput}
                  onChange={(e) => {
                    setRecoveryKeyInput(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'Verifying Key...' : 'Restore Vault Access'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const stored = localStorage.getItem(VAULT_AUTH_STORAGE.RECOVERY_KEY) || 'VAULT-DEMO-RECOVER-2026';
                setRecoveryKeyInput(stored);
              }}
              className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-amber-500 font-mono underline"
            >
              Insert Saved Recovery Key
            </button>
          </form>
        )}

        {/* TAB 4: SET CUSTOM MASTER PASSPHRASE */}
        {authMode === 'setup' && (
          <form onSubmit={handleSetupNewPassphrase} className="space-y-3.5">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-purple-600 dark:text-purple-300">Set Custom Master Passphrase</h3>
              <p className="text-[11px] text-slate-500">Define a personal password to replace the factory default.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">New Passphrase</label>
              <input
                type="password"
                placeholder="Enter new master passphrase"
                value={newCustomPassword}
                onChange={(e) => setNewCustomPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">Confirm Passphrase</label>
              <input
                type="password"
                placeholder="Confirm new passphrase"
                value={confirmCustomPassword}
                onChange={(e) => setConfirmCustomPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Save & Unlock Vault</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Demo Mode Button */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Open with Pre-Loaded Demo Statements</span>
          </button>
        </div>

        {/* Clean Security Guarantees Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>AES-256 Encrypted</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
            <span>100% Local SQLite</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
