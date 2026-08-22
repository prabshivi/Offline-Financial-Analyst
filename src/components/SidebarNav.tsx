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
  CheckCircle2,
  HardDrive,
  Compass,
  FolderSync
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

interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  // Color theme definitions
  color: {
    iconBg: string;
    iconText: string;
    iconBorder: string;
    activeBg: string;
    activeBorder: string;
    activeGlow: string;
    activeIconBg: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
  };
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onSelectTab,
  transactionCount,
  health,
  isVaultLocked,
  isDarkMode
}) => {
  const menuItems: MenuItem[] = [
    { 
      id: 'dashboard', 
      label: 'Overview', 
      icon: LayoutDashboard, 
      description: 'Cash flow & spending summary',
      color: {
        iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 group-hover:bg-cyan-500/20',
        iconText: 'text-cyan-400',
        iconBorder: 'border-cyan-500/20',
        activeBg: 'bg-gradient-to-r from-cyan-950/70 to-slate-900',
        activeBorder: 'border-cyan-500/50',
        activeGlow: 'shadow-cyan-500/10',
        activeIconBg: 'bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950',
        badgeBg: 'bg-cyan-500/15',
        badgeText: 'text-cyan-300',
        badgeBorder: 'border-cyan-500/30',
        dotColor: 'bg-cyan-400'
      }
    },
    { 
      id: 'budget', 
      label: 'Budgets', 
      icon: Target, 
      badge: 'Targets',
      description: 'Spending limits by category',
      color: {
        iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20',
        iconText: 'text-emerald-400',
        iconBorder: 'border-emerald-500/20',
        activeBg: 'bg-gradient-to-r from-emerald-950/70 to-slate-900',
        activeBorder: 'border-emerald-500/50',
        activeGlow: 'shadow-emerald-500/10',
        activeIconBg: 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-300',
        badgeBorder: 'border-emerald-500/30',
        dotColor: 'bg-emerald-400'
      }
    },
    { 
      id: 'debt-payoff', 
      label: 'Payoff & Loans', 
      icon: Calculator, 
      badge: 'Calculators',
      description: 'Mortgage & debt payoff plans',
      color: {
        iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20',
        iconText: 'text-amber-400',
        iconBorder: 'border-amber-500/20',
        activeBg: 'bg-gradient-to-r from-amber-950/70 to-slate-900',
        activeBorder: 'border-amber-500/50',
        activeGlow: 'shadow-amber-500/10',
        activeIconBg: 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950',
        badgeBg: 'bg-amber-500/15',
        badgeText: 'text-amber-300',
        badgeBorder: 'border-amber-500/30',
        dotColor: 'bg-amber-400'
      }
    },
    { 
      id: 'ingestion', 
      label: 'Import Statements', 
      icon: UploadCloud, 
      badge: 'PDF & CSV',
      description: 'Bank & credit card files',
      color: {
        iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-500/20',
        iconText: 'text-indigo-400',
        iconBorder: 'border-indigo-500/20',
        activeBg: 'bg-gradient-to-r from-indigo-950/70 to-slate-900',
        activeBorder: 'border-indigo-500/50',
        activeGlow: 'shadow-indigo-500/10',
        activeIconBg: 'bg-gradient-to-tr from-indigo-500 to-purple-400 text-slate-950',
        badgeBg: 'bg-indigo-500/15',
        badgeText: 'text-indigo-300',
        badgeBorder: 'border-indigo-500/30',
        dotColor: 'bg-indigo-400'
      }
    },
    { 
      id: 'auto-fetch', 
      label: 'Auto-Import', 
      icon: FolderSync, 
      badge: 'Automatic',
      description: 'Drop folder & scheduled sync',
      color: {
        iconBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20 group-hover:bg-violet-500/20',
        iconText: 'text-violet-400',
        iconBorder: 'border-violet-500/20',
        activeBg: 'bg-gradient-to-r from-violet-950/70 to-slate-900',
        activeBorder: 'border-violet-500/50',
        activeGlow: 'shadow-violet-500/10',
        activeIconBg: 'bg-gradient-to-tr from-violet-500 to-fuchsia-400 text-slate-950',
        badgeBg: 'bg-violet-500/15',
        badgeText: 'text-violet-300',
        badgeBorder: 'border-violet-500/30',
        dotColor: 'bg-violet-400'
      }
    },
    { 
      id: 'ledger', 
      label: 'Transactions', 
      icon: Receipt, 
      badge: transactionCount > 0 ? `${transactionCount}` : null,
      description: 'All spending & income history',
      color: {
        iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20 group-hover:bg-sky-500/20',
        iconText: 'text-sky-400',
        iconBorder: 'border-sky-500/20',
        activeBg: 'bg-gradient-to-r from-sky-950/70 to-slate-900',
        activeBorder: 'border-sky-500/50',
        activeGlow: 'shadow-sky-500/10',
        activeIconBg: 'bg-gradient-to-tr from-sky-500 to-blue-400 text-slate-950',
        badgeBg: 'bg-sky-500/15',
        badgeText: 'text-sky-300',
        badgeBorder: 'border-sky-500/30',
        dotColor: 'bg-sky-400'
      }
    },
    { 
      id: 'rules', 
      label: 'Categories & Rules', 
      icon: Wand2, 
      description: 'Smart auto-tagging rules',
      color: {
        iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/20',
        iconText: 'text-rose-400',
        iconBorder: 'border-rose-500/20',
        activeBg: 'bg-gradient-to-r from-rose-950/70 to-slate-900',
        activeBorder: 'border-rose-500/50',
        activeGlow: 'shadow-rose-500/10',
        activeIconBg: 'bg-gradient-to-tr from-rose-500 to-pink-400 text-slate-950',
        badgeBg: 'bg-rose-500/15',
        badgeText: 'text-rose-300',
        badgeBorder: 'border-rose-500/30',
        dotColor: 'bg-rose-400'
      }
    },
    { 
      id: 'security', 
      label: 'Backup & Vault', 
      icon: HardDrive, 
      description: 'Private backup & exports',
      color: {
        iconBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20 group-hover:bg-teal-500/20',
        iconText: 'text-teal-400',
        iconBorder: 'border-teal-500/20',
        activeBg: 'bg-gradient-to-r from-teal-950/70 to-slate-900',
        activeBorder: 'border-teal-500/50',
        activeGlow: 'shadow-teal-500/10',
        activeIconBg: 'bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950',
        badgeBg: 'bg-teal-500/15',
        badgeText: 'text-teal-300',
        badgeBorder: 'border-teal-500/30',
        dotColor: 'bg-teal-400'
      }
    },
    { 
      id: 'nightly', 
      label: 'Security Health', 
      icon: ShieldCheck, 
      badge: 'Private',
      description: 'Privacy & security checks',
      color: {
        iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20',
        iconText: 'text-emerald-400',
        iconBorder: 'border-emerald-500/20',
        activeBg: 'bg-gradient-to-r from-emerald-950/70 to-slate-900',
        activeBorder: 'border-emerald-500/50',
        activeGlow: 'shadow-emerald-500/10',
        activeIconBg: 'bg-gradient-to-tr from-emerald-500 to-cyan-400 text-slate-950',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-300',
        badgeBorder: 'border-emerald-500/30',
        dotColor: 'bg-emerald-400'
      }
    },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-slate-950/95 text-slate-200 flex flex-col border-r border-slate-800/80 shrink-0 md:min-h-[calc(100vh-61px)] transition-colors">
      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Menu
          </p>
          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Private Vault
          </span>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const { color } = item;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? `${color.activeBg} text-white font-semibold border ${color.activeBorder} shadow-sm ${color.activeGlow}`
                  : 'hover:bg-slate-900/70 text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Color-Coded Icon Box */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                  isActive 
                    ? `${color.activeIconBg} border-transparent shadow-xs font-bold` 
                    : `${color.iconBg} ${color.iconBorder}`
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                    {item.label}
                  </p>
                  <p className={`text-[10.5px] truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {item.description}
                  </p>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-1.5 border transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white border-white/20 font-semibold'
                      : `${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Clean On-Device Privacy & Protection Card */}
      <div className="p-3.5 m-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 space-y-2.5 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-xs shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-slate-950" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-xs truncate">Private Storage</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <p className="text-[10.5px] text-slate-400 truncate">100% On-Device Data</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[10.5px]">
          <div className="bg-slate-950/80 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-400 block text-[9.5px] font-medium">PROTECTION</span>
            <span className="text-emerald-400 font-semibold">100% Secure</span>
          </div>
          <div className="bg-slate-950/80 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-400 block text-[9.5px] font-medium">STORAGE</span>
            <span className="text-cyan-400 font-semibold">Offline Only</span>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>Local Vault Status</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Ready & Safe
          </span>
        </div>
      </div>
    </aside>
  );
};


