import React, { useState } from 'react';
import { Plus, X, ShieldCheck, DollarSign } from 'lucide-react';
import { Transaction, InstitutionType } from '../types';
import { STANDARD_CATEGORIES, cleanMerchantName } from '../utils/categorizer';

interface AddTransactionModalProps {
  isOpen: boolean;
  isDarkMode?: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Partial<Transaction>) => Promise<any>;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  isDarkMode = true,
  onClose,
  onAddTransaction
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [institution, setInstitution] = useState<InstitutionType>('Chase');
  const [accountName, setAccountName] = useState('Chase Primary');
  const [rawDescription, setRawDescription] = useState('');
  const [cleanMerchant, setCleanMerchant] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'inflow' | 'outflow'>('outflow');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDescChange = (val: string) => {
    setRawDescription(val);
    if (!cleanMerchant) {
      setCleanMerchant(cleanMerchantName(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawDescription.trim() || !amount) return;

    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt)) return;

    setIsSubmitting(true);
    try {
      const finalAmount = type === 'outflow' ? -Math.abs(parsedAmt) : Math.abs(parsedAmt);
      await onAddTransaction({
        date,
        institution,
        account_name: accountName,
        raw_description: rawDescription.trim(),
        clean_merchant: cleanMerchant.trim() || cleanMerchantName(rawDescription),
        category,
        amount: finalAmount,
        type,
        notes: notes.trim(),
        tags: tags.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error adding manual transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Vault Transaction</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('outflow')}
              className={`py-2 rounded-xl font-semibold transition-all ${
                type === 'outflow'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Outflow / Expense (-)
            </button>
            <button
              type="button"
              onClick={() => setType('inflow')}
              className={`py-2 rounded-xl font-semibold transition-all ${
                type === 'inflow'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Inflow / Income (+)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Raw Description / Statement Memo *</label>
            <input
              type="text"
              required
              placeholder="e.g. WHOLEFDS SOMA #10243"
              value={rawDescription}
              onChange={(e) => handleDescChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Clean Merchant</label>
              <input
                type="text"
                placeholder="e.g. Whole Foods"
                value={cleanMerchant}
                onChange={(e) => setCleanMerchant(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {STANDARD_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name} className="dark:bg-slate-900 dark:text-slate-100">{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Institution</label>
              <select
                value={institution}
                onChange={(e) => setInstitution(e.target.value as InstitutionType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Chase" className="dark:bg-slate-900">Chase</option>
                <option value="Amex" className="dark:bg-slate-900">American Express</option>
                <option value="Apple Card" className="dark:bg-slate-900">Apple Card</option>
                <option value="Citibank" className="dark:bg-slate-900">Citibank</option>
                <option value="Capital One" className="dark:bg-slate-900">Capital One</option>
                <option value="Wells Fargo" className="dark:bg-slate-900">Wells Fargo</option>
                <option value="Generic CSV" className="dark:bg-slate-900">Generic / Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Label</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Private Notes / Tags</label>
            <input
              type="text"
              placeholder="e.g. Business lunch, tax deductible"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors"
            >
              {isSubmitting ? 'Saving to Vault...' : 'Commit to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
