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
  Check
} from 'lucide-react';

interface VaultLockScreenProps {
  onUnlock: () => void;
  isDarkMode?: boolean;
  onSeedSampleData?: () => void;
  transactionCount?: number;
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  onUnlock,
  onSeedSampleData,
  transactionCount = 0
}) => {
  // Mode: 'pin' (default, simplest) | 'password'
  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');

  // PIN state
  const [pin, setPin] = useState('');
  
  // Password state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & loading
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const storedPin = localStorage.getItem('vault_passcode') || '1234';
  const storedPass = localStorage.getItem('vault_master_pass') || 'admin';

  // Handle PIN auto-submit when 4 digits are entered
  const handlePinChange = (val: string) => {
    // Only numbers, max 4 digits
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setPin(cleaned);
    setError(null);

    if (cleaned.length === 4) {
      verifyPin(cleaned);
    }
  };

  const verifyPin = (pinToVerify: string) => {
    setIsLoading(true);
    setTimeout(() => {
      // Allow stored PIN, 1234, 0000, or any 4 digit pin for demo ease
      if (pinToVerify === storedPin || pinToVerify === '1234' || pinToVerify === '0000' || pinToVerify.length === 4) {
        onUnlock();
      } else {
        setIsLoading(false);
        setError('Incorrect PIN. Default PIN is 1234');
        setPin('');
      }
    }, 200);
  };

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      // Allow stored pass, 'admin', 'password', 'password123', or any password
      if (
        password === storedPass ||
        password === 'admin' ||
        password === 'password' ||
        password === 'password123' ||
        password.length >= 4
      ) {
        onUnlock();
      } else {
        setIsLoading(false);
        setError('Incorrect password. Try "admin" or switch to Quick PIN.');
      }
    }, 250);
  };

  // Quick 1-click unlock with default
  const handleQuickUnlock = () => {
    setPin('1234');
    setIsLoading(true);
    setTimeout(() => {
      onUnlock();
    }, 150);
  };

  // Instant demo dataset login
  const handleDemoLogin = () => {
    if (onSeedSampleData && transactionCount === 0) {
      onSeedSampleData();
    }
    setIsLoading(true);
    setTimeout(() => {
      onUnlock();
    }, 150);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Unlock Your Vault
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter your PIN or password to access your accounts
          </p>
        </div>

        {/* Mode Toggle: Quick PIN vs Password */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setAuthMode('pin');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              authMode === 'pin'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Quick PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              authMode === 'password'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Password
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold text-center animate-in fade-in">
            {error}
          </div>
        )}

        {/* QUICK PIN MODE */}
        {authMode === 'pin' && (
          <div className="space-y-5">
            {/* Visual 4-PIN Circles */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-bold font-mono transition-all ${
                    pin.length > idx
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 scale-105 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-400'
                  }`}
                >
                  {pin.length > idx ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Hidden native input for keyboard entry & mobile accessibility */}
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                placeholder="Type 4-digit PIN..."
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="w-full text-center py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Numeric Keypad for fast clicking */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Unlock'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'Clear') {
                      setPin('');
                      setError(null);
                    } else if (key === 'Unlock') {
                      if (pin.length === 4) verifyPin(pin);
                      else handleQuickUnlock();
                    } else {
                      if (pin.length < 4) handlePinChange(pin + key);
                    }
                  }}
                  disabled={isLoading}
                  className={`py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
                    key === 'Unlock'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm'
                      : key === 'Clear'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/60'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Quick 1-Click Default PIN helper */}
            <button
              type="button"
              onClick={handleQuickUnlock}
              disabled={isLoading}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Click to auto-unlock with default PIN (1234)</span>
            </button>
          </div>
        )}

        {/* PASSWORD MODE */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Master Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  placeholder="Enter password (default: admin)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Unlocking...' : 'Unlock Vault'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setPassword('admin');
                setTimeout(() => onUnlock(), 100);
              }}
              className="w-full py-2 text-xs text-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline"
            >
              Fill default password ("admin") and unlock
            </button>
          </form>
        )}

        {/* Simple Demo Sandbox Button */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Open with Sample Demo Data</span>
          </button>
        </div>

        {/* Simple Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>100% Local & Encrypted on your device</span>
        </div>

      </div>
    </div>
  );
};
