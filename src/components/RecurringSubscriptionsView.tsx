import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  Calendar, 
  CalendarClock, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  CheckCircle2, 
  ArrowUpRight, 
  ChevronRight, 
  Scissors, 
  Download, 
  Zap, 
  Info, 
  Trash2, 
  Eye, 
  Sparkles, 
  Clock, 
  ShieldAlert, 
  PieChart as PieChartIcon, 
  Check, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { Transaction, RecurringSubscription, SubscriptionCadence, SubscriptionStatus, AIStatementProfile } from '../types';
import { detectRecurringSubscriptions, calculateDaysUntil } from '../utils/subscriptionDetector';
import { getActiveStatementProfile } from '../utils/statementProfileManager';

interface RecurringSubscriptionsViewProps {
  transactions: Transaction[];
  isDarkMode?: boolean;
  statementProfile?: AIStatementProfile;
  onNavigate: (tab: string) => void;
  onOpenDetailModal?: (tx: Transaction) => void;
}

export const RecurringSubscriptionsView: React.FC<RecurringSubscriptionsViewProps> = ({
  transactions,
  isDarkMode = true,
  statementProfile,
  onNavigate,
  onOpenDetailModal
}) => {
  const profile = useMemo(() => {
    return statementProfile || getActiveStatementProfile();
  }, [statementProfile]);

  const [manualSubs, setManualSubs] = useState<Partial<RecurringSubscription>[]>(() => {
    try {
      const saved = localStorage.getItem('vault_manual_subscriptions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // What-If Trimmer Simulation (Set of subscription IDs selected for potential cancellation)
  const [selectedForCancellation, setSelectedForCancellation] = useState<Set<string>>(new Set());

  // Occurrence Inspection Modal
  const [inspectingSub, setInspectingSub] = useState<RecurringSubscription | null>(null);

  // Manual Add Subscription Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubForm, setNewSubForm] = useState({
    merchant: '',
    category: 'Entertainment & Subscriptions',
    institution: 'Chase Sapphire',
    lastAmount: '',
    cadence: 'monthly' as SubscriptionCadence,
    lastChargedDate: new Date().toISOString().split('T')[0],
    nextDueDate: ''
  });

  // Run the smart pattern detection algorithm
  const { subscriptions: detectedSubs, summary } = useMemo(() => {
    return detectRecurringSubscriptions(transactions, manualSubs, new Date());
  }, [transactions, manualSubs]);

  // Filtered subscriptions based on UI controls
  const filteredSubscriptions = useMemo(() => {
    return detectedSubs.filter((sub) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMerchant = sub.merchant.toLowerCase().includes(q);
        const matchesDesc = sub.rawDescription.toLowerCase().includes(q);
        const matchesCat = sub.category.toLowerCase().includes(q);
        const matchesInst = sub.institution.toLowerCase().includes(q);
        if (!matchesMerchant && !matchesDesc && !matchesCat && !matchesInst) return false;
      }

      // Cadence
      if (cadenceFilter !== 'all' && sub.cadence !== cadenceFilter) {
        return false;
      }

      // Status
      if (statusFilter === 'upcoming' && sub.status !== 'upcoming_soon') return false;
      if (statusFilter === 'price_hike' && !sub.hasPriceHike) return false;
      if (statusFilter === 'annual' && sub.cadence !== 'annual') return false;

      // Category
      if (categoryFilter !== 'all' && sub.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [detectedSubs, searchQuery, cadenceFilter, statusFilter, categoryFilter]);

  // Unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const s of detectedSubs) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set);
  }, [detectedSubs]);

  // Savings Trimmer calculations
  const trimmerSavings = useMemo(() => {
    let monthlySaved = 0;
    let annualSaved = 0;
    let count = 0;

    for (const sub of detectedSubs) {
      if (selectedForCancellation.has(sub.id)) {
        monthlySaved += sub.monthlyCost;
        annualSaved += sub.annualCost;
        count++;
      }
    }

    return {
      monthlySaved: Math.round(monthlySaved * 100) / 100,
      annualSaved: Math.round(annualSaved * 100) / 100,
      count
    };
  }, [detectedSubs, selectedForCancellation]);

  const toggleCancelSelect = (id: string) => {
    setSelectedForCancellation((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddManualSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubForm.merchant.trim() || !newSubForm.lastAmount) return;

    const amt = parseFloat(newSubForm.lastAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newSub: Partial<RecurringSubscription> = {
      id: `manual-${Date.now()}`,
      merchant: newSubForm.merchant.trim(),
      category: newSubForm.category,
      institution: newSubForm.institution,
      lastAmount: amt,
      cadence: newSubForm.cadence,
      lastChargedDate: newSubForm.lastChargedDate || new Date().toISOString().split('T')[0],
      nextDueDate: newSubForm.nextDueDate || undefined,
      isManual: true
    };

    const updated = [...manualSubs, newSub];
    setManualSubs(updated);
    localStorage.setItem('vault_manual_subscriptions', JSON.stringify(updated));

    setIsAddModalOpen(false);
    setNewSubForm({
      merchant: '',
      category: 'Entertainment & Subscriptions',
      institution: 'Chase Sapphire',
      lastAmount: '',
      cadence: 'monthly',
      lastChargedDate: new Date().toISOString().split('T')[0],
      nextDueDate: ''
    });
  };

  const handleDeleteManualSub = (id: string) => {
    const updated = manualSubs.filter((m) => m.id !== id);
    setManualSubs(updated);
    localStorage.setItem('vault_manual_subscriptions', JSON.stringify(updated));
  };

  const handleExportCSV = () => {
    if (detectedSubs.length === 0) return;
    const headers = ['Merchant', 'Category', 'Institution', 'Cadence', 'Last Amount', 'Monthly Cost', 'Annual Cost', 'Last Paid Date', 'Next Due Date', 'Days Until Due', 'Status', 'Confidence %'];
    const rows = detectedSubs.map(s => [
      `"${s.merchant}"`,
      `"${s.category}"`,
      `"${s.institution}"`,
      `"${s.cadence}"`,
      s.lastAmount.toFixed(2),
      s.monthlyCost.toFixed(2),
      s.annualCost.toFixed(2),
      s.lastChargedDate,
      s.nextDueDate,
      s.daysUntilDue,
      `"${s.status}"`,
      `${s.confidenceScore}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `recurring_subscriptions_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const getStatusBadge = (sub: RecurringSubscription) => {
    if (sub.hasPriceHike) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
          <TrendingUp className="w-3 h-3" />
          Price Increased (+{formatCurrency(sub.priceDifference || 0)})
        </span>
      );
    }
    if (sub.daysUntilDue >= 0 && sub.daysUntilDue <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
          <Clock className="w-3 h-3" />
          Due in {sub.daysUntilDue === 0 ? 'Today' : `${sub.daysUntilDue} day${sub.daysUntilDue === 1 ? '' : 's'}`}
        </span>
      );
    }
    if (sub.cadence === 'annual' && sub.daysUntilDue <= 30 && sub.daysUntilDue >= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          <CalendarClock className="w-3 h-3" />
          Annual Renewal ({sub.daysUntilDue}d)
        </span>
      );
    }
    if (sub.daysUntilDue < 0 && sub.daysUntilDue >= -14) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3 h-3" />
          Scheduled / Recent ({Math.abs(sub.daysUntilDue)}d ago)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/15 text-slate-400 border border-slate-500/20">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        Active ({sub.daysUntilDue > 0 ? `in ${sub.daysUntilDue}d` : 'Current'})
      </span>
    );
  };

  const getCadenceLabel = (cadence: SubscriptionCadence) => {
    switch (cadence) {
      case 'monthly': return 'Monthly';
      case 'annual': return 'Annual';
      case 'weekly': return 'Weekly';
      case 'bi_weekly': return 'Bi-Weekly';
      case 'quarterly': return 'Quarterly';
      case 'semi_annual': return 'Semi-Annual';
      default: return 'Recurring';
    }
  };

  const theme = profile?.customUITheme || {
    subscriptionTabLabel: "Recurring Subscriptions",
    recurringMetricLabel: "Monthly Fixed Drain"
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header with AI Statement Profile context */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  {theme.subscriptionTabLabel} & Fixed Charges
                </h2>
                {profile?.detectedPersona && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    {profile.detectedPersona}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated pattern recognition sniffing out upcoming monthly & annual fixed charges &bull; {profile?.institution || 'Offline Vault'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Track Custom Bill</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all"
            title="Download full recurring subscriptions breakdown as CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit</span>
          </button>
        </div>
      </div>

      {/* AI Statement Detected Subscriptions Banner (Extracted from PDF) */}
      {profile?.detectedSubscriptions && profile.detectedSubscriptions.length > 0 && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Extracted from Statement PDF: {profile.detectedSubscriptions.length} Subscriptions Identified</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Statement: {profile.institution} &bull; {profile.statementPeriod?.label || 'Current'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.detectedSubscriptions.map((sub, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white truncate max-w-[160px]">{sub.merchant}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {sub.cadence}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-extrabold font-mono text-cyan-400">{formatCurrency(sub.amount)}</span>
                  <span className="text-[11px] text-slate-400">{sub.category}</span>
                </div>
                {sub.cancellationTip && (
                  <p className="text-[10px] text-slate-300 bg-slate-900/90 p-2 rounded-xl border border-slate-800/80 leading-relaxed">
                    💡 <span className="font-semibold text-cyan-300">Tip:</span> {sub.cancellationTip}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Committed Spend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Monthly Fixed Drain
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {formatCurrency(summary.totalMonthlyCommitment)}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/mo</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-1">
              <span>{summary.activeCount} active recurring services</span>
            </p>
          </div>
        </div>

        {/* Annualized Commitment */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Annual Run-Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {formatCurrency(summary.totalAnnualCommitment)}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/yr</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-1">
              <span>~{formatCurrency(summary.totalAnnualCommitment / 365)} per day committed</span>
            </p>
          </div>
        </div>

        {/* Due in Next 7 Days */}
        <div className={`p-5 rounded-2xl border shadow-xs transition-all group ${
          summary.upcomingCount7Days > 0 
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
            : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/90'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Due In Next 7 Days
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              summary.upcomingCount7Days > 0 
                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-extrabold font-mono tracking-tight ${
              summary.upcomingCount7Days > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            }`}>
              {formatCurrency(summary.upcomingAmount7Days)}
            </p>
            <p className={`text-[11px] font-semibold mt-1 ${
              summary.upcomingCount7Days > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {summary.upcomingCount7Days > 0 ? `${summary.upcomingCount7Days} charges hitting soon` : 'No charges due this week'}
            </p>
          </div>
        </div>

        {/* Price Increase & Annual Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Price Changes Detected
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              summary.priceHikesCount > 0 
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {summary.priceHikesCount}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">alerts</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-1">
              <span>{summary.priceHikesCount > 0 ? 'Subscription price hikes flagged' : 'All rates stable'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Interactive "Snip & Save" Trimmer / Cancellation Simulator */}
      <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/30 p-5 sm:p-6 rounded-3xl text-white shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-teal-200 flex items-center gap-2">
                "Snip & Save" Subscription Trimmer
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Interactive Simulator
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Click the checkbox on any subscription below to calculate instant monthly & annual savings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-teal-500/20 self-start sm:self-auto">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Simulated Monthly Savings</div>
              <div className="text-lg font-extrabold font-mono text-teal-300">
                +{formatCurrency(trimmerSavings.monthlySaved)}
                <span className="text-xs text-slate-400 font-normal"> /mo</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Annual Boost</div>
              <div className="text-lg font-extrabold font-mono text-emerald-400">
                +{formatCurrency(trimmerSavings.annualSaved)}
                <span className="text-xs text-slate-400 font-normal"> /yr</span>
              </div>
            </div>
            {trimmerSavings.count > 0 && (
              <button
                onClick={() => setSelectedForCancellation(new Set())}
                className="text-[11px] text-slate-400 hover:text-white underline ml-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Renewals Timeline Rail */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-cyan-500" /> Upcoming Renewal Horizon
          </h3>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Next scheduled cycle charges
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {detectedSubs.slice(0, 8).map((sub) => {
            const isDueSoon = sub.daysUntilDue >= 0 && sub.daysUntilDue <= 7;
            const isAnnual = sub.cadence === 'annual';
            return (
              <div
                key={sub.id}
                onClick={() => setInspectingSub(sub)}
                className={`min-w-[190px] p-3 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between space-y-2 shrink-0 ${
                  isDueSoon
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60 shadow-xs'
                    : isAnnual
                    ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                    {sub.merchant}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    {getCadenceLabel(sub.cadence)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(sub.lastAmount)}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    isDueSoon ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {sub.daysUntilDue === 0 ? 'Today' : sub.daysUntilDue > 0 ? `In ${sub.daysUntilDue}d` : `${Math.abs(sub.daysUntilDue)}d ago`}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  Due: {sub.nextDueDate}
                </div>
              </div>
            );
          })}

          {detectedSubs.length === 0 && (
            <div className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center w-full">
              No active subscription patterns detected yet. Import statements or add custom subscriptions.
            </div>
          )}
        </div>
      </div>

      {/* Main Filter & View Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscriptions, merchants, or cards..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cadence */}
          <select
            value={cadenceFilter}
            onChange={(e) => setCadenceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none font-medium"
          >
            <option value="all">All Cadences</option>
            <option value="monthly">Monthly Only</option>
            <option value="annual">Annual Only</option>
            <option value="weekly">Weekly</option>
            <option value="bi_weekly">Bi-Weekly</option>
            <option value="quarterly">Quarterly</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Due in 7 Days</option>
            <option value="price_hike">Price Increased</option>
            <option value="annual">Annual Renewals</option>
          </select>

          {/* Category */}
          {uniqueCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none font-medium"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 ml-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Grid View of Subscriptions */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubscriptions.map((sub) => {
            const isCancelling = selectedForCancellation.has(sub.id);
            return (
              <div
                key={sub.id}
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all relative flex flex-col justify-between space-y-4 ${
                  isCancelling
                    ? 'border-teal-500/80 bg-teal-50/20 dark:bg-teal-950/20 shadow-md ring-2 ring-teal-500/20'
                    : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                {/* Card Top */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                        style={{ backgroundColor: sub.color || '#0284C7' }}
                      >
                        {sub.merchant.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[160px]">
                          {sub.merchant}
                        </h4>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          {sub.category}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox for What-If Trimmer */}
                    <button
                      onClick={() => toggleCancelSelect(sub.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all ${
                        isCancelling
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title="Toggle in 'Snip & Save' Trimmer"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>{isCancelling ? 'Trimming' : 'Trim?'}</span>
                    </button>
                  </div>

                  {/* Status Banner */}
                  <div className="pt-1">
                    {getStatusBadge(sub)}
                  </div>
                </div>

                {/* Pricing & Cadence Metric Section */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">Amount:</span>
                      <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(sub.lastAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Frequency:</span>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {getCadenceLabel(sub.cadence)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span>Monthly impact:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(sub.monthlyCost)}/mo</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    <span>Annual run-rate:</span>
                    <span>{formatCurrency(sub.annualCost)}/yr</span>
                  </div>
                </div>

                {/* Card Footer: Next Due & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Next Charge</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                      {sub.nextDueDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {sub.isManual && (
                      <button
                        onClick={() => handleDeleteManualSub(sub.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Delete custom subscription"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setInspectingSub(sub)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Audit Trail</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View of Subscriptions */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Trim?</th>
                  <th className="py-3 px-4">Merchant / Service</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4 text-right">Last Charge</th>
                  <th className="py-3 px-4 text-right">Monthly Equiv.</th>
                  <th className="py-3 px-4 text-right">Next Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredSubscriptions.map((sub) => {
                  const isCancelling = selectedForCancellation.has(sub.id);
                  return (
                    <tr 
                      key={sub.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isCancelling ? 'bg-teal-50/30 dark:bg-teal-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isCancelling}
                          onChange={() => toggleCancelSelect(sub.id)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color || '#0284C7' }}
                        />
                        <span>{sub.merchant}</span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                          {getCadenceLabel(sub.cadence)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{sub.category}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{sub.institution}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(sub.lastAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(sub.monthlyCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {sub.nextDueDate}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(sub)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setInspectingSub(sub)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Historical Charges"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredSubscriptions.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">No matching subscriptions found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Try adjusting your search query, filter criteria, or add a custom recurring fixed charge.
          </p>
        </div>
      )}

      {/* Subscription Occurrence Detail & Audit Trail Modal */}
      {inspectingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: inspectingSub.color || '#0284C7' }}
                >
                  {inspectingSub.merchant.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {inspectingSub.merchant}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    Pattern: {inspectingSub.detectionReason}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingSub(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Pattern Metrics */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Cadence Cycle</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{getCadenceLabel(inspectingSub.cadence)}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Confidence Score</span>
                <p className="font-bold text-emerald-500 mt-0.5">{inspectingSub.confidenceScore}% Signature Match</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Next Projected Due</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{inspectingSub.nextDueDate}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Annual Committed</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(inspectingSub.annualCost)}</p>
              </div>
            </div>

            {/* Historical Occurrence List */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Historical Payment Trail ({inspectingSub.occurrences.length} occurrences)
              </h4>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                {inspectingSub.occurrences.map((occ, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div>
                      <p className="font-mono text-slate-500 dark:text-slate-400">{occ.date}</p>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[240px]">{occ.raw_description}</p>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                      -{formatCurrency(occ.amount)}
                    </div>
                  </div>
                ))}
                {inspectingSub.occurrences.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Manually logged subscription (no transaction history linked).
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs hover:bg-slate-800"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Subscription Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-500" /> Track Custom Recurring Bill
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddManualSub} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Service / Provider Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HBO Max, Local Gym, Car Insurance"
                  value={newSubForm.merchant}
                  onChange={(e) => setNewSubForm({ ...newSubForm, merchant: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Charge Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="15.99"
                    value={newSubForm.lastAmount}
                    onChange={(e) => setNewSubForm({ ...newSubForm, lastAmount: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Frequency / Cadence
                  </label>
                  <select
                    value={newSubForm.cadence}
                    onChange={(e) => setNewSubForm({ ...newSubForm, cadence: e.target.value as SubscriptionCadence })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual (Yearly)</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={newSubForm.category}
                    onChange={(e) => setNewSubForm({ ...newSubForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="Entertainment & Subscriptions">Entertainment & Subscriptions</option>
                    <option value="Software & Technology">Software & Technology</option>
                    <option value="Utilities & Bills">Utilities & Bills</option>
                    <option value="Fitness & Wellness">Fitness & Wellness</option>
                    <option value="Insurance & Protection">Insurance & Protection</option>
                    <option value="Rent & Housing">Rent & Housing</option>
                    <option value="Shopping">Shopping & Memberships</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Institution / Card
                  </label>
                  <input
                    type="text"
                    value={newSubForm.institution}
                    onChange={(e) => setNewSubForm({ ...newSubForm, institution: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Last Charge Date
                  </label>
                  <input
                    type="date"
                    value={newSubForm.lastChargedDate}
                    onChange={(e) => setNewSubForm({ ...newSubForm, lastChargedDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Next Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newSubForm.nextDueDate}
                    onChange={(e) => setNewSubForm({ ...newSubForm, nextDueDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-xs"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
