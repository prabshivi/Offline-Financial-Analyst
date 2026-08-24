import { Transaction, Rule, VaultHealth, AutoFetchStatus, StatementType } from '../types';

export const api = {
  async getHealth(): Promise<VaultHealth> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return {
        status: 'local_mode',
        dbPath: 'data/vault.db',
        dbSizeBytes: 12288,
        transactionCount: 0,
        ruleCount: 14,
        localOnly: true,
        timestamp: new Date().toISOString()
      };
    }
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return await res.json();
    } catch (e) {
      console.warn('API error, reading from local cache:', e);
      const cached = localStorage.getItem('vault_tx_backup');
      return cached ? JSON.parse(cached) : [];
    }
  },

  async saveTransactions(transactions: Partial<Transaction>[]): Promise<{ inserted: number; duplicates: number; total: number }> {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save transactions');
    }
    return await res.json();
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<boolean> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.ok;
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  async bulkDeleteTransactions(ids: string[]): Promise<number> {
    const res = await fetch('/api/transactions/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    const data = await res.json();
    return data.count || 0;
  },

  async clearVault(): Promise<boolean> {
    const res = await fetch('/api/vault/clear', { method: 'POST' });
    return res.ok;
  },

  async seedSampleData(): Promise<{ inserted: number; duplicates: number }> {
    const res = await fetch('/api/seed-sample-data', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed sample data');
    return await res.json();
  },

  async getRules(): Promise<Rule[]> {
    try {
      const res = await fetch('/api/rules');
      if (!res.ok) throw new Error('Failed to fetch rules');
      return await res.json();
    } catch {
      return [];
    }
  },

  async saveRule(rule: Partial<Rule>): Promise<Rule> {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    return await res.json();
  },

  async deleteRule(id: string): Promise<boolean> {
    const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  async aiCategorize(descriptions: string[]): Promise<{ description: string; category: string; clean_merchant: string }[]> {
    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptions })
      });
      const data = await res.json();
      return data.categories || [];
    } catch {
      return [];
    }
  },

  async importData(format: 'json' | 'base64_db', data: any): Promise<any> {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, data })
    });
    return await res.json();
  },

  async parseDocument(params: {
    fileName: string;
    fileType: string;
    base64Data?: string;
    textContent?: string;
    institution?: string;
    accountName?: string;
  }): Promise<{ success: boolean; method: string; transactions?: Partial<Transaction>[]; textToParse?: string; statementType?: StatementType }> {
    const res = await fetch('/api/documents/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error('Document parsing failed');
    }
    return await res.json();
  },

  async getAutoFetchStatus(): Promise<AutoFetchStatus> {
    try {
      const res = await fetch('/api/auto-fetch/status');
      if (!res.ok) throw new Error('Failed to get auto-fetch status');
      return await res.json();
    } catch {
      return {
        enabled: true,
        dropzonePath: 'data/dropzone',
        pendingFilesCount: 0,
        pendingFiles: [],
        processedFilesCount: 0,
        webhookUrl: '/api/auto-fetch/webhook',
        webhookToken: 'vault-auto-sync-key-8891',
        lastScanTime: new Date().toISOString(),
        scanIntervalMinutes: 30,
        totalAutomatedTransactions: 0,
        logs: []
      };
    }
  },

  async scanDropzone(): Promise<{
    success: boolean;
    filesScanned: number;
    totalExtracted: number;
    totalInserted: number;
    duplicates: number;
    results: any[];
  }> {
    const res = await fetch('/api/auto-fetch/scan', { method: 'POST' });
    if (!res.ok) throw new Error('Dropzone scan failed');
    return await res.json();
  },

  async simulateDropzoneFile(institution = 'RBC Royal Bank'): Promise<any> {
    const res = await fetch('/api/auto-fetch/simulate-drop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution })
    });
    if (!res.ok) throw new Error('Simulation failed');
    return await res.json();
  },

  async updateAutoFetchConfig(config: { enabled?: boolean; scanIntervalMinutes?: number }): Promise<any> {
    const res = await fetch('/api/auto-fetch/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return await res.json();
  },

  async clearAutoFetchLogs(): Promise<boolean> {
    const res = await fetch('/api/auto-fetch/clear-logs', { method: 'POST' });
    return res.ok;
  }
};
