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
  Cpu,
  Globe
} from 'lucide-react';
import { VaultHealth } from '../types';
import { getRouteByTab } from '../utils/router';
import { getAppDomain } from '../utils/envConfig';

interface HeaderProps {
  health: VaultHealth | null;
  transactionCount: number;
  isVaultLocked: boolean;
  isDarkMode?: boolean;
  activeTab?: string;
  statementProfile?: any;
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
  activeTab = 'dashboard',
  statementProfile,
  onToggleTheme,
  onToggleLock,
  onOpenAddModal,
  onSeedSampleData,
  onNavigate,
  isSeeding
}) => {
  const route = getRouteByTab(activeTab);
  const accountHolder = statementProfile?.accountHolder || 'Primary Vault Member';
  const institution = statementProfile?.institution || 'Offline Financial Vault';

  return (
    <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 transition-colors">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-[1px] shadow-md shadow-emerald-500/10 cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-emerald-400 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 
              onClick={() => onNavigate('dashboard')}
              className="font-bold text-slate-900 dark:text-white text-base tracking-tight cursor-pointer hover:text-emerald-500 transition-colors flex items-center gap-1.5"
            >
              <span>Financial Vault</span>
              <span className="text-slate-400 dark:text-slate-600 font-normal">|</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">
                {accountHolder}
              </span>
            </h1>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {institution}
            </span>

            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              On-Device AES-256
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-2 mt-0.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{transactionCount} Transactions</span>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <span>{route.title}</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Load sample transactions to explore dashboard and budget features"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{isSeeding ? 'Loading Sample...' : (transactionCount === 0 ? 'Load Demo Data' : 'Add Sample Data')}</span>
          </button>
 
          {/* Quick Statement Ingest */}
          <button
            id="quick-ingest-btn"
            onClick={() => onNavigate('ingestion')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>Import Statement</span>
          </button>
 
          {/* Quick Add Manual Transaction */}
          <button
            id="add-tx-btn"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
 
          {/* Vault Lock Toggle */}
          <button
            id="vault-lock-btn"
            onClick={onToggleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Lock Vault"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Unlocked</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            <span>Vault Locked</span>
          </div>
        </div>
      )}
    </header>
  );
};


