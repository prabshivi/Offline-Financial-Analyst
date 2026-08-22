import React, { useState } from 'react';
import { X, Hash, Calendar, Tag, ShieldCheck, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { Transaction } from '../types';
import { STANDARD_CATEGORIES, getCategoryColor } from '../utils/categorizer';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isDarkMode?: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isDarkMode = true,
  onClose,
  onUpdate,
  onDelete
}) => {
  if (!transaction) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [cleanMerchant, setCleanMerchant] = useState(transaction.clean_merchant);
  const [category, setCategory] = useState(transaction.category);
  const [notes, setNotes] = useState(transaction.notes || '');
  const [tags, setTags] = useState(transaction.tags || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(transaction.id, {
        clean_merchant: cleanMerchant,
        category,
        notes,
        tags
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating transaction:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this transaction from the SQLite database?')) {
      await onDelete(transaction.id);
      onClose();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(val));
  };

  const isInflow = transaction.amount >= 0 || transaction.type === 'inflow';
  const catColor = getCategoryColor(category);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
              isInflow 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}>
              {isInflow ? '+' : '-'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {transaction.clean_merchant || transaction.raw_description}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{transaction.institution} &bull; {transaction.account_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Date Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">Transaction Date</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5">{transaction.date}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">Vault Amount</span>
            <p className={`text-xl font-bold font-mono ${isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
              {isInflow ? `+${formatCurrency(transaction.amount)}` : `-${formatCurrency(transaction.amount)}`}
            </p>
          </div>
        </div>

        {/* Deduplication Fingerprint */}
        <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-900 dark:bg-slate-950 text-slate-200 text-xs border dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
              <Hash className="w-3.5 h-3.5" /> Deterministic Vault Fingerprint
            </span>
            <span className="text-[10px] bg-slate-800 dark:bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded font-mono">
              SHA-256 ID
            </span>
          </div>
          <p className="font-mono text-emerald-300 dark:text-emerald-400 text-[11px] break-all select-all">
            {transaction.id}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
            Generated from Date + Raw Description + Amount + Institution for deduplication.
          </p>
        </div>

        {/* Audit Data */}
        <div className="space-y-3 text-xs">
          <div>
            <span className="block font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Raw Bank Statement Record</span>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-words border dark:border-slate-800">
              {transaction.raw_description}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              {isEditing ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name} className="dark:bg-slate-900">{c.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }}></span>
                  <span>{transaction.category}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Clean Merchant Brand</label>
              {isEditing ? (
                <input
                  type="text"
                  value={cleanMerchant}
                  onChange={(e) => setCleanMerchant(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              ) : (
                <p className="font-medium text-slate-800 dark:text-slate-200">{transaction.clean_merchant || 'None'}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
            {isEditing ? (
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add audit notes or tax details..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            ) : (
              <p className="text-slate-600 dark:text-slate-400 italic">{transaction.notes || 'No notes added.'}</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Transaction
          </button>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-medium shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Record
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
