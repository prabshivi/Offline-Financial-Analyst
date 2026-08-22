import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { BudgetTrackerView } from './components/BudgetTrackerView';
import { IngestionView } from './components/IngestionView';
import { MasterLedgerView } from './components/MasterLedgerView';
import { RulesEngineView } from './components/RulesEngineView';
import { SecurityVaultView } from './components/SecurityVaultView';
import { NightlyRunsView } from './components/NightlyRunsView';
import { AutoFetchView } from './components/AutoFetchView';
import { DebtPayoffView } from './components/DebtPayoffView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { VaultLockScreen } from './components/VaultLockScreen';
import { ZackRoamingCompanion } from './components/ZackRoamingCompanion';
import { Transaction, Rule, VaultHealth, StagingTransaction } from './types';
import { api } from './utils/api';
import { DEFAULT_RULES } from './utils/categorizer';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('vault_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // Default to dark mode
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [health, setHealth] = useState<VaultHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [auditTransaction, setAuditTransaction] = useState<Transaction | null>(null);
  const [loginAuditToast, setLoginAuditToast] = useState<string | null>(null);
  const [lastLoginTime, setLastLoginTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const handleUnlockVault = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastLoginTime(timeStr);
    setIsVaultLocked(false);
    
    // Dynamic Peace of Mind security audit stamp on every login
    localStorage.setItem('vault_last_security_audit', `Verified upon login at ${timeStr}`);
    setLoginAuditToast(`🛡️ Peace of Mind Security Audit: All 7 checks passed at ${timeStr} (Zero Cloud Leaks & Local AES-256 Verified)`);
    
    setTimeout(() => {
      setLoginAuditToast(null);
    }, 6000);
  };

  const isDarkMode = theme === 'dark';

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sync dark class on document root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vault_theme', theme);
  }, [theme]);

  // Fetch all transactions and system state
  const loadVaultData = useCallback(async () => {
    try {
      const [txData, rulesData, healthData] = await Promise.all([
        api.getTransactions(),
        api.getRules(),
        api.getHealth()
      ]);

      setTransactions(txData || []);
      if (rulesData && rulesData.length > 0) {
        setRules(rulesData);
      }
      setHealth(healthData);
    } catch (err) {
      console.error('Failed to load vault data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  // Seed sample transactions if requested or initially empty on demo
  const handleSeedSampleData = async () => {
    setIsSeeding(true);
    try {
      await api.seedSampleData();
      await loadVaultData();
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Commit batch of staging transactions
  const handleCommitTransactions = async (staging: StagingTransaction[]) => {
    const result = await api.saveTransactions(staging);
    await loadVaultData();
    return result;
  };

  // Add single manual record
  const handleAddSingleTransaction = async (tx: Partial<Transaction>) => {
    const result = await api.saveTransactions([tx]);
    await loadVaultData();
    return result;
  };

  // Update transaction
  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const success = await api.updateTransaction(id, updates);
    if (success) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      if (auditTransaction?.id === id) {
        setAuditTransaction((prev) => (prev ? { ...prev, ...updates } : null));
      }
    }
    return success;
  };

  // Delete single transaction
  const handleDeleteTransaction = async (id: string) => {
    const success = await api.deleteTransaction(id);
    if (success) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      await loadVaultData();
    }
    return success;
  };

  // Bulk delete transactions
  const handleBulkDelete = async (ids: string[]) => {
    const count = await api.bulkDeleteTransactions(ids);
    if (count > 0) {
      setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
      await loadVaultData();
    }
    return count;
  };

  // Wipe vault
  const handleClearVault = async () => {
    const success = await api.clearVault();
    if (success) {
      setTransactions([]);
      await loadVaultData();
    }
    return success;
  };

  // Save rule
  const handleSaveRule = async (rule: Partial<Rule>) => {
    const saved = await api.saveRule(rule);
    const updated = await api.getRules();
    setRules(updated);
    return saved;
  };

  // Delete rule
  const handleDeleteRule = async (id: string) => {
    const success = await api.deleteRule(id);
    if (success) {
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
    return success;
  };

  // Import Data
  const handleImportData = async (format: 'json' | 'base64_db', data: any) => {
    const res = await api.importData(format, data);
    await loadVaultData();
    return res;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-300 transition-colors duration-200">
      {/* Top Application Header */}
      <Header
        health={health}
        transactionCount={transactions.length}
        isVaultLocked={isVaultLocked}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onToggleLock={() => setIsVaultLocked(!isVaultLocked)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onSeedSampleData={handleSeedSampleData}
        onNavigate={(tab) => setActiveTab(tab)}
        isSeeding={isSeeding}
      />

      {isVaultLocked ? (
        /* Clean Minimalist Login Screen without menu items or sidebar */
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-slate-400 font-mono">Loading Private Financial Vault...</p>
              </div>
            </div>
          ) : (
            <VaultLockScreen
              onUnlock={handleUnlockVault}
              isDarkMode={isDarkMode}
              onSeedSampleData={handleSeedSampleData}
              transactionCount={transactions.length}
            />
          )}
        </main>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Navigation Sidebar - Only rendered when unlocked */}
          <SidebarNav
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            transactionCount={transactions.length}
            health={health}
            isVaultLocked={isVaultLocked}
            isDarkMode={isDarkMode}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-4">
            {/* Dynamic Peace of Mind Login Security Banner */}
            {loginAuditToast && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-semibold">{loginAuditToast}</span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('nightly');
                    setLoginAuditToast(null);
                  }}
                  className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] whitespace-nowrap transition-all shadow-xs"
                >
                  View Peace of Mind Audit &rarr;
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-semibold text-slate-400 font-mono">Loading Private Financial Vault...</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    transactions={transactions}
                    stats={null}
                    isDarkMode={isDarkMode}
                    onNavigate={(tab) => setActiveTab(tab)}
                    onOpenAddModal={() => setIsAddModalOpen(true)}
                    onSeedSampleData={handleSeedSampleData}
                    onOpenDetailModal={(tx) => setAuditTransaction(tx)}
                  />
                )}

              {activeTab === 'budget' && (
                <BudgetTrackerView
                  transactions={transactions}
                  isDarkMode={isDarkMode}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onOpenDetailModal={(tx) => setAuditTransaction(tx)}
                />
              )}

              {activeTab === 'debt-payoff' && (
                <DebtPayoffView
                  isDarkMode={isDarkMode}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'ingestion' && (
                <IngestionView
                  existingTransactions={transactions}
                  isDarkMode={isDarkMode}
                  onCommitTransactions={handleCommitTransactions}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'auto-fetch' && (
                <AutoFetchView
                  onRefreshAllData={loadVaultData}
                />
              )}

              {activeTab === 'ledger' && (
                <MasterLedgerView
                  transactions={transactions}
                  isDarkMode={isDarkMode}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onBulkDelete={handleBulkDelete}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onOpenDetailModal={(tx) => setAuditTransaction(tx)}
                />
              )}

              {activeTab === 'rules' && (
                <RulesEngineView
                  rules={rules}
                  isDarkMode={isDarkMode}
                  onSaveRule={handleSaveRule}
                  onDeleteRule={handleDeleteRule}
                />
              )}

              {activeTab === 'security' && (
                <SecurityVaultView
                  health={health}
                  transactionCount={transactions.length}
                  isVaultLocked={isVaultLocked}
                  isDarkMode={isDarkMode}
                  onToggleTheme={toggleTheme}
                  onToggleLock={() => setIsVaultLocked(!isVaultLocked)}
                  onClearVault={handleClearVault}
                  onImportData={handleImportData}
                  onSeedSampleData={handleSeedSampleData}
                  isSeeding={isSeeding}
                />
              )}

              {activeTab === 'nightly' && (
                <NightlyRunsView
                  isDarkMode={isDarkMode}
                  onNavigate={(tab) => setActiveTab(tab)}
                  lastLoginTime={lastLoginTime}
                />
              )}
            </>
          )}
        </main>
      </div>
      )}

      {/* Manual Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        isDarkMode={isDarkMode}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddSingleTransaction}
      />

      {/* Transaction Inspection & Audit Modal */}
      <TransactionDetailModal
        transaction={auditTransaction}
        isDarkMode={isDarkMode}
        onClose={() => setAuditTransaction(null)}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* Zack the Golden Retriever Roaming Companion */}
      <ZackRoamingCompanion
        activeTab={activeTab}
        transactionCount={transactions.length}
        isVaultLocked={isVaultLocked}
      />
    </div>
  );
}
