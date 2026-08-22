import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Plus, 
  UploadCloud, 
  Sparkles, 
  Sun,
  Moon,
  HardDrive,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { VaultHealth } from '../types';

interface HeaderProps {
  health: VaultHealth | null;
  transactionCount: number;
  isVaultLocked: boolean;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onToggleLock: () => void;
  onOpenAddModal: () => void;
  onSeedSampleData: () => void;
  onNavigate: (tab: string) => void;
  isSeeding: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  transactionCount,
  isVaultLocked,
  isDarkMode = true,
  onToggleTheme,
  onToggleLock,
  onOpenAddModal,
  onSeedSampleData,
  onNavigate,
  isSeeding
}) => {
  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-colors shadow-xs">
      {/* Brand & Status */}
      <div className="flex items-center gap-3.5">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white cursor-pointer hover:scale-105 transition-transform"
        >
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 
              onClick={() => onNavigate('dashboard')}
              className="font-bold text-slate-900 dark:text-white text-lg tracking-tight cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
            >
              Vault
            </h1>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-600">&bull;</span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Personal Financial Manager</span>
            
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              100% Private & Local
            </span>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-1.5">
            <span>Persistent SQLite storage</span>
            <span>&bull;</span>
            <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{transactionCount} records</span>
          </p>
        </div>
      </div>

      {/* Quick Action Tools */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Theme Toggle (Dark / Light) */}
        {onToggleTheme && (
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-all shadow-xs"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        )}

        {/* Sample Data Loader Button */}
        <button
          id="seed-sample-btn"
          onClick={onSeedSampleData}
          disabled={isSeeding}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 text-xs font-semibold transition-all shadow-xs"
          title="Populate demo bank transactions to test charts and budgeting features"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{isSeeding ? 'Loading Demo Data...' : (transactionCount === 0 ? 'Load Demo Statements' : 'Reset Demo Data')}</span>
        </button>

        {/* Quick Statement Ingest */}
        <button
          id="quick-ingest-btn"
          onClick={() => onNavigate('ingestion')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md"
        >
          <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
          <span>Import Statement</span>
        </button>

        {/* Quick Add Manual Transaction */}
        <button
          id="add-tx-btn"
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Record</span>
        </button>

        {/* Vault Lock Toggle */}
        <button
          id="vault-lock-btn"
          onClick={onToggleLock}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
            isVaultLocked 
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60' 
              : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title={isVaultLocked ? 'Vault is locked. Click to unlock.' : 'Click to hide and lock financial records'}
        >
          {isVaultLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Locked</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Unlocked</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

