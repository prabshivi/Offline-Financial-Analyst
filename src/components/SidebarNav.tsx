import React, { useMemo } from 'react';
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
  FolderSync,
  CalendarClock,
  Activity,
  BarChart3,
  FileSpreadsheet,
  Globe
} from 'lucide-react';
import { VaultHealth, AIStatementProfile } from '../types';
import { getActiveStatementProfile } from '../utils/statementProfileManager';
import { isPageEnabled, getAppDomain } from '../utils/envConfig';

interface SidebarNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  transactionCount: number;
  health: VaultHealth | null;
  isVaultLocked: boolean;
  isDarkMode?: boolean;
  statementProfile?: AIStatementProfile;
}

interface MenuItem {
  id: string;
  label: string;
  path: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
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
  isDarkMode,
  statementProfile
}) => {
  const profile = useMemo(() => {
    return statementProfile || getActiveStatementProfile();
  }, [statementProfile]);

  const domain = getAppDomain();

  const theme = profile?.customUITheme || {
    dashboardTitle: "Overview Dashboard",
    budgetTabLabel: "Monthly Target Budgets",
    subscriptionTabLabel: "Recurring Subscriptions",
    ledgerTabLabel: "Financial Ledger",
    personaBadge: "Personal Vault"
  };

  const allMenuItems: MenuItem[] = [
    { 
      id: 'dashboard', 
      label: 'Overview', 
      path: '/dashboard',
      icon: LayoutDashboard, 
      description: 'Cashflow, balances & insights',
      color: {
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconText: 'text-emerald-400',
        iconBorder: 'border-emerald-500/20',
        activeBg: 'bg-emerald-500/10 dark:bg-emerald-950/60',
        activeBorder: 'border-emerald-500/40',
        activeGlow: 'shadow-emerald-500/5',
        activeIconBg: 'bg-emerald-500 text-slate-950',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
        dotColor: 'bg-emerald-400'
      }
    },
    { 
      id: 'ledger', 
      label: 'Transactions', 
      path: '/ledger',
      icon: Receipt, 
      badge: transactionCount > 0 ? `${transactionCount}` : null,
      description: 'Searchable ledger & filters',
      color: {
        iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        iconText: 'text-cyan-400',
        iconBorder: 'border-cyan-500/20',
        activeBg: 'bg-cyan-500/10 dark:bg-cyan-950/60',
        activeBorder: 'border-cyan-500/40',
        activeGlow: 'shadow-cyan-500/5',
        activeIconBg: 'bg-cyan-500 text-slate-950',
        badgeBg: 'bg-cyan-500/15',
        badgeText: 'text-cyan-400',
        badgeBorder: 'border-cyan-500/30',
        dotColor: 'bg-cyan-400'
      }
    },
    { 
      id: 'ingestion', 
      label: 'Import Statements', 
      path: '/bank-statements',
      icon: UploadCloud, 
      badge: 'CSV / PDF',
      description: 'Upload statements & auto-dedup',
      color: {
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        iconText: 'text-indigo-400',
        iconBorder: 'border-indigo-500/20',
        activeBg: 'bg-indigo-500/10 dark:bg-indigo-950/60',
        activeBorder: 'border-indigo-500/40',
        activeGlow: 'shadow-indigo-500/5',
        activeIconBg: 'bg-indigo-500 text-white',
        badgeBg: 'bg-indigo-500/15',
        badgeText: 'text-indigo-400',
        badgeBorder: 'border-indigo-500/30',
        dotColor: 'bg-indigo-400'
      }
    },
    { 
      id: 'budget', 
      label: 'Budgets & Targets', 
      path: '/householdbudget',
      icon: Target, 
      badge: 'Targets',
      description: 'Monthly envelopes & limits',
      color: {
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconText: 'text-amber-400',
        iconBorder: 'border-amber-500/20',
        activeBg: 'bg-amber-500/10 dark:bg-amber-950/60',
        activeBorder: 'border-amber-500/40',
        activeGlow: 'shadow-amber-500/5',
        activeIconBg: 'bg-amber-500 text-slate-950',
        badgeBg: 'bg-amber-500/15',
        badgeText: 'text-amber-400',
        badgeBorder: 'border-amber-500/30',
        dotColor: 'bg-amber-400'
      }
    },
    { 
      id: 'subscriptions', 
      label: 'Subscriptions & Debt', 
      path: '/subscriptions',
      icon: CalendarClock, 
      badge: 'Recurring',
      description: 'Monthly bills & loan payoff',
      color: {
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        iconText: 'text-purple-400',
        iconBorder: 'border-purple-500/20',
        activeBg: 'bg-purple-500/10 dark:bg-purple-950/60',
        activeBorder: 'border-purple-500/40',
        activeGlow: 'shadow-purple-500/5',
        activeIconBg: 'bg-purple-500 text-white',
        badgeBg: 'bg-purple-500/15',
        badgeText: 'text-purple-400',
        badgeBorder: 'border-purple-500/30',
        dotColor: 'bg-purple-400'
      }
    },
    { 
      id: 'security', 
      label: 'Vault & Settings', 
      path: '/security',
      icon: ShieldCheck, 
      description: 'Encryption, backups & rules',
      color: {
        iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
        iconText: 'text-teal-400',
        iconBorder: 'border-teal-500/20',
        activeBg: 'bg-teal-500/10 dark:bg-teal-950/60',
        activeBorder: 'border-teal-500/40',
        activeGlow: 'shadow-teal-500/5',
        activeIconBg: 'bg-teal-500 text-slate-950',
        badgeBg: 'bg-teal-500/15',
        badgeText: 'text-teal-400',
        badgeBorder: 'border-teal-500/30',
        dotColor: 'bg-teal-400'
      }
    }
  ];

  const menuItems = allMenuItems;

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-slate-950/95 text-slate-200 flex flex-col border-r border-slate-800/80 shrink-0 md:min-h-[calc(100vh-61px)] transition-colors">
      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Vault Navigation
          </p>
          <span className="text-[10px] text-slate-500 font-mono">
            {menuItems.length} pages
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
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group cursor-pointer ${
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
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {item.label}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.badge && (
                <div className="flex items-center gap-1 shrink-0 ml-1.5">
                  <span
                    className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white border-white/20 font-semibold'
                        : `${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
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
            <p className="text-[10.5px] text-slate-400 truncate font-mono">{domain}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[10.5px]">
          <div className="bg-slate-950/80 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-400 block text-[9.5px] font-medium">PROTECTION</span>
            <span className="text-emerald-400 font-semibold">100% Secure</span>
          </div>
          <div className="bg-slate-950/80 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-400 block text-[9.5px] font-medium">ENCRYPTION</span>
            <span className="text-cyan-400 font-semibold">AES-GCM-256</span>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>Vault Mode</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Offline & Private
          </span>
        </div>
      </div>
    </aside>
  );
};
