import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Receipt, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  HelpCircle, 
  Plus, 
  Trash2,
  DollarSign,
  Tag,
  Briefcase,
  Building2,
  HeartHandshake
} from 'lucide-react';
import { Transaction, AIStatementProfile } from '../types';
import { getAppDomain } from '../utils/envConfig';

interface TaxPlannerViewProps {
  transactions: Transaction[];
  isDarkMode?: boolean;
  statementProfile?: AIStatementProfile | null;
  onNavigate: (tabId: string) => void;
}

export const TaxPlannerView: React.FC<TaxPlannerViewProps> = ({
  transactions,
  isDarkMode = true,
  statementProfile,
  onNavigate
}) => {
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>('2026');
  const [taxFilter, setTaxFilter] = useState<'all' | 'business' | 'medical' | 'donations' | 'office'>('all');

  const domain = getAppDomain();

  // Identify tax deductible items based on description & category keywords
  const taxAnalysis = useMemo(() => {
    const deductibleKeywords = [
      { tag: 'Office & Supplies', keywords: ['staples', 'amazon', 'software', 'adobe', 'github', 'zoom', 'office', 'computer', 'apple store', 'domain'], cat: 'business' },
      { tag: 'Medical & Dental', keywords: ['pharmacy', 'rx', 'dental', 'clinic', 'doctor', 'hospital', 'health', 'eyecare', 'optometry'], cat: 'medical' },
      { tag: 'Charitable Donations', keywords: ['donation', 'charity', 'red cross', 'unicef', 'foundation', 'food bank', 'united way'], cat: 'donations' },
      { tag: 'Professional & Legal', keywords: ['lawyer', 'legal', 'accounting', 'cpa', 'advisor', 'consultant', 'incorporation'], cat: 'business' },
      { tag: 'Internet & Utilities', keywords: ['telus', 'rogers', 'bell', 'internet', 'broadband', 'telecom', 'mobile'], cat: 'business' }
    ];

    const detectedDeductibles: Array<{
      id: string;
      date: string;
      description: string;
      amount: number;
      taxCategory: string;
      type: 'business' | 'medical' | 'donations';
      confidence: number;
    }> = [];

    let totalDeductibleSum = 0;
    let businessWriteOffSum = 0;
    let medicalExpenseSum = 0;
    let donationSum = 0;

    transactions.forEach((tx) => {
      if (tx.is_income) return;
      const desc = (tx.description || '').toLowerCase();
      const amount = Math.abs(Number(tx.amount) || 0);

      for (const rule of deductibleKeywords) {
        if (rule.keywords.some((kw) => desc.includes(kw))) {
          detectedDeductibles.push({
            id: tx.id,
            date: tx.date,
            description: tx.description,
            amount,
            taxCategory: rule.tag,
            type: rule.cat as any,
            confidence: 92
          });

          totalDeductibleSum += amount;
          if (rule.cat === 'business') businessWriteOffSum += amount;
          if (rule.cat === 'medical') medicalExpenseSum += amount;
          if (rule.cat === 'donations') donationSum += amount;
          break;
        }
      }
    });

    const filteredItems = detectedDeductibles.filter((item) => {
      if (taxFilter === 'all') return true;
      if (taxFilter === 'business') return item.type === 'business';
      if (taxFilter === 'medical') return item.type === 'medical';
      if (taxFilter === 'donations') return item.type === 'donations';
      return true;
    });

    return {
      items: filteredItems,
      totalDeductibleSum,
      businessWriteOffSum,
      medicalExpenseSum,
      donationSum,
      estimatedTaxSavings: totalDeductibleSum * 0.28 // approx 28% marginal tax bracket
    };
  }, [transactions, taxFilter]);

  // Export Tax Summary CSV
  const handleExportTaxSchedule = () => {
    const headers = ['Date', 'Description', 'Amount', 'Tax Deductible Category', 'Eligible Tax Write-off'];
    const rows = taxAnalysis.items.map((item) => [
      item.date,
      `"${item.description.replace(/"/g, '""')}"`,
      item.amount,
      item.taxCategory,
      `$${item.amount.toFixed(2)}`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tax_Deductions_Schedule_${selectedTaxYear}.csv`);
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
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tax Deduction & Write-Off Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated tax write-off audit, eligible deduction schedules &bull; {domain}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTaxYear}
            onChange={(e) => setSelectedTaxYear(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-white"
          >
            <option value="2026">Tax Year 2026</option>
            <option value="2025">Tax Year 2025</option>
          </select>

          <button
            onClick={handleExportTaxSchedule}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Tax Schedule</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Deductions Found</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ${taxAnalysis.totalDeductibleSum.toFixed(2)}
          </p>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Across all statement records</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Est. Tax Savings (~28%)</span>
          <p className="text-2xl font-black text-emerald-500 font-mono">
            ${taxAnalysis.estimatedTaxSavings.toFixed(2)}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Estimated tax liability reduction</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Business / WFH Expenses</span>
          <p className="text-2xl font-black text-cyan-500 font-mono">
            ${taxAnalysis.businessWriteOffSum.toFixed(2)}
          </p>
          <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">Software, office & telecom</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Medical & Charitable</span>
          <p className="text-2xl font-black text-amber-500 font-mono">
            ${(taxAnalysis.medicalExpenseSum + taxAnalysis.donationSum).toFixed(2)}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Pharmacy, dental & gifts</p>
        </div>
      </div>

      {/* Filter Tabs & Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Eligible Tax Deduction Candidates ({taxAnalysis.items.length})
          </h2>

          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {(['all', 'business', 'medical', 'donations'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTaxFilter(filter)}
                className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-all cursor-pointer ${
                  taxFilter === filter
                    ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Merchant / Description</th>
                <th className="py-2.5 px-3">Tax Category</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Deductibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {taxAnalysis.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400 font-sans">
                    No matching tax deduction candidates found for the selected filter.
                  </td>
                </tr>
              ) : (
                taxAnalysis.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-slate-500">{item.date}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{item.description}</td>
                    <td className="py-3 px-3 text-purple-600 dark:text-purple-400">{item.taxCategory}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">${item.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        100% Eligible
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
