import React, { useState, useMemo } from 'react';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Plus, 
  Edit3, 
  DollarSign,
  Calendar,
  Sparkles,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { Transaction } from '../types';
import { STANDARD_CATEGORIES, getCategoryColor } from '../utils/categorizer';

interface BudgetTrackerViewProps {
  transactions: Transaction[];
  isDarkMode?: boolean;
  onNavigate: (tab: string) => void;
  onOpenDetailModal?: (tx: Transaction) => void;
}

const DEFAULT_BUDGETS: Record<string, number> = {
  'Groceries': 600,
  'Dining Out': 350,
  'Coffee & Drinks': 100,
  'Shopping': 300,
  'Transportation': 200,
  'Gas & Fuel': 150,
  'Entertainment & Subscriptions': 120,
  'Utilities & Bills': 250,
  'Rent & Housing': 1800,
  'Fitness & Wellness': 90,
  'Travel & Lodging': 250,
  'Health & Pharmacy': 100,
  'Miscellaneous': 150,
};

export const BudgetTrackerView: React.FC<BudgetTrackerViewProps> = ({
  transactions,
  isDarkMode = true,
  onNavigate,
  onOpenDetailModal
}) => {
  // Load user custom budgets from local storage or defaults
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('vault_user_budgets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_BUDGETS;
      }
    }
    return DEFAULT_BUDGETS;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('current');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempBudgetInput, setTempBudgetInput] = useState<string>('');

  const saveBudgets = (newBudgets: Record<string, number>) => {
    setBudgets(newBudgets);
    localStorage.setItem('vault_user_budgets', JSON.stringify(newBudgets));
  };

  // Filter transactions by selected month
  const monthTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return true;
      if (selectedMonth === 'current') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return true; // all time
    });
  }, [transactions, selectedMonth]);

  // Compute spend per category
  const categorySpendMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTransactions) {
      if (t.amount < 0 || t.type === 'outflow') {
        const cat = t.category || 'Miscellaneous';
        map.set(cat, (map.get(cat) || 0) + Math.abs(t.amount));
      }
    }
    return map;
  }, [monthTransactions]);

  // Total budget & total spend calculations
  const totalBudgeted = useMemo(() => {
    return (Object.values(budgets) as number[]).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
  }, [budgets]);

  const totalSpent = useMemo(() => {
    let sum = 0;
    for (const [_, amount] of categorySpendMap.entries()) {
      sum += amount;
    }
    return sum;
  }, [categorySpendMap]);

  const remainingOverall = totalBudgeted - totalSpent;
  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  // Days left in current month for daily allowance
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());
  const dailyAllowance = remainingOverall > 0 ? remainingOverall / daysRemaining : 0;

  const handleStartEdit = (category: string) => {
    setEditingCategory(category);
    setTempBudgetInput(String(budgets[category] || 300));
  };

  const handleSaveEdit = (category: string) => {
    const val = parseFloat(tempBudgetInput);
    if (!isNaN(val) && val >= 0) {
      const updated = { ...budgets, [category]: val };
      saveBudgets(updated);
    }
    setEditingCategory(null);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all category budgets to recommended default limits?')) {
      saveBudgets(DEFAULT_BUDGETS);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Transactions belonging to selected drill-down category
  const filteredCategoryTransactions = useMemo(() => {
    if (!activeCategoryFilter) return [];
    return monthTransactions.filter((t) => (t.amount < 0 || t.type === 'outflow') && t.category === activeCategoryFilter);
  }, [monthTransactions, activeCategoryFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Food Bowl Budgets (Monthly Targets)
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              Interactive Planner
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Help Zack budget his kibble and treats! Track category targets automatically as statements are fetched.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>

          <button
            onClick={() => onNavigate('ingestion')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Fetch Bank Statements
          </button>
        </div>
      </div>

      {/* Main Budget Summary Dashboard Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
              Current Month Overview ({now.toLocaleString('default', { month: 'long', year: 'numeric' })})
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono">
                {formatCurrency(totalSpent)}
              </span>
              <span className="text-slate-400 text-sm">
                nibbled of <span className="font-semibold text-slate-200 font-mono">{formatCurrency(totalBudgeted)}</span> budget
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 backdrop-blur-xs">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">Remaining Kibble (Allowance)</span>
              <span className={`text-lg font-bold font-mono ${remainingOverall >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {remainingOverall >= 0 ? `+${formatCurrency(remainingOverall)}` : `-${formatCurrency(Math.abs(remainingOverall))}`}
              </span>
            </div>
            <div className="border-l border-slate-700 pl-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">Safe Daily Snacking</span>
              <span className="text-lg font-bold font-mono text-sky-400">
                ~{formatCurrency(dailyAllowance)}/day
              </span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              {overallPercentage <= 100 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              {overallPercentage.toFixed(1)}% of total monthly allowance used
            </span>
            <span className="text-slate-400 font-mono">
              {daysRemaining} days remaining in month
            </span>
          </div>

          <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPercentage < 75
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : overallPercentage <= 100
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-rose-500 to-red-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, overallPercentage))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Categories Budget Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Category Budget Breakdown
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click any category card to inspect its transactions or edit budget limits
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STANDARD_CATEGORIES.filter((c) => c.type === 'outflow').map((cat) => {
            const limit = budgets[cat.name] || 0;
            const spent = categorySpendMap.get(cat.name) || 0;
            const remaining = limit - spent;
            const pct = limit > 0 ? (spent / limit) * 100 : spent > 0 ? 100 : 0;
            const isEditing = editingCategory === cat.name;
            const isSelected = activeCategoryFilter === cat.name;

            let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60';
            let barColor = 'bg-emerald-500';
            if (pct >= 100) {
              statusColor = 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60';
              barColor = 'bg-rose-500';
            } else if (pct >= 75) {
              statusColor = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60';
              barColor = 'bg-amber-500';
            }

            return (
              <div
                key={cat.name}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
                  isSelected
                    ? 'border-slate-900 dark:border-emerald-500 ring-2 ring-slate-900/10 dark:ring-emerald-500/20 shadow-md'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                }`}
              >
                {/* Top Row: Category Title & Edit Button */}
                <div className="flex items-start justify-between gap-2">
                  <div 
                    onClick={() => setActiveCategoryFilter(isSelected ? null : cat.name)}
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                        {cat.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {spent > 0 ? `${monthTransactions.filter(t => t.category === cat.name).length} transactions` : 'No expenses yet'}
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempBudgetInput}
                        onChange={(e) => setTempBudgetInput(e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-emerald-500 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(cat.name)}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(cat.name)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit monthly budget target"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Numbers */}
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Spent: </span>
                    <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                      {formatCurrency(spent)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Target: </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {formatCurrency(limit)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2.5 space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${Math.min(100, Math.max(spent > 0 ? 3 : 0, pct))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {pct.toFixed(0)}% used
                    </span>
                    <span className={`font-semibold ${remaining >= 0 ? 'text-slate-600 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                      {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over!`}
                    </span>
                  </div>
                </div>

                {/* Quick Inspect Transactions Trigger */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setActiveCategoryFilter(isSelected ? null : cat.name)}
                    className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>{isSelected ? 'Hide Details' : 'View Transactions'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {pct >= 100 ? 'Exceeded' : pct >= 75 ? 'Caution' : 'On Track'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drill-down Transactions Inspector */}
      {activeCategoryFilter && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4 animate-in fade-in transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {activeCategoryFilter} Transactions
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Listing all expenses tagged under {activeCategoryFilter} for the current period
              </p>
            </div>

            <button
              onClick={() => setActiveCategoryFilter(null)}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl transition-colors"
            >
              Close Inspector &times;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-750">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Merchant / Memo</th>
                  <th className="py-2.5 px-3">Institution</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredCategoryTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{tx.date}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{tx.clean_merchant || tx.raw_description}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-sm">{tx.raw_description}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                        {tx.institution}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      -{formatCurrency(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}

                {filteredCategoryTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 dark:text-slate-500">
                      No expenses recorded for this category in the current period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

