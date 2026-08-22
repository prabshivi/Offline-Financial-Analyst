import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingDown, 
  Calculator, 
  Plus, 
  Trash2, 
  Edit2, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Layers, 
  Flame, 
  Snowflake, 
  Home, 
  CreditCard, 
  Car, 
  GraduationCap, 
  Building2, 
  Percent, 
  Clock, 
  Info, 
  Sliders, 
  Calendar, 
  BadgeCheck,
  RefreshCw,
  Zap,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar,
  LineChart,
  Line
} from 'recharts';
import { DebtItem, RepaymentStrategy, DebtType } from '../types';
import { 
  DEFAULT_DEBT_PORTFOLIO, 
  DEBT_TYPE_CONFIG, 
  getComparativeDebtPayoffPlans, 
  calculateMortgageDeepDive 
} from '../utils/debtCalculator';

interface DebtPayoffViewProps {
  isDarkMode?: boolean;
  onNavigate?: (tab: string) => void;
}

export const DebtPayoffView: React.FC<DebtPayoffViewProps> = ({ isDarkMode = true, onNavigate }) => {
  // Load saved debts from localStorage or use realistic default portfolio
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    try {
      const saved = localStorage.getItem('vault_debts_portfolio');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved debts:', e);
    }
    return DEFAULT_DEBT_PORTFOLIO;
  });

  const [strategy, setStrategy] = useState<RepaymentStrategy>('snowball');
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState<number>(350);
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(0);
  const [lumpSumMonth, setLumpSumMonth] = useState<number>(6);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'mortgage' | 'comparison'>('overview');
  const [scheduleFilterDebt, setScheduleFilterDebt] = useState<string>('all');
  const [schedulePage, setSchedulePage] = useState(1);
  const [notification, setNotification] = useState<string | null>(null);

  // Save debts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vault_debts_portfolio', JSON.stringify(debts));
    } catch (e) {
      console.warn('Failed to persist debts:', e);
    }
  }, [debts]);

  // Comparative calculation plans (Snowball vs Avalanche vs Baseline)
  const plans = useMemo(() => {
    const windfall = lumpSumAmount > 0 ? { amount: lumpSumAmount, atMonth: lumpSumMonth } : undefined;
    return getComparativeDebtPayoffPlans(debts, extraMonthlyPayment, windfall);
  }, [debts, extraMonthlyPayment, lumpSumAmount, lumpSumMonth]);

  const activePlan = strategy === 'snowball' ? plans.snowball : plans.avalanche;
  const baselinePlan = plans.baseline;

  // Primary mortgage if present for Mortgage Suite deep dive
  const primaryMortgage = useMemo(() => {
    return debts.find(d => d.type === 'mortgage' || d.type === 'heloc') || null;
  }, [debts]);

  const mortgageMetrics = useMemo(() => {
    if (!primaryMortgage) return null;
    return calculateMortgageDeepDive(primaryMortgage, 200);
  }, [primaryMortgage]);

  // Aggregate Portfolio Metrics
  const totalBalance = useMemo(() => debts.reduce((sum, d) => sum + d.balance, 0), [debts]);
  const totalMinPayment = useMemo(() => debts.reduce((sum, d) => sum + d.minPayment, 0), [debts]);
  const avgInterestRate = useMemo(() => {
    if (totalBalance === 0) return 0;
    const weightedSum = debts.reduce((sum, d) => sum + (d.balance * d.interestRate), 0);
    return Math.round((weightedSum / totalBalance) * 100) / 100;
  }, [debts, totalBalance]);

  // Prepare Recharts Chart Data (sampled down for clean rendering)
  const chartData = useMemo(() => {
    if (!activePlan.schedule || activePlan.schedule.length === 0) return [];
    
    // Sample every 1, 2, or 3 months depending on duration
    const totalMonths = activePlan.schedule.length;
    const step = totalMonths > 120 ? 6 : totalMonths > 60 ? 3 : totalMonths > 24 ? 2 : 1;

    const sampled = activePlan.schedule.filter((_, idx) => idx % step === 0 || idx === totalMonths - 1);

    return sampled.map(m => {
      const entry: any = {
        month: m.date,
        monthIndex: m.monthIndex,
        totalBalance: m.totalRemainingBalance,
        interestPaidCumulative: m.cumulativeInterest,
        principalPaidCumulative: m.cumulativePrincipal
      };

      // Add individual debt balances
      debts.forEach(d => {
        entry[d.name] = m.debtBalances[d.id] ?? 0;
      });

      return entry;
    });
  }, [activePlan, debts]);

  // Notification helper
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Reset to default sample portfolio
  const handleResetDefaults = () => {
    setDebts(DEFAULT_DEBT_PORTFOLIO);
    setExtraMonthlyPayment(350);
    setLumpSumAmount(0);
    showToast('Reset portfolio to standard Canadian & US debt sample portfolio.');
  };

  // Delete debt
  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
    showToast('Debt removed from portfolio.');
  };

  // Export Amortization Schedule to CSV
  const handleExportCSV = () => {
    if (!activePlan.schedule.length) return;

    const headers = ['Month #', 'Date', 'Total Remaining Balance ($)', 'Total Monthly Payment ($)', 'Interest Paid Month ($)', 'Cumulative Interest ($)'];
    const rows = activePlan.schedule.map(s => [
      s.monthIndex,
      s.date,
      s.totalRemainingBalance,
      s.totalPaymentMonth,
      s.totalInterestPaidMonth,
      s.cumulativeInterest
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Debt_Payoff_${strategy.toUpperCase()}_Amortization_Plan.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Amortization schedule downloaded as CSV.');
  };

  // Helper for debt type icons
  const getDebtIcon = (type: DebtType) => {
    switch (type) {
      case 'mortgage': return Home;
      case 'credit_card': return CreditCard;
      case 'auto_loan': return Car;
      case 'student_loan': return GraduationCap;
      case 'heloc': return Building2;
      default: return DollarSign;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner / Hero Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Calculator className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-100">Debt Payoff & Mortgage Elimination Suite</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Snowball vs. Avalanche
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Model accelerated repayment strategies, calculate interest saved with payment boosters, and simulate mortgage amortization with bi-weekly schedules and principal curtailment.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-load-sample-debts"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/80 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Reset Defaults
          </button>

          <button
            id="btn-export-debt-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/80 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Plan
          </button>

          <button
            id="btn-add-debt"
            onClick={() => {
              setEditingDebt(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Loan / Debt
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Debt */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4.5 shadow-sm space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Total Debt Balance</span>
            <DollarSign className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400">
            Across <strong className="text-slate-200">{debts.length}</strong> active liability accounts
          </div>
        </div>

        {/* Debt Free Date */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4.5 shadow-sm space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Debt-Free Horizon</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {activePlan.debtFreeDate}
          </div>
          <div className="text-[11px] text-emerald-400/90 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{Math.round(activePlan.monthsToPayoff / 12 * 10) / 10} yrs ({activePlan.monthsToPayoff} months)</span>
          </div>
        </div>

        {/* Total Interest Savings */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4.5 shadow-sm space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Total Interest Saved</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            ${activePlan.interestSavedVsBaseline.toLocaleString('en-US')}
          </div>
          <div className="text-[11px] text-amber-400/90">
            vs minimum payments only
          </div>
        </div>

        {/* Time Trimmed */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4.5 shadow-sm space-y-1">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Time Trimmed / Saved</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {Math.floor(activePlan.monthsSavedVsBaseline / 12)}y {activePlan.monthsSavedVsBaseline % 12}m
          </div>
          <div className="text-[11px] text-slate-400">
            Faster debt elimination
          </div>
        </div>
      </div>

      {/* Strategy Toggle & Accelerator Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Repayment Strategy & Monthly Accelerator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your payoff method and configure extra monthly contributions to see immediate amortization acceleration.
            </p>
          </div>

          {/* Method Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              id="btn-strategy-snowball"
              onClick={() => setStrategy('snowball')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                strategy === 'snowball'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5 text-sky-300" />
              Debt Snowball (Lowest Balance)
            </button>

            <button
              id="btn-strategy-avalanche"
              onClick={() => setStrategy('avalanche')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                strategy === 'avalanche'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              Debt Avalanche (Highest APR)
            </button>
          </div>
        </div>

        {/* Strategy Explanations & Accelerator Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accelerator Slider */}
          <div className="lg:col-span-2 space-y-4 bg-slate-950/60 p-4.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Extra Monthly Payment Booster
                </label>
                <p className="text-[11px] text-slate-400">Additional money applied on top of minimums each month</p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-mono">+$</span>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="50"
                  value={extraMonthlyPayment}
                  onChange={(e) => setExtraMonthlyPayment(Math.max(0, Number(e.target.value)))}
                  className="w-24 bg-slate-900 border border-slate-700 text-amber-400 font-bold rounded-lg px-2.5 py-1 text-sm text-right focus:ring-1 focus:ring-amber-500 outline-none"
                />
                <span className="text-xs text-slate-400">/mo</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="2500"
              step="25"
              value={extraMonthlyPayment}
              onChange={(e) => setExtraMonthlyPayment(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            {/* Quick Booster Chips */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Quick presets:</span>
                {[0, 150, 350, 500, 1000].map(val => (
                  <button
                    key={val}
                    onClick={() => setExtraMonthlyPayment(val)}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                      extraMonthlyPayment === val
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    +${val}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                Total monthly outlay: <strong className="text-slate-100">${(totalMinPayment + extraMonthlyPayment).toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Strategy Deep Dive Info Card */}
          <div className="bg-slate-950/60 p-4.5 rounded-xl border border-slate-800/80 space-y-3">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              {strategy === 'snowball' ? (
                <>
                  <Snowflake className="w-4 h-4 text-sky-400" />
                  <span>How Debt Snowball Works</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>How Debt Avalanche Works</span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {strategy === 'snowball' 
                ? 'Target the smallest debt balance first while paying minimums on the rest. As each account is cleared, its payment rolls into the next smallest balance, generating massive psychological momentum and early wins.'
                : 'Target the debt with the highest interest rate (APR) first. This strategy minimizes the total lifetime interest paid to banks and lenders, achieving the mathematically optimal financial outcome.'
              }
            </p>

            <div className="pt-1 text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-800/80">
              <span className="text-slate-400">Total Interest to be Paid:</span>
              <span className="font-mono font-bold text-slate-100">${activePlan.totalInterestPaid.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs for Deep Views: Visual Charts, Milestones, Mortgage Accelerator, Schedule */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-indigo-400" />
          Amortization & Curve Visuals
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'comparison'
              ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          Snowball vs. Avalanche Comparison
        </button>

        {primaryMortgage && (
          <button
            onClick={() => setActiveTab('mortgage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'mortgage'
                ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4 text-sky-400" />
            Mortgage Suite & LTV Accelerator
          </button>
        )}

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'schedule'
              ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-400" />
          Month-by-Month Amortization Ledger
        </button>
      </div>

      {/* VIEW TAB 1: Overview & Visual Payoff Amortization Curve */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Visual Amortization Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-indigo-400" />
                  Debt Balance Payoff Trajectory Over Time
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual projection of balances declining to $0 under the <strong className="text-slate-200 capitalize">{strategy}</strong> plan with +${extraMonthlyPayment}/mo booster.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-500"></span> Total Balance
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span> Cumulative Interest
                </span>
              </div>
            </div>

            {/* Recharts Area Curve */}
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalBalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#f8fafc'
                    }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalBalance" 
                    name="Remaining Debt Balance" 
                    stroke="#6366f1" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#totalBalGrad)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="interestPaidCumulative" 
                    name="Cumulative Interest" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#interestGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payoff Milestones Order Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-400" />
                Target Payoff Sequence & Milestones ({strategy.toUpperCase()})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact order in which your debts will be eliminated, freeing up cash flow for the next target.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {activePlan.milestones.map((m, idx) => {
                const Icon = getDebtIcon(m.type);
                const isFirstTarget = idx === 0;

                return (
                  <div 
                    key={m.debtId} 
                    className={`p-4.5 rounded-xl border relative transition-all ${
                      isFirstTarget 
                        ? 'bg-gradient-to-b from-indigo-950/40 to-slate-950 border-indigo-500/40 shadow-sm ring-1 ring-indigo-500/20' 
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    {/* Badge priority number */}
                    <div className="flex items-center justify-between">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isFirstTarget ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}>
                        #{idx + 1}
                      </span>
                      {isFirstTarget && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Active Target
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="text-xs font-semibold text-slate-100 truncate flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{m.name}</span>
                      </div>
                      <div className="text-lg font-bold text-slate-200">
                        ${m.initialBalance.toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Payoff Date:</span>
                        <strong className="text-emerald-400 font-semibold">{m.payoffDate}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Interest Rate:</span>
                        <span className="font-mono text-slate-300">{m.interestRate}% APR</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Total Interest:</span>
                        <span className="font-mono text-slate-300">${m.totalInterestPaid.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: Snowball vs. Avalanche Side-by-Side Comparison */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Snowball Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              strategy === 'snowball' 
                ? 'bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 border-sky-500/40 shadow-sm ring-1 ring-sky-500/20' 
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Debt Snowball Strategy</h3>
                    <p className="text-xs text-slate-400">Sort by Smallest Balance First</p>
                  </div>
                </div>
                {strategy === 'snowball' && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Selected
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Debt-Free Date</span>
                  <div className="text-lg font-bold text-sky-400 mt-0.5">{plans.snowball.debtFreeDate}</div>
                  <span className="text-[10px] text-slate-500">{plans.snowball.monthsToPayoff} months</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Total Interest Paid</span>
                  <div className="text-lg font-bold text-slate-200 mt-0.5">${plans.snowball.totalInterestPaid.toLocaleString()}</div>
                  <span className="text-[10px] text-emerald-400">-${plans.snowball.interestSavedVsBaseline.toLocaleString()} saved</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200">Why choose Snowball?</div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Fastest early wins. You eliminate entire accounts quickly, boosting morale, reducing minimum required payments, and simplifying your finances right away.
                </p>
              </div>

              <button
                onClick={() => {
                  setStrategy('snowball');
                  showToast('Switched active strategy to Debt Snowball');
                }}
                className={`w-full mt-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  strategy === 'snowball'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {strategy === 'snowball' ? 'Active Strategy' : 'Switch to Debt Snowball'}
              </button>
            </div>

            {/* Avalanche Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              strategy === 'avalanche' 
                ? 'bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40 shadow-sm ring-1 ring-rose-500/20' 
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Debt Avalanche Strategy</h3>
                    <p className="text-xs text-slate-400">Sort by Highest Interest Rate First</p>
                  </div>
                </div>
                {strategy === 'avalanche' && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Selected
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Debt-Free Date</span>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">{plans.avalanche.debtFreeDate}</div>
                  <span className="text-[10px] text-slate-500">{plans.avalanche.monthsToPayoff} months</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Total Interest Paid</span>
                  <div className="text-lg font-bold text-slate-200 mt-0.5">${plans.avalanche.totalInterestPaid.toLocaleString()}</div>
                  <span className="text-[10px] text-emerald-400">-${plans.avalanche.interestSavedVsBaseline.toLocaleString()} saved</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200">Why choose Avalanche?</div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Maximum total interest savings. By attacking predatory 19.99%+ credit cards and high interest loans first, you pay the least total money to banks over time.
                </p>
              </div>

              <button
                onClick={() => {
                  setStrategy('avalanche');
                  showToast('Switched active strategy to Debt Avalanche');
                }}
                className={`w-full mt-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  strategy === 'avalanche'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {strategy === 'avalanche' ? 'Active Strategy' : 'Switch to Debt Avalanche'}
              </button>
            </div>
          </div>

          {/* Mathematical Difference Summary */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-slate-100 block text-sm">Strategy Efficiency Delta</strong>
                <span className="text-slate-400">
                  Avalanche saves <strong className="text-emerald-400">${Math.abs(plans.snowball.totalInterestPaid - plans.avalanche.totalInterestPaid).toLocaleString()}</strong> more in interest compared to Snowball for your current debt stack.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 3: Mortgage Deep Dive & LTV Accelerator */}
      {activeTab === 'mortgage' && primaryMortgage && mortgageMetrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mortgage Overview Card */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{primaryMortgage.name}</h3>
                    <p className="text-xs text-slate-400">{primaryMortgage.institution} • {primaryMortgage.interestRate}% APR Fixed</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-100">${primaryMortgage.balance.toLocaleString()}</div>
                  <span className="text-xs text-slate-400">Current Balance</span>
                </div>
              </div>

              {/* Bi-weekly vs Monthly Comparison */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Bi-Weekly Mortgage Acceleration Impact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-300">Standard Monthly Payments</div>
                    <div className="text-sm font-mono text-slate-200">${primaryMortgage.minPayment.toLocaleString()}/mo</div>
                    <div className="text-xs text-slate-400 pt-1">
                      Total Interest: <strong className="text-slate-200">${mortgageMetrics.monthlyTotalInterest.toLocaleString()}</strong>
                    </div>
                    <div className="text-xs text-slate-400">
                      Amortization Time: <strong className="text-slate-200">{mortgageMetrics.monthlyYears} Years</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-b from-sky-950/40 to-slate-950 rounded-xl border border-sky-500/30 space-y-2">
                    <div className="text-xs font-semibold text-sky-300 flex items-center justify-between">
                      <span>Accelerated Bi-Weekly</span>
                      <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 text-[10px] rounded font-bold">13 Payments/Yr</span>
                    </div>
                    <div className="text-sm font-mono text-sky-300">${(primaryMortgage.minPayment / 2).toFixed(2)} every 2 weeks</div>
                    <div className="text-xs text-emerald-400 pt-1">
                      Interest Saved: <strong className="font-bold">-${mortgageMetrics.biweeklyInterestSaved.toLocaleString()}</strong>
                    </div>
                    <div className="text-xs text-emerald-400">
                      Time Saved: <strong className="font-bold">{mortgageMetrics.biweeklyYearsSaved} Years Earlier</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LTV & Equity Gauge Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Loan-To-Value (LTV) & PMI Removal</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current LTV:</span>
                  <span className="font-bold text-slate-200 font-mono">{mortgageMetrics.currentLTV}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all"
                    style={{ width: `${Math.min(100, (100 - mortgageMetrics.currentLTV) / 0.2 * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>80% Target (PMI Elimination)</span>
                  <span>Target Balance: ${mortgageMetrics.target80Balance.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300">
                <div className="font-semibold text-slate-200">PMI / CMHC Insurance Threshold</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Once your mortgage drops below 80% LTV, you can request your lender to cancel private mortgage insurance (saving $100-$300/mo).
                </p>
                {mortgageMetrics.monthsTo80LTV > 0 && (
                  <div className="text-emerald-400 font-medium text-[11px] pt-1">
                    Reach 80% LTV in ~{mortgageMetrics.monthsTo80LTV} months!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 4: Month-by-Month Amortization Ledger */}
      {activeTab === 'schedule' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-4">
          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Month-by-Month Amortization Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact repayment breakdown of principal, interest, and remaining balance for each month until debt freedom.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Download CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Month #</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Total Outlay ($)</th>
                  <th className="px-5 py-3 text-right">Interest Paid ($)</th>
                  <th className="px-5 py-3 text-right">Cumulative Interest ($)</th>
                  <th className="px-5 py-3 text-right">Remaining Debt ($)</th>
                  <th className="px-5 py-3 text-center">Milestones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {activePlan.schedule.slice((schedulePage - 1) * 24, schedulePage * 24).map((row) => (
                  <tr key={row.monthIndex} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-slate-400">
                      M{row.monthIndex}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-200">
                      {row.date}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-200">
                      ${row.totalPaymentMonth.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-amber-400">
                      ${row.totalInterestPaidMonth.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-400">
                      ${row.cumulativeInterest.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-indigo-400">
                      ${row.totalRemainingBalance.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {row.paidOffThisMonth && row.paidOffThisMonth.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          {row.paidOffThisMonth.map((name, i) => (
                            <span key={i} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/40">
                              🎉 {name} Paid Off!
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Months {((schedulePage - 1) * 24) + 1} to {Math.min(schedulePage * 24, activePlan.schedule.length)} of {activePlan.schedule.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={schedulePage <= 1}
                onClick={() => setSchedulePage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-800 disabled:opacity-40 text-slate-200 rounded text-xs"
              >
                Previous
              </button>
              <button
                disabled={schedulePage * 24 >= activePlan.schedule.length}
                onClick={() => setSchedulePage(p => p + 1)}
                className="px-3 py-1 bg-slate-800 disabled:opacity-40 text-slate-200 rounded text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debt Portfolio Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-400" />
              Active Debt Portfolio Inventory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your liability balances, interest rates, and required minimum monthly payments.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingDebt(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Debt
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Account / Debt Name</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Institution</th>
                <th className="px-5 py-3.5 text-right">Current Balance</th>
                <th className="px-5 py-3.5 text-right">Interest (APR)</th>
                <th className="px-5 py-3.5 text-right">Min Payment</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {debts.map((debt) => {
                const Icon = getDebtIcon(debt.type);
                const typeConfig = DEBT_TYPE_CONFIG[debt.type] || DEBT_TYPE_CONFIG.other;

                return (
                  <tr key={debt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-100 flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{debt.name}</div>
                        {debt.notes && <div className="text-[11px] text-slate-400">{debt.notes}</div>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${typeConfig.bg} ${typeConfig.text} border ${typeConfig.border}`}>
                        {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {debt.institution}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-100">
                      ${debt.balance.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-amber-400 font-semibold">
                      {debt.interestRate}%
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-200">
                      ${debt.minPayment.toLocaleString()}/mo
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingDebt(debt);
                            setShowAddModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-all"
                          title="Edit Debt"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                          title="Delete Debt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-100">
                {editingDebt ? 'Edit Debt Account' : 'Add New Debt Account'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newDebt: DebtItem = {
                  id: editingDebt ? editingDebt.id : `debt-${Date.now()}`,
                  name: String(formData.get('name') || 'Loan'),
                  type: (formData.get('type') as DebtType) || 'other',
                  institution: String(formData.get('institution') || 'Bank'),
                  balance: Number(formData.get('balance')) || 0,
                  interestRate: Number(formData.get('interestRate')) || 0,
                  minPayment: Number(formData.get('minPayment')) || 0,
                  notes: String(formData.get('notes') || '')
                };

                if (editingDebt) {
                  setDebts(debts.map(d => d.id === editingDebt.id ? newDebt : d));
                  showToast('Debt account updated.');
                } else {
                  setDebts([...debts, newDebt]);
                  showToast('New debt added to portfolio.');
                }
                setShowAddModal(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Debt / Account Name</label>
                <input
                  name="name"
                  defaultValue={editingDebt?.name || ''}
                  required
                  placeholder="e.g. RBC Home Mortgage, Chase Sapphire, Auto Loan"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Debt Type</label>
                  <select
                    name="type"
                    defaultValue={editingDebt?.type || 'credit_card'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="mortgage">Mortgage</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="auto_loan">Auto Loan</option>
                    <option value="student_loan">Student Loan</option>
                    <option value="personal_loan">Personal Loan</option>
                    <option value="heloc">HELOC / Line of Credit</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Financial Institution</label>
                  <input
                    name="institution"
                    defaultValue={editingDebt?.institution || ''}
                    placeholder="e.g. RBC, TD, Scotiabank, Chase"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Current Balance ($)</label>
                  <input
                    name="balance"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingDebt?.balance || ''}
                    required
                    placeholder="e.g. 15000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Interest Rate (APR %)</label>
                  <input
                    name="interestRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="99"
                    defaultValue={editingDebt?.interestRate || ''}
                    required
                    placeholder="e.g. 6.5"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Min Monthly ($)</label>
                  <input
                    name="minPayment"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingDebt?.minPayment || ''}
                    required
                    placeholder="e.g. 350"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Notes (Optional)</label>
                <input
                  name="notes"
                  defaultValue={editingDebt?.notes || ''}
                  placeholder="e.g. Fixed rate expires 2028"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-sm"
                >
                  {editingDebt ? 'Save Changes' : 'Add to Portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
