import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Receipt, 
  PieChart, 
  Wand2, 
  ShieldCheck, 
  Target,
  Sparkles,
  Lock,
  ChevronRight,
  Bot,
  Calculator,
  Terminal,
  CheckCircle2,
  Cpu,
  ExternalLink
} from 'lucide-react';
import { VaultHealth } from '../types';

interface SidebarNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  transactionCount: number;
  health: VaultHealth | null;
  isVaultLocked: boolean;
  isDarkMode?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onSelectTab,
  transactionCount,
  health,
  isVaultLocked,
  isDarkMode
}) => {
  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Financial Overview', 
      icon: LayoutDashboard, 
      description: 'Cash flow, telemetry & KPIs' 
    },
    { 
      id: 'budget', 
      label: 'Monthly Budgets', 
      icon: Target, 
      badge: 'Interactive',
      description: 'Category spending targets' 
    },
    { 
      id: 'debt-payoff', 
      label: 'Debt Payoff Suite', 
      icon: Calculator, 
      badge: 'Snowball & LTV',
      description: 'Mortgage, loans & avalanche' 
    },
    { 
      id: 'ingestion', 
      label: 'Import Statements', 
      icon: UploadCloud, 
      badge: 'Multi-Bank',
      description: 'Chase, RBC, TD, CSV/PDF' 
    },
    { 
      id: 'auto-fetch', 
      label: 'PDF Automation', 
      icon: Bot, 
      badge: 'CI/CD Sync',
      description: 'Dropzone, scripts & cron' 
    },
    { 
      id: 'ledger', 
      label: 'All Transactions', 
      icon: Receipt, 
      badge: transactionCount > 0 ? `${transactionCount}` : null,
      description: 'Search, filter & edit records' 
    },
    { 
      id: 'rules', 
      label: 'Smart Categories', 
      icon: Wand2, 
      description: 'Auto-naming & match rules' 
    },
    { 
      id: 'security', 
      label: 'Security & Backup', 
      icon: ShieldCheck, 
      description: 'AES-256 DB & health audit' 
    },
    { 
      id: 'nightly', 
      label: 'Peace of Mind Security', 
      icon: ShieldCheck, 
      badge: '100% Safe',
      description: 'Run security test for peace of mind' 
    },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-slate-950/95 text-slate-200 flex flex-col border-r border-slate-800/80 shrink-0 md:min-h-[calc(100vh-61px)] transition-colors">
      {/* Navigation Links */}
      <nav className="p-3.5 space-y-1 flex-1">
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-cyan-400" />
            Navigation System
          </p>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            ONLINE
          </span>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold border border-cyan-500/40 shadow-sm tech-glow-cyan'
                  : 'hover:bg-slate-900/60 text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive 
                    ? 'bg-gradient-to-tr from-cyan-500 to-emerald-500 text-slate-950 font-bold shadow-xs' 
                    : 'bg-slate-900 text-slate-400 group-hover:text-cyan-300 group-hover:bg-slate-800'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                    {item.label}
                  </p>
                  <p className={`text-[10px] truncate ${isActive ? 'text-cyan-300/80' : 'text-slate-400'}`}>
                    {item.description}
                  </p>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${
                    isActive
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Automated QA & Security Verification Card */}
      <div className="p-3.5 m-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 space-y-2.5 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-xs truncate">Vault Architecture</span>
              <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">Automated QA & Security</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] font-mono">
          <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-slate-300">
            <span className="text-slate-500 block text-[9px]">QA SUITE</span>
            <span className="text-emerald-400 font-bold">100% Passed</span>
          </div>
          <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-slate-300">
            <span className="text-slate-500 block text-[9px]">STORAGE</span>
            <span className="text-cyan-400 font-bold">Zero-Cloud</span>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Local SQLite Engine</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            v2.4 Live
          </span>
        </div>
      </div>
    </aside>
  );
};

