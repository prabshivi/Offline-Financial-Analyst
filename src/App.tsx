import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { BudgetTrackerView } from './components/BudgetTrackerView';
import { IngestionView } from './components/IngestionView';
import { MasterLedgerView } from './components/MasterLedgerView';
import { RulesEngineView } from './components/RulesEngineView';
import { SecurityVaultView } from './components/SecurityVaultView';
import { DebtPayoffView } from './components/DebtPayoffView';
import { RecurringSubscriptionsView } from './components/RecurringSubscriptionsView';
import { NightlyRunsView } from './components/NightlyRunsView';
import { AutoFetchView } from './components/AutoFetchView';
import { ReportsAnalyticsView } from './components/ReportsAnalyticsView';
import { TaxPlannerView } from './components/TaxPlannerView';
import { DomainSettingsView } from './components/DomainSettingsView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { VaultLockScreen } from './components/VaultLockScreen';
import { ZackRoamingCompanion } from './components/ZackRoamingCompanion';
import { Transaction, Rule, VaultHealth, StagingTransaction, VaultStats, AIStatementProfile } from './types';
import { api } from './utils/api';
import { DEFAULT_RULES } from './utils/categorizer';
import { getActiveStatementProfile } from './utils/statementProfileManager';
import { getTabFromLocation, syncRouteToHistory } from './utils/router';
import { isSiteEnabled, getAppDomain, isPageEnabled } from './utils/envConfig';
import { Globe, Lock, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('vault_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // Default to dark mode
  });

  // Multi-page routing: initialize active tab directly from browser location/path
  const [activeTab, setActiveTab] = useState<string>(() => getTabFromLocation());
  const [statementProfile, setStatementProfile] = useState<AIStatementProfile>(() => getActiveStatementProfile());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [health, setHealth] = useState<VaultHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [auditTransaction, setAuditTransaction] = useState<Transaction | null>(null);
  const [loginAuditToast, setLoginAuditToast] = useState<string | null>(null);
  const [siteEnabledOverride, setSiteEnabledOverride] = useState<boolean>(isSiteEnabled());
  const [lastLoginTime, setLastLoginTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Seamless URL navigation handler that updates browser history
  const handleNavigate = useCallback((tab: string) => {
    if (!isPageEnabled(tab)) {
      tab = 'dashboard';
    }
    setActiveTab(tab);
    syncRouteToHistory(tab);
  }, []);

  // Listen to browser Back/Forward buttons (popstate) and hash changes
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromLocation();
      setActiveTab(tab);
    };

    // Sync initial route path on initial mount
    syncRouteToHistory(activeTab);

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [activeTab]);

  // Apply dark mode class to root document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vault_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDarkMode = theme === 'dark';

  // Load Initial Vault Data from SQLite Server
  const loadVaultData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [txs, rls, hlt] = await Promise.all([
        api.getTransactions(),
        api.getRules(),
        api.getHealth()
      ]);

      setTransactions(txs);
      if (rls && rls.length > 0) {
        setRules(rls);
      }
      setHealth(hlt);
      setStatementProfile(getActiveStatementProfile());
    } catch (err) {
      console.error('Failed to load vault data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  // Handler for successful authentication unlock
  const handleUnlockVault = () => {
    setIsVaultLocked(false);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastLoginTime(now);
    setLoginAuditToast(`Vault Unlocked at ${now} • Zero-Cloud Integrity Verified`);
  };

  // Seed Realistic Bank Demo Statement Data
  const handleSeedSampleData = async () => {
    try {
      setIsSeeding(true);
      const seeded = await api.seedSampleData();
      await loadVaultData();
      setStatementProfile(getActiveStatementProfile());
      return seeded;
    } catch (err) {
      console.error('Failed to seed sample data:', err);
      return [];
    } finally {
      setIsSeeding(false);
    }
  };

  // Compute Live Telemetry & Vault Stats
  const vaultStats = useMemo<VaultStats>(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    const categoryTotals: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amount = Number(tx.amount) || 0;
      if (tx.is_income || amount > 0) {
        totalInflow += Math.abs(amount);
      } else {
        const val = Math.abs(amount);
        totalOutflow += val;
        const cat = tx.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
      }
    });

    const netSavings = totalInflow - totalOutflow;
    const savingsRate = totalInflow > 0 ? Math.max(0, Math.round((netSavings / totalInflow) * 100)) : 0;

    let topCategory = 'None';
    let topCategoryAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, sum]) => {
      if (sum > topCategoryAmount) {
        topCategoryAmount = sum;
        topCategory = cat;
      }
    });

    return {
      totalBalance: netSavings,
      totalIncome: totalInflow,
      totalExpenses: totalOutflow,
      savingsRate,
      topCategory,
      topCategoryAmount,
      transactionCount: transactions.length
    };
  }, [transactions]);

  // Single transaction addition
  const handleAddSingleTransaction = async (tx: Partial<Transaction>) => {
    const res = await api.saveTransactions([tx]);
    await loadVaultData();
    return res;
  };

  // Batch commit staging transactions from Statement Ingestion
  const handleCommitTransactions = async (stagingItems: StagingTransaction[]) => {
    const itemsToCommit: Partial<Transaction>[] = stagingItems.map((st) => ({
      date: st.date,
      raw_description: st.raw_description || '',
      clean_merchant: st.clean_merchant || '',
      amount: st.amount,
      category: st.category,
      account_name: st.account_name || 'Primary Financial Account',
      institution: st.institution || 'Primary Institution',
      type: st.type || (st.amount > 0 ? 'inflow' : 'outflow'),
      notes: st.notes || undefined,
      tags: st.tags || undefined
    }));

    const result = await api.saveTransactions(itemsToCommit);
    await loadVaultData();
    setStatementProfile(getActiveStatementProfile());
    return { inserted: result.inserted, duplicates: result.duplicates };
  };

  // Update existing transaction
  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const updated = await api.updateTransaction(id, updates);
    await loadVaultData();
    return updated;
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

  // Remove artificial site blocking gate and render app directly
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-300 transition-colors duration-200">
      {/* Top Application Header */}
      <Header
        health={health}
        transactionCount={transactions.length}
        isVaultLocked={isVaultLocked}
        isDarkMode={isDarkMode}
        activeTab={activeTab}
        statementProfile={statementProfile}
        onToggleTheme={toggleTheme}
        onToggleLock={() => setIsVaultLocked(!isVaultLocked)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onSeedSampleData={handleSeedSampleData}
        onNavigate={handleNavigate}
        isSeeding={isSeeding}
      />

      {isVaultLocked ? (
        /* Clean Minimalist Login Screen without menu items or sidebar */
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-medium text-slate-400 font-mono">Loading Financial Vault...</p>
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
            onSelectTab={handleNavigate}
            transactionCount={transactions.length}
            health={health}
            isVaultLocked={isVaultLocked}
            isDarkMode={isDarkMode}
            statementProfile={statementProfile}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-medium text-slate-400 font-mono">Loading Financial Vault...</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    transactions={transactions}
                    stats={vaultStats}
                    isDarkMode={isDarkMode}
                    statementProfile={statementProfile}
                    onNavigate={handleNavigate}
                    onOpenAddModal={() => setIsAddModalOpen(true)}
                    onSeedSampleData={handleSeedSampleData}
                    onOpenDetailModal={(tx) => setAuditTransaction(tx)}
                  />
                )}

                {activeTab === 'budget' && (
                  <BudgetTrackerView
                    transactions={transactions}
                    isDarkMode={isDarkMode}
                    statementProfile={statementProfile}
                    onNavigate={handleNavigate}
                    onOpenDetailModal={(tx) => setAuditTransaction(tx)}
                  />
                )}

                {activeTab === 'subscriptions' && (
                  <RecurringSubscriptionsView
                    transactions={transactions}
                    isDarkMode={isDarkMode}
                    statementProfile={statementProfile}
                    onNavigate={handleNavigate}
                    onOpenDetailModal={(tx) => setAuditTransaction(tx)}
                  />
                )}

                {activeTab === 'debt-payoff' && (
                  <DebtPayoffView
                    isDarkMode={isDarkMode}
                    onNavigate={handleNavigate}
                  />
                )}

                {activeTab === 'ingestion' && (
                  <IngestionView
                    existingTransactions={transactions}
                    isDarkMode={isDarkMode}
                    statementProfile={statementProfile}
                    onCommitTransactions={handleCommitTransactions}
                    onNavigate={handleNavigate}
                    onRefreshAllData={loadVaultData}
                  />
                )}

                {activeTab === 'ledger' && (
                  <MasterLedgerView
                    transactions={transactions}
                    isDarkMode={isDarkMode}
                    statementProfile={statementProfile}
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

                {activeTab === 'reports' && (
                  <ReportsAnalyticsView
                    transactions={transactions}
                    isDarkMode={isDarkMode}
                    statementProfile={statementProfile}
                    onNavigate={handleNavigate}
                    onOpenDetailModal={(tx) => setAuditTransaction(tx)}
                  />
                )}

                {activeTab === 'tax-planner' && (
                  <TaxPlannerView
                    transactions={transactions}
                    isDarkMode={isDarkMode}
                    statementProfile={statementProfile}
                    onNavigate={handleNavigate}
                  />
                )}

                {activeTab === 'auto-fetch' && (
                  <AutoFetchView
                    onRefreshAllData={loadVaultData}
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
                    onNavigate={handleNavigate}
                    lastLoginTime={lastLoginTime}
                  />
                )}

                {activeTab === 'domain-settings' && (
                  <DomainSettingsView
                    isDarkMode={isDarkMode}
                    onRefreshNavigation={() => {
                      loadVaultData();
                    }}
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
    </div>
  );
}
