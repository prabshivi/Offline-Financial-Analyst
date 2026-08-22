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
  Bot
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
      label: 'Overview & Insights', 
      icon: LayoutDashboard, 
      description: 'Cash flow, metrics & charts' 
    },
    { 
      id: 'budget', 
      label: 'Monthly Budgets', 
      icon: Target, 
      badge: 'Interactive',
      description: 'Category spending targets' 
    },
    { 
      id: 'ingestion', 
      label: 'Import Statements', 
      icon: UploadCloud, 
      badge: 'Smart Parser',
      description: 'CSV, PDF & Bank cards' 
    },
    { 
      id: 'auto-fetch', 
      label: 'PDF Automation', 
      icon: Bot, 
      badge: 'Auto-Sync',
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
      label: 'Backup & Security', 
      icon: ShieldCheck, 
      description: 'Export DB, lock PIN & health' 
    },
    { 
      id: 'nightly', 
      label: 'Nightly Runs & Tests', 
      icon: Sparkles, 
      badge: 'All Pass',
      description: 'Automated CI & regression suite' 
    },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 shrink-0 md:min-h-[calc(100vh-65px)] transition-colors">
      {/* Navigation Links */}
      <nav className="p-3.5 space-y-1.5 flex-1">
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/40 dark:border-emerald-800/50">
            Ready
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
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all group ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-800 text-white font-semibold shadow-sm border border-transparent dark:border-slate-700/60'
                  : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isActive ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {item.label}
                  </p>
                  <p className={`text-[10px] truncate ${isActive ? 'text-slate-300 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {item.description}
                  </p>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 font-mono ${
                    isActive
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Helpful Quick Tip Card */}
      <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100/80 dark:border-emerald-900/40 text-xs space-y-2">
        <div className="flex items-center justify-between text-emerald-950 dark:text-emerald-200">
          <span className="font-bold flex items-center gap-1.5 text-xs text-emerald-900 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Quick Tip
          </span>
          <span className="text-[10px] bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
            Private
          </span>
        </div>
        <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
          Import your bank statements anytime. All numbers and records remain strictly on your device.
        </p>
      </div>
    </aside>
  );
};
