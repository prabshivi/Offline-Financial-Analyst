import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Lock, 
  Unlock, 
  Key, 
  FileCode, 
  CheckCircle2, 
  HardDrive, 
  AlertTriangle, 
  Sparkles,
  RefreshCw,
  FolderLock,
  Moon,
  Sun
} from 'lucide-react';
import { VaultHealth } from '../types';

interface SecurityVaultViewProps {
  health: VaultHealth | null;
  transactionCount: number;
  isVaultLocked: boolean;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onToggleLock: () => void;
  onClearVault: () => Promise<boolean>;
  onImportData: (format: 'json' | 'base64_db', data: any) => Promise<any>;
  onSeedSampleData: () => void;
  isSeeding: boolean;
}

export const SecurityVaultView: React.FC<SecurityVaultViewProps> = ({
  health,
  transactionCount,
  isVaultLocked,
  isDarkMode = true,
  onToggleTheme,
  onToggleLock,
  onClearVault,
  onImportData,
  onSeedSampleData,
  isSeeding
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState<string>(() => localStorage.getItem('vault_passcode') || '1234');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [showPassphraseSaved, setShowPassphraseSaved] = useState(false);
  const dbFileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '12.4 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        setImportStatus('Restoring SQLite database...');
        const res = await onImportData('base64_db', base64);
        setImportStatus(`Successfully restored ${res.total || 'all'} records from database.`);
      } catch (err: any) {
        setImportStatus(`Import failed: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const json = JSON.parse(text);
        setImportStatus('Importing transactions from JSON...');
        const res = await onImportData('json', json);
        setImportStatus(`Successfully restored ${res.inserted || 0} transactions (${res.duplicates || 0} duplicates skipped).`);
      } catch (err: any) {
        setImportStatus(`JSON import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSavePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphraseInput.trim()) return;
    localStorage.setItem('vault_passcode', passphraseInput.trim());
    setPassphrase(passphraseInput.trim());
    setPassphraseInput('');
    setShowPassphraseSaved(true);
    setTimeout(() => setShowPassphraseSaved(false), 3000);
  };

  const handleWipeVault = async () => {
    if (window.confirm('⚠️ Are you sure you want to erase all transactions from your local SQLite database?')) {
      await onClearVault();
      setImportStatus('Vault wiped successfully.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Privacy, Security & Backups
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            100% on-device SQLite storage. Export your data, download raw database files, or set a PIN lock.
          </p>
        </div>

        <button
          onClick={onToggleLock}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs ${
            isVaultLocked
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
          }`}
        >
          {isVaultLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          {isVaultLocked ? 'Vault is Currently Locked' : 'Vault is Unlocked'}
        </button>
      </div>

      {importStatus && (
        <div className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{importStatus}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="text-slate-400 hover:text-white text-sm">
            &times;
          </button>
        </div>
      )}

      {/* Storage Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2 transition-colors">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Database Engine</span>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-base font-bold text-slate-900 dark:text-white font-mono">SQLite (Local Storage)</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">File location: <code className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">data/vault.db</code></p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2 transition-colors">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Database Size</span>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            {formatBytes(health?.dbSizeBytes || 12288)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{transactionCount} permanent financial records</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2 transition-colors">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Privacy Guarantee</span>
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-base">
            <ShieldCheck className="w-5 h-5" /> 100% Private
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Your financial numbers are never uploaded to external servers</p>
        </div>
      </div>

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-slate-800 dark:text-slate-200" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Download Backups</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export a copy of your records anytime. You can download the complete database file or structured JSON.
          </p>

          <div className="space-y-3 pt-1">
            <a
              href="/api/export/db"
              download="vault.db"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-slate-900 dark:text-white">Download Raw SQLite Database (.db)</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Compatible with SQLite viewers, Python, and spreadsheets</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </a>

            <a
              href="/api/export/json"
              download="vault_transactions.json"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-slate-900 dark:text-white">Download JSON Master Ledger</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Portable structured text format</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </a>
          </div>
        </div>

        {/* Restore */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-slate-800 dark:text-slate-200" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Restore from Backup</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Restore an existing SQLite <code className="font-mono text-emerald-600 dark:text-emerald-400">vault.db</code> file or JSON ledger backup:
          </p>

          <input
            type="file"
            ref={dbFileInputRef}
            onChange={handleDbUpload}
            accept=".db,.sqlite,.sqlite3"
            className="hidden"
          />

          <input
            type="file"
            ref={jsonFileInputRef}
            onChange={handleJsonUpload}
            accept=".json"
            className="hidden"
          />

          <div className="space-y-3 pt-1">
            <button
              onClick={() => dbFileInputRef.current?.click()}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 text-xs font-semibold text-left"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-slate-900 dark:text-white">Restore SQLite Database (.db)</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Upload a previously exported database file</p>
                </div>
              </div>
              <Upload className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </button>

            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 text-xs font-semibold text-left"
            >
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-slate-900 dark:text-white">Import Transactions from JSON</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Merges records with automatic duplicate prevention</p>
                </div>
              </div>
              <Upload className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Security PIN Lock, Appearance & Reset Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Passcode Setting */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Quick Lock PIN</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set a 4-digit PIN to lock your screen when stepping away:
          </p>

          <form onSubmit={handleSavePasscode} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="password"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder="PIN (default: 1234)"
                className="flex-1 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-emerald-500"
              >
                Save
              </button>
            </div>
            {showPassphraseSaved && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> PIN saved successfully!
              </p>
            )}
          </form>
        </div>

        {/* Theme Preference */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Theme & Contrast</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Switch between high-contrast Dark Mode and classic Light Mode:
          </p>

          <div className="pt-1">
            <button
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2">
                {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>Active: {isDarkMode ? 'Dark Mode (Active)' : 'Light Mode (Active)'}</span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Toggle</span>
            </button>
          </div>
        </div>

        {/* Reset Database */}
        <div className="bg-rose-50/60 dark:bg-rose-950/30 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h3 className="font-bold text-rose-950 dark:text-rose-200 text-sm">Reset Vault</h3>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            Erase records or reload demo financial dataset:
          </p>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={handleWipeVault}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>

            <button
              onClick={onSeedSampleData}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-slate-800 text-rose-900 dark:text-rose-200 text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              {isSeeding ? 'Seeding...' : 'Reload Demo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
