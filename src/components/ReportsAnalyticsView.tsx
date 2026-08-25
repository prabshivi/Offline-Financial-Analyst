import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Sparkles, 
  PieChart as PieChartIcon,
  Filter,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { Transaction, AIStatementProfile } from '../types';
import { STANDARD_CATEGORIES, getCategoryColor } from '../utils/categorizer';
import { getAppDomain } from '../utils/envConfig';

interface ReportsAnalyticsViewProps {
  transactions: Transaction[];
  isDarkMode?: boolean;
  statementProfile?: AIStatementProfile | null;
  onNavigate: (tabId: string) => void;
  onOpenDetailModal?: (tx: Transaction) => void;
}

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({
  transactions,
  isDarkMode = true,
  statementProfile,
  onNavigate,
  onOpenDetailModal
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | 'ytd' | 'all'>('ytd');
  const [reportType, setReportType] = useState<'cashflow' | 'category' | 'monthly_trends'>('cashflow');

  const domain = getAppDomain();

  // Metrics summary
  const metrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    const categoryTotals: Record<string, number> = {};
    const monthlyMap: Record<string, { income: number; expense: number; month: string }> = {};

    transactions.forEach((tx) => {
      const amount = Number(tx.amount) || 0;
      const dateStr = tx.date || new Date().toISOString().slice(0, 10);
      const monthKey = dateStr.slice(0, 7); // YYYY-MM

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { income: 0, expense: 0, month: monthKey };
      }

      if (tx.is_income || amount > 0) {
        const val = Math.abs(amount);
        totalInflow += val;
        monthlyMap[monthKey].income += val;
      } else {
        const val = Math.abs(amount);
        totalOutflow += val;
        monthlyMap[monthKey].expense += val;

        const cat = tx.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
      }
    });

    const netSavings = totalInflow - totalOutflow;
    const savingsRate = totalInflow > 0 ? Math.max(0, Math.round((netSavings / totalInflow) * 100)) : 0;

    const sortedCategories = Object.entries(categoryTotals)
      .map(([name, total]) => ({
        name,
        total,
        percentage: totalOutflow > 0 ? Math.round((total / totalOutflow) * 100) : 0,
        color: getCategoryColor(name)
      }))
      .sort((a, b) => b.total - a.total);

    const monthlyTrends = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalInflow,
      totalOutflow,
      netSavings,
      savingsRate,
      sortedCategories,
      monthlyTrends
    };
  }, [transactions]);

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Type', 'Account'];
    const rows = transactions.map((t) => [
      t.date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category,
      t.amount,
      t.is_income ? 'Income' : 'Expense',
      t.account_name || 'Primary'
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Financial Analytics & Net Worth Reports
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dynamic cashflow telemetry, spending distribution, and multi-period reports &bull; {domain}
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setReportType('cashflow')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                reportType === 'cashflow'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cashflow
            </button>
            <button
              onClick={() => setReportType('category')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                reportType === 'category'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setReportType('monthly_trends')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                reportType === 'monthly_trends'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Trends
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total Inflows</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ${metrics.totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Payroll & deposits</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total Outflows</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ${metrics.totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Living & fixed expenditures</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Net Monthly Surplus</span>
            <Wallet className="w-4 h-4 text-cyan-500" />
          </div>
          <p className={`text-2xl font-black font-mono ${metrics.netSavings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            ${metrics.netSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">Net free cashflow</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Savings Efficiency Rate</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {metrics.savingsRate}%
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Of total gross inflows</p>
        </div>
      </div>

      {/* Main Report View Content */}
      {reportType === 'category' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Expenditure Breakdown by Category</h2>
          <div className="space-y-3">
            {metrics.sortedCategories.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">{cat.name}</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    ${cat.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === 'monthly_trends' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Monthly Cashflow Evolution</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Total Inflows</th>
                  <th className="py-2.5 px-3">Total Outflows</th>
                  <th className="py-2.5 px-3">Net Cashflow</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {metrics.monthlyTrends.map((m) => {
                  const net = m.income - m.expense;
                  return (
                    <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{m.month}</td>
                      <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400">${m.income.toFixed(2)}</td>
                      <td className="py-3 px-3 text-rose-600 dark:text-rose-400">${m.expense.toFixed(2)}</td>
                      <td className={`py-3 px-3 font-bold ${net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ${net.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${net >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {net >= 0 ? 'Surplus' : 'Deficit'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'cashflow' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Income Velocity & Inflow Streams</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Analyzed {transactions.filter((t) => t.is_income).length} income events totaling ${metrics.totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
              <span className="text-slate-400 block text-[10px]">PRIMARY INCOME SOURCE</span>
              <span className="text-emerald-500 font-bold text-sm">
                {statementProfile?.detectedKeyMetrics?.primaryIncomeSource || 'Direct Payroll & Inflow Deposits'}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>Statement Synthesis & Persona</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Account classification: <strong className="text-slate-900 dark:text-white">{statementProfile?.detectedPersona || 'Personal Checking & Savings Vault'}</strong>.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
              <span className="text-slate-400 block text-[10px]">SAVINGS RATIO TARGET</span>
              <span className="text-cyan-400 font-bold text-sm">
                {metrics.savingsRate}% Current vs 20% Recommended
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
