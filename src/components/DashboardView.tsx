import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Sparkles, 
  Receipt, 
  ChevronRight, 
  Target,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  CreditCard
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Transaction, VaultStats } from '../types';
import { STANDARD_CATEGORIES, getCategoryColor } from '../utils/categorizer';
import { calculateZackFinancialMood } from '../utils/zackMoodEngine';

interface DashboardViewProps {
  transactions: Transaction[];
  stats: VaultStats | null;
  isDarkMode?: boolean;
  onNavigate: (tab: string) => void;
  onOpenAddModal: () => void;
  onSeedSampleData: () => void;
  onOpenDetailModal: (tx: Transaction) => void;
}

type PeriodType = 'all' | '30d' | 'this_month' | '90d' | 'ytd';

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  stats,
  isDarkMode = true,
  onNavigate,
  onOpenAddModal,
  onSeedSampleData,
  onOpenDetailModal
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('all');
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  // Compute Zack's dynamic financial mood for the dashboard
  const zackState = useMemo(() => {
    return calculateZackFinancialMood(transactions, stats);
  }, [transactions, stats]);

  // Compute date-filtered transactions for interactive period switcher
  const filteredTransactions = useMemo(() => {
    if (selectedPeriod === 'all') return transactions;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return transactions.filter((t) => {
      const txDate = new Date(t.date);
      if (isNaN(txDate.getTime())) return true;

      if (selectedPeriod === '30d') {
        const diffDays = (today.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      if (selectedPeriod === 'this_month') {
        return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
      }
      if (selectedPeriod === '90d') {
        const diffDays = (today.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 90;
      }
      if (selectedPeriod === 'ytd') {
        return txDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, selectedPeriod]);

  // Period-specific dynamic stats
  const metrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    const catMap = new Map<string, number>();
    const monthMap = new Map<string, { inflow: number; outflow: number }>();
    const merchantMap = new Map<string, { amount: number; count: number; category: string }>();

    for (const t of filteredTransactions) {
      const amt = Number(t.amount);
      const isInf = amt > 0 || t.type === 'inflow';

      if (isInf) {
        totalInflow += Math.abs(amt);
      } else {
        totalOutflow += Math.abs(amt);
        const cat = t.category || 'Miscellaneous';
        catMap.set(cat, (catMap.get(cat) || 0) + Math.abs(amt));

        // Merchant grouping
        const merch = t.clean_merchant || t.raw_description || 'Unknown';
        const existing = merchantMap.get(merch) || { amount: 0, count: 0, category: cat };
        existing.amount += Math.abs(amt);
        existing.count += 1;
        merchantMap.set(merch, existing);
      }

      // Monthly Trend grouping
      const monthKey = t.date ? t.date.substring(0, 7) : '2026-08';
      const mData = monthMap.get(monthKey) || { inflow: 0, outflow: 0 };
      if (isInf) mData.inflow += Math.abs(amt);
      else mData.outflow += Math.abs(amt);
      monthMap.set(monthKey, mData);
    }

    const netSavings = totalInflow - totalOutflow;
    const savingsRate = totalInflow > 0 ? (netSavings / totalInflow) * 100 : 0;

    // Category breakdown
    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalOutflow > 0 ? (amount / totalOutflow) * 100 : 0,
        color: getCategoryColor(category)
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly chart data
    const monthlyTrend = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, val]) => ({
        month: month.length === 7 ? `${month.split('-')[1]}/${month.split('-')[0].slice(2)}` : month,
        inflow: Math.round(val.inflow),
        outflow: Math.round(val.outflow),
        net: Math.round(val.inflow - val.outflow)
      }));

    // Top merchants
    const topMerchants = Array.from(merchantMap.entries())
      .map(([merchant, val]) => ({
        merchant,
        amount: val.amount,
        count: val.count,
        category: val.category
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalInflow,
      totalOutflow,
      netSavings,
      savingsRate,
      categoryBreakdown,
      monthlyTrend,
      topMerchants,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [filteredTransactions]);

  // Drilldown transactions for category
  const drilldownTransactions = useMemo(() => {
    if (!drilldownCategory) return [];
    return filteredTransactions.filter((t) => (t.amount < 0 || t.type === 'outflow') && t.category === drilldownCategory);
  }, [filteredTransactions, drilldownCategory]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Interactive Timeframe Tabs */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              🐕 Zack's Doghouse Overview
            </h2>
            <div 
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-mono font-medium"
              title={`Zack's Financial Stance: ${zackState.archetypeLabel} (${zackState.unlockedCount}/${zackState.totalMilestones} Milestones)`}
            >
              <span>🐕</span>
              <span className="font-bold">{zackState.archetypeBadge}</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">• {zackState.excitementLevel}% Excitement</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time treat stats parsed offline by Zack's guard patrol
          </p>
        </div>

        {/* Interactive Period Filter Pills */}
        <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 self-start md:self-auto">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'this_month', label: 'This Month' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
            { id: 'ytd', label: 'This Year' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedPeriod(tab.id as PeriodType);
                setDrilldownCategory(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedPeriod === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-600/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Interactive Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bones Fetched (Income)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {formatCurrency(metrics.totalInflow)}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Scent trails of incoming treats</span>
            </p>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Treats Eaten (Expenses)</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {formatCurrency(metrics.totalOutflow)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-1">
              <span>{metrics.categoryBreakdown.length} spending snack types</span>
            </p>
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Buried Bones (Savings)</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              metrics.netSavings >= 0 
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300' 
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-extrabold font-mono tracking-tight ${
              metrics.netSavings >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {metrics.netSavings >= 0 ? `+${formatCurrency(metrics.netSavings)}` : `-${formatCurrency(Math.abs(metrics.netSavings))}`}
            </p>
            <p className={`text-[11px] font-semibold mt-1 ${
              metrics.netSavings >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {metrics.netSavings >= 0 ? 'Burying more than eating' : 'Eating faster than fetching'}
            </p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bone Storage Efficiency</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {metrics.savingsRate.toFixed(1)}%
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, metrics.savingsRate))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Visuals Grid: Donut Breakdown + Monthly Cashflow Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (Donut + Clickable List) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Treat Distribution by Category
              </h3>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Click any slice to inspect
              </span>
            </div>

            {/* Donut Chart with Dark Mode Contrast Optimization */}
            <div className="h-56 mt-2 relative flex items-center justify-center">
              {metrics.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      onClick={(entry: any) => {
                        const cat = entry?.category || entry?.name;
                        setDrilldownCategory(drilldownCategory === cat ? null : cat);
                      }}
                      cursor="pointer"
                    >
                      {metrics.categoryBreakdown.map((entry) => {
                        const isSelected = drilldownCategory === entry.category;
                        return (
                          <Cell 
                            key={`cell-${entry.category}`} 
                            fill={entry.color} 
                            stroke={
                              isSelected 
                                ? (isDarkMode ? '#38bdf8' : '#0f172a') 
                                : (isDarkMode ? '#0f172a' : '#ffffff')
                            }
                            strokeWidth={isSelected ? 3 : 1.5}
                          />
                        );
                      })}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: number) => [formatCurrency(val), 'Spent']}
                      contentStyle={{
                        borderRadius: '12px',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.06)',
                        fontSize: '12px'
                      }}
                      itemStyle={{
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        fontWeight: 600
                      }}
                      labelStyle={{
                        color: isDarkMode ? '#94a3b8' : '#64748b'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400 dark:text-slate-500 text-xs">
                  No expense records available for this period.
                </div>
              )}
            </div>
          </div>

          {/* Interactive Category List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {metrics.categoryBreakdown.map((cat) => {
              const isSelected = drilldownCategory === cat.category;
              return (
                <div
                  key={cat.category}
                  onClick={() => setDrilldownCategory(isSelected ? null : cat.category)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-slate-900 dark:bg-slate-800 text-white dark:text-emerald-300 font-semibold shadow-xs border border-transparent dark:border-slate-700' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span className="truncate">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className={isSelected ? 'text-white dark:text-emerald-200' : 'text-slate-900 dark:text-slate-100'}>
                      {formatCurrency(cat.amount)}
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      ({cat.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Inflow vs Outflow Cashflow Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Canine Cash Flow (Monthly Trends)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compare monthly bones fetched vs treats eaten
              </p>
            </div>

            <button
              onClick={() => onNavigate('budget')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 px-3 py-1 rounded-xl transition-colors"
            >
              <span>Budget Planner</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Bar Chart with High-Contrast Dark Grid & Ticks */}
          <div className="h-64 mt-2">
            {metrics.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke={isDarkMode ? '#334155' : '#f1f5f9'} 
                  />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => `$${v}`} 
                  />
                  <RechartsTooltip
                    formatter={(val: number) => [formatCurrency(val)]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                      boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.06)',
                      fontSize: '12px'
                    }}
                    itemStyle={{
                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                      fontWeight: 600
                    }}
                    labelStyle={{
                      color: isDarkMode ? '#94a3b8' : '#64748b'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      fontSize: '11px', 
                      paddingTop: '8px', 
                      color: isDarkMode ? '#cbd5e1' : '#475569' 
                    }} 
                  />
                  <Bar 
                    dataKey="inflow" 
                    name="Bones Fetched" 
                    fill="#10B981" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={36} 
                  />
                  <Bar 
                    dataKey="outflow" 
                    name="Treats Eaten" 
                    fill={isDarkMode ? '#94A3B8' : '#64748B'} 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={36} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                No monthly data found. Import a statement to populate.
              </div>
            )}
          </div>

          {/* Quick Cashflow summary bottom bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Period Net Cash Flow:</span>
            <span className={`font-mono font-bold ${
              metrics.netSavings >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {metrics.netSavings >= 0 ? `+${formatCurrency(metrics.netSavings)} Surplus` : `-${formatCurrency(Math.abs(metrics.netSavings))} Deficit`}
            </span>
          </div>
        </div>
      </div>

      {/* Category Drilldown Banner (If User Clicked A Category) */}
      {drilldownCategory && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-900 dark:border-slate-700 shadow-lg space-y-4 animate-in fade-in transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Drilldown: {drilldownCategory}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Showing {drilldownTransactions.length} expenses tagged as {drilldownCategory}
              </p>
            </div>

            <button
              onClick={() => setDrilldownCategory(null)}
              className="text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-transparent dark:border-slate-700"
            >
              Clear Filter &times;
            </button>
          </div>

          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Merchant / Memo</th>
                  <th className="py-2.5 px-3">Institution</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {drilldownTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{tx.date}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{tx.clean_merchant || tx.raw_description}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-sm">{tx.raw_description}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] border border-transparent dark:border-slate-700">
                        {tx.institution}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      -{formatCurrency(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Grid: Top Spenders & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Merchants Leaderboard */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Top Treat Suppliers
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">By total treats consumed</span>
          </div>

          <div className="space-y-3">
            {metrics.topMerchants.map((m, idx) => (
              <div key={m.merchant} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
                      {m.merchant}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(m.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">
                      ({m.count}x)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (m.amount / (metrics.topMerchants[0]?.amount || 1)) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>
            ))}

            {metrics.topMerchants.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">No merchant expenses recorded.</p>
            )}
          </div>
        </div>

        {/* Recent Transactions Activity Feed */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Recent Scent Trails
            </h3>
            <button
              onClick={() => onNavigate('ledger')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View All ({transactions.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map((tx) => {
              const isInflow = tx.amount >= 0 || tx.type === 'inflow';
              return (
                <div 
                  key={tx.id} 
                  onClick={() => onOpenDetailModal(tx)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isInflow 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {isInflow ? <ArrowUpRight className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tx.clean_merchant || tx.raw_description}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {tx.date} &bull; <span className="text-slate-600 dark:text-slate-300">{tx.category}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-xs font-mono font-bold ${
                      isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {isInflow ? `+${formatCurrency(Math.abs(tx.amount))}` : `-${formatCurrency(Math.abs(tx.amount))}`}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 px-1.5 py-0.5 rounded">
                      {tx.institution}
                    </span>
                  </div>
                </div>
              );
            })}

            {recentTransactions.length === 0 && (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                No recent transactions. Click "Import Statement" to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
