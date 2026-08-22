import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Trash2, 
  Edit3, 
  Filter, 
  Plus, 
  ArrowUpDown, 
  CheckSquare, 
  Square, 
  Receipt, 
  Database,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  X,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Transaction } from '../types';
import { STANDARD_CATEGORIES, getCategoryColor } from '../utils/categorizer';

interface MasterLedgerViewProps {
  transactions: Transaction[];
  isDarkMode?: boolean;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => Promise<boolean>;
  onDeleteTransaction: (id: string) => Promise<boolean>;
  onBulkDelete: (ids: string[]) => Promise<number>;
  onOpenAddModal: () => void;
  onOpenDetailModal: (tx: Transaction) => void;
}

export const MasterLedgerView: React.FC<MasterLedgerViewProps> = ({
  transactions,
  isDarkMode = true,
  onUpdateTransaction,
  onDeleteTransaction,
  onBulkDelete,
  onOpenAddModal,
  onOpenDetailModal
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedInstitution, setSelectedInstitution] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [minAmountFilter, setMinAmountFilter] = useState<number | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'clean_merchant' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Quick Preset Filters
  const handleQuickFilter = (cat: string) => {
    if (selectedCategory === cat) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(cat);
      setCurrentPage(1);
    }
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        (t.clean_merchant || '').toLowerCase().includes(q) ||
        (t.raw_description || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.institution || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.amount.toString()).includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (selectedInstitution !== 'all') {
      list = list.filter((t) => t.institution.toLowerCase() === selectedInstitution.toLowerCase());
    }

    if (typeFilter === 'inflow') {
      list = list.filter((t) => t.amount > 0 || t.type === 'inflow');
    } else if (typeFilter === 'outflow') {
      list = list.filter((t) => t.amount < 0 || t.type === 'outflow');
    }

    if (minAmountFilter !== null) {
      list = list.filter((t) => Math.abs(t.amount) >= minAmountFilter);
    }

    // Sort
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'amount') {
        valA = Math.abs(a.amount);
        valB = Math.abs(b.amount);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [transactions, search, selectedCategory, selectedInstitution, typeFilter, minAmountFilter, sortField, sortOrder]);

  // Unique Institutions
  const institutions = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.institution).filter(Boolean)));
  }, [transactions]);

  // Live calculation of filtered items
  const filteredStats = useMemo(() => {
    let sum = 0;
    for (const t of filteredTransactions) {
      sum += t.amount;
    }
    const avg = filteredTransactions.length > 0 ? sum / filteredTransactions.length : 0;
    return { sum, avg, count: filteredTransactions.length };
  }, [filteredTransactions]);

  // Pagination slice
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedTransactions.length && paginatedTransactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTransactions.map((t) => t.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Permanently delete ${selectedIds.size} transactions from your local vault?`)) {
      await onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkApplyCategory = async () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await onUpdateTransaction(id, { category: bulkCategory });
    }
    setSelectedIds(new Set());
    setBulkCategory('');
  };

  const handleExportCsv = () => {
    if (transactions.length === 0) return;
    const headers = ['id', 'date', 'institution', 'account_name', 'raw_description', 'clean_merchant', 'category', 'amount', 'type', 'notes', 'tags', 'created_at'];
    const csvRows = [headers.join(',')];

    for (const t of filteredTransactions) {
      const row = [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${(t.institution || '').replace(/"/g, '""')}"`,
        `"${(t.account_name || '').replace(/"/g, '""')}"`,
        `"${(t.raw_description || '').replace(/"/g, '""')}"`,
        `"${(t.clean_merchant || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${t.type}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
        `"${(t.tags || '').replace(/"/g, '""')}"`,
        `"${t.created_at || ''}"`
      ];
      csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vault_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header Card with Actions */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Transaction Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View, search, categorize, and audit all stored records in your local database
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Record
          </button>

          <button
            onClick={handleExportCsv}
            disabled={transactions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Export CSV
          </button>

          <a
            href="/api/export/db"
            download="vault.db"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white text-xs font-semibold transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Download SQLite .db
          </a>
        </div>
      </div>

      {/* Interactive Filter & Omnibar Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
        {/* Quick Filter Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 dark:text-slate-500 font-bold text-[11px] uppercase tracking-wider shrink-0 mr-1">
            Quick Filter:
          </span>
          {[
            { label: 'All', id: 'all' },
            { label: 'Groceries', id: 'Groceries' },
            { label: 'Dining Out', id: 'Dining Out' },
            { label: 'Coffee', id: 'Coffee & Drinks' },
            { label: 'Shopping', id: 'Shopping' },
            { label: 'Subscriptions', id: 'Entertainment & Subscriptions' },
            { label: 'Transportation', id: 'Transportation' },
            { label: 'Housing / Rent', id: 'Rent & Housing' },
            { label: 'Income Only', id: 'Income' },
          ].map((pill) => {
            const isSelected = selectedCategory === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => handleQuickFilter(pill.id)}
                className={`px-3 py-1 rounded-xl font-medium transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {pill.label}
              </button>
            );
          })}

          <button
            onClick={() => setMinAmountFilter(minAmountFilter === 100 ? null : 100)}
            className={`px-3 py-1 rounded-xl font-medium transition-all whitespace-nowrap shrink-0 ${
              minAmountFilter === 100
                ? 'bg-amber-600 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs font-bold'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            }`}
          >
            Over $100
          </button>
        </div>

        {/* Search & Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search merchant, memo, notes, amount..."
              className="w-full pl-10 pr-8 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <option value="all">All Categories</option>
              {STANDARD_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Institution Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedInstitution}
              onChange={(e) => {
                setSelectedInstitution(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <option value="all">All Banks / Cards</option>
              {institutions.map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <option value="all">Inflow & Outflow</option>
              <option value="inflow">Income (+)</option>
              <option value="outflow">Expenses (-)</option>
            </select>
          </div>
        </div>

        {/* Live Filter Statistics Strip */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Found <strong className="text-slate-800 dark:text-slate-200">{filteredTransactions.length}</strong> matching records
            </span>
            <span>&bull;</span>
            <span>
              Net Sum: <strong className={`font-mono ${filteredStats.sum >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}`}>
                {filteredStats.sum >= 0 ? `+${formatCurrency(filteredStats.sum)}` : `-${formatCurrency(Math.abs(filteredStats.sum))}`}
              </strong>
            </span>
          </div>

          {(search || selectedCategory !== 'all' || selectedInstitution !== 'all' || typeFilter !== 'all' || minAmountFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedInstitution('all');
                setTypeFilter('all');
                setMinAmountFilter(null);
              }}
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Reset All Filters</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Bulk Actions Banner when rows selected */}
        {selectedIds.size > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-slate-800 border border-transparent dark:border-slate-700 text-white flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400 font-mono px-2 py-0.5 bg-slate-800 dark:bg-slate-900 rounded-lg">
                {selectedIds.size} selected
              </span>
              <span>Bulk update selected transactions:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-900 border border-slate-700 text-xs text-slate-200"
                >
                  <option value="">Choose Category...</option>
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkApplyCategory}
                  disabled={!bulkCategory}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  Apply Category
                </button>
              </div>

              <button
                onClick={handleBulkDeleteSelected}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Ledger Table Card with Enhanced Contrast Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-750">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    {selectedIds.size === paginatedTransactions.length && paginatedTransactions.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors w-28"
                  onClick={() => {
                    if (sortField === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortField('date'); setSortOrder('desc'); }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Merchant & Memo</th>
                <th className="py-3 px-4 w-32">Bank / Card</th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors w-44"
                  onClick={() => {
                    if (sortField === 'category') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortField('category'); setSortOrder('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors w-28"
                  onClick={() => {
                    if (sortField === 'amount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortField('amount'); setSortOrder('desc'); }
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 w-20 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {paginatedTransactions.map((tx) => {
                const isSelected = selectedIds.has(tx.id);
                const isInflow = tx.amount >= 0 || tx.type === 'inflow';
                const catColor = getCategoryColor(tx.category);

                return (
                  <tr 
                    key={tx.id}
                    className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors ${
                      isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleToggleSelect(tx.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {tx.date}
                    </td>

                    {/* Clean Merchant & Raw Description */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {tx.clean_merchant || tx.raw_description}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-sm" title={tx.raw_description}>
                          {tx.raw_description}
                        </span>
                        {tx.notes && (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 italic mt-0.5">
                            Note: {tx.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Institution */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {tx.institution}
                      </span>
                    </td>

                    {/* Category Selector (Inline Quick Change) */}
                    <td className="py-3 px-4">
                      <select
                        value={tx.category}
                        onChange={(e) => onUpdateTransaction(tx.id, { category: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors"
                        style={{ borderLeft: `3.5px solid ${catColor}` }}
                      >
                        {STANDARD_CATEGORIES.map((c) => (
                          <option key={c.name} value={c.name} className="dark:bg-slate-900 dark:text-slate-100">{c.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Amount */}
                    <td className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                      isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {isInflow ? `+${formatCurrency(Math.abs(tx.amount))}` : `-${formatCurrency(Math.abs(tx.amount))}`}
                    </td>

                    {/* Audit Details Button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onOpenDetailModal(tx)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View Full Transaction Audit & Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No transactions match the search filters. Try clearing your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Footer Pagination */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 transition-colors">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredTransactions.length)}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredTransactions.length}</span> records
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 dark:text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-slate-700 dark:text-slate-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

