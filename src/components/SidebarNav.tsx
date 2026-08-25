import React, { useMemo, useState } from 'react';
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
  Globe,
  Copy,
  Check,
  Activity
} from 'lucide-react';
import { VaultHealth, AIStatementProfile } from '../types';
import { getActiveStatementProfile } from '../utils/statementProfileManager';
import { ROUTES, getRouteByTab, DOMAIN_NAME, getFullDomainUrl } from '../utils/router';

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
  isDarkMode,
  statementProfile
}) => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const profile = useMemo(() => {
    return statementProfile || getActiveStatementProfile();
  }, [statementProfile]);

  const activeRoute = useMemo(() => {
    return getRouteByTab(activeTab);
  }, [activeTab]);

  const handleCopyCurrentUrl = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const url = getFullDomainUrl(tabId);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    setCopiedPath(tabId);
    setTimeout(() => setCopiedPath(null), 2500);
  };

  const theme = profile?.customUITheme || {
    dashboardTitle: "Zack's Doghouse",
    budgetTabLabel: "Food Bowl Budgets",
    subscriptionTabLabel: "Recurring Subscriptions",
    ledgerTabLabel: "Golden Ledger",
    personaBadge: "Personal Vault"
  };

  const menuItems: MenuItem[] = [
    { 
      id: 'dashboard', 
      label: theme.dashboardTitle || "Zack's Doghouse", 
      path: '/dashboard',
      icon: LayoutDashboard, 
      description: profile?.institution ? `${profile.institution} Overview` : 'Mascot mood & financial health',
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
      label: theme.budgetTabLabel || 'Household Budget', 
      path: '/householdbudget',
      icon: Target, 
      badge: 'Targets',
      description: 'Zero-based envelope spending plan',
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
      id: 'subscriptions', 
      label: theme.subscriptionTabLabel || 'Recurring Subscriptions', 
      path: '/subscriptions',
      icon: CalendarClock, 
      badge: profile?.detectedSubscriptions?.length ? `${profile.detectedSubscriptions.length} Found` : 'Auto-Audit',
      description: 'Monthly & annual fixed commitments',
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
      id: 'debt-payoff', 
      label: 'Bone Burier (Debt Payoff)', 
      path: '/debtpayoff',
      icon: Calculator, 
      badge: 'Calculators',
      description: 'Snowball & loan amortization',
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
      label: 'Fetch Bank Statements', 
      path: '/bank-statements',
      icon: UploadCloud, 
      badge: 'Vision AI',
      description: 'Chew on PDFs & auto-folders',
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
      id: 'ledger', 
      label: theme.ledgerTabLabel || 'Golden Ledger', 
      path: '/ledger',
      icon: Receipt, 
      badge: transactionCount > 0 ? `${transactionCount}` : null,
      description: 'Full treat history log',
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
      label: "Zack's Learned Tricks", 
      path: '/rules',
      icon: Wand2, 
      description: 'Auto-categorization commands',
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
      label: 'Guard Dog Vault Settings', 
      path: '/security',
      icon: HardDrive, 
      description: 'Lock, wipe, or backup vault',
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
      label: 'Security & Audit Runs', 
      path: '/security-audit',
      icon: Activity, 
      badge: 'Audit',
      description: 'Zero-cloud & integrity verification',
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
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-slate-950/95 text-slate-200 flex flex-col border-r border-slate-800/80 shrink-0 md:min-h-[calc(100vh-61px)] transition-colors">
      {/* Active Domain Bar */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 font-mono text-[11px] text-slate-300">
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400">{DOMAIN_NAME}</span>
          <span className="text-cyan-400 font-bold truncate">{activeRoute.canonicalPath}</span>
        </div>
        <button
          onClick={(e) => handleCopyCurrentUrl(e, activeTab)}
          className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors shrink-0 cursor-pointer"
          title={`Copy URL for ${activeRoute.canonicalPath}`}
        >
          {copiedPath === activeTab ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Vault Pages
          </p>
          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Multi-Page
          </span>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const { color } = item;
          const isCopied = copiedPath === item.id;

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
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {item.label}
                    </p>
                  </div>
                  <p className="text-[10px] font-mono text-cyan-400/80 truncate">
                    {item.path}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1.5">
                {item.badge && (
                  <span
                    className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white border-white/20 font-semibold'
                        : `${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                
                {/* Quick copy page URL */}
                <span
                  onClick={(e) => handleCopyCurrentUrl(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-cyan-300 p-1 rounded transition-opacity cursor-pointer text-slate-400"
                  title={`Copy ${DOMAIN_NAME}${item.path}`}
                >
                  {isCopied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </span>
              </div>
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
            <span className="text-slate-400 block text-[9.5px] font-medium">DOMAIN</span>
            <span className="text-cyan-400 font-semibold">Multi-Page</span>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>Domain Status</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {DOMAIN_NAME}
          </span>
        </div>
      </div>
    </aside>
  );
};



