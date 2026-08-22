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
  CheckCircle2,
  Terminal,
  Cpu
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
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 transition-colors">
      {/* Brand & Status */}
      <div className="flex items-center gap-3.5">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-500 p-[1px] shadow-lg shadow-cyan-500/20 cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center font-bold text-cyan-400 text-sm tracking-wider">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse"></span>
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 
              onClick={() => onNavigate('dashboard')}
              className="font-bold text-white text-base tracking-tight cursor-pointer hover:text-cyan-400 transition-colors flex items-center gap-1.5"
            >
              <span>Vault</span>
              <span className="text-slate-500 font-normal">|</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 font-semibold text-sm">
                Financial Engineering & QA Suite
              </span>
            </h1>
            
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <Terminal className="w-3 h-3 text-cyan-400" />
              SDET Architecture
            </span>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Air-Gapped & Local
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Zero-Knowledge SQLite
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="font-mono text-slate-300 font-semibold">{transactionCount} Ledger Records</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400 hidden md:inline">Deterministic Deduplication</span>
          </p>
        </div>
      </div>

      {/* Quick Action Tools - Only shown when unlocked */}
      {!isVaultLocked ? (
        <div className="flex items-center flex-wrap gap-2">
          {/* Sample Data Loader Button */}
          <button
            id="seed-sample-btn"
            onClick={onSeedSampleData}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 text-xs font-semibold transition-all shadow-sm"
            title="Populate demo bank transactions to test charts and budgeting features"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSeeding ? 'Loading Data...' : (transactionCount === 0 ? 'Load Demo Data' : 'Reset Demo Data')}</span>
          </button>

          {/* Quick Statement Ingest */}
          <button
            id="quick-ingest-btn"
            onClick={() => onNavigate('ingestion')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 border border-slate-700 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import PDF / CSV</span>
          </button>

          {/* Quick Add Manual Transaction */}
          <button
            id="add-tx-btn"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-sm shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </button>

          {/* Vault Lock Toggle */}
          <button
            id="vault-lock-btn"
            onClick={onToggleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-all shadow-sm"
            title="Click to lock vault"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unlocked</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Vault Protected</span>
          </div>
        </div>
      )}
    </header>
  );
};


