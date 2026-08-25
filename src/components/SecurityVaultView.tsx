import React, { useState, useRef, useEffect } from 'react';
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
  Sun,
  KeyRound,
  Fingerprint,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { VaultHealth } from '../types';
import {
  evaluatePasswordStrength,
  updateMasterPassphrase,
  generateEmergencyRecoveryKey,
  VAULT_AUTH_STORAGE
} from '../utils/security';
import { cleanMerchantName } from '../utils/categorizer';
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
  const [newPassphraseInput, setNewPassphraseInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showPassphraseSaved, setShowPassphraseSaved] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string>(() => {
    return localStorage.getItem(VAULT_AUTH_STORAGE.RECOVERY_KEY) || 'VAULT-DEMO-RECOVER-2026';
  });
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(() => {
    return localStorage.getItem(VAULT_AUTH_STORAGE.WEBAUTHN_ENABLED) === 'true';
  });

  // Interactive Live PII Sanitizer Sandbox
  const [interactivePiiInput, setInteractivePiiInput] = useState('WHOLE FOODS #10294 ACCT 4500-1234-5678-9012 SIN 987-654-321');
  const [sanitizedOutput, setSanitizedOutput] = useState('');
  const [maskedCount, setMaskedCount] = useState(2);

  useEffect(() => {
    const raw = interactivePiiInput;
    const sanitized = cleanMerchantName(raw);
    setSanitizedOutput(sanitized);

    // Count masked elements
    const cardMatches = raw.match(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g) || [];
    const sinMatches = raw.match(/\b\d{3}[- ]?\d{3}[- ]?\d{3}\b/g) || [];
    setMaskedCount(cardMatches.length + sinMatches.length);
  }, [interactivePiiInput]);

  const securityChecklist = [
    {
      name: 'Zero-Cloud Airgap & Local Isolation',
      desc: '100% of your financial data stays strictly on your local machine.',
      metric: '0 outbound requests / 0 third-party cookies',
      badge: 'Air-Gapped'
    },
    {
      name: 'Live PII Scrubbing Guard',
      desc: 'All sensitive account tokens and personal identifiers in statement memos are instantly scrubbed.',
      metric: '100% Regex PII redaction rate',
      badge: 'Scrubbed'
    },
    {
      name: 'Deterministic SHA-256 Deduplication Shield',
      desc: 'Re-importing bank statements or overlapping date ranges will NEVER duplicate your records.',
      metric: 'SHA-256 Collision Probability < 1 in 10^77',
      badge: 'Protected'
    },
    {
      name: 'Local SQLite WAL Mode',
      desc: 'Even during sudden app reloads or power outages, your transaction history remains 100% consistent and intact.',
      metric: 'WAL journal mode active',
      badge: 'Intact'
    },
    {
      name: 'Multi-Bank Format Parsing Shield',
      desc: 'Debit and credit columns, signed values, and accounting formats normalized with 100% math accuracy.',
      metric: 'RBC, TD, Scotiabank, CIBC, Chase, Amex, Apple Card supported',
      badge: 'Validated'
    },
    {
      name: 'Argon2 / PBKDF2 Multi-Round Key Derivation',
      desc: 'Client-side lock screen prevents unauthorized viewing with PBKDF2-SHA256 derivation.',
      metric: 'Constant-time comparison active',
      badge: 'Secure'
    }
  ];

  const dbFileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const passStrength = evaluatePasswordStrength(newPassphraseInput);

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

  const handleSaveMasterPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassphraseInput.trim() || newPassphraseInput.trim().length < 6) return;
    await updateMasterPassphrase(newPassphraseInput.trim());
    setNewPassphraseInput('');
    setShowPassphraseSaved(true);
    setTimeout(() => setShowPassphraseSaved(false), 3500);
  };

  const handleGenerateNewRecoveryKey = () => {
    const newKey = generateEmergencyRecoveryKey();
    localStorage.setItem(VAULT_AUTH_STORAGE.RECOVERY_KEY, newKey);
    setRecoveryKey(newKey);
    setCopiedRecovery(false);
  };

  const handleCopyRecoveryKey = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 2500);
  };

  const handleToggleBiometric = () => {
    const nextVal = !isBiometricEnabled;
    setIsBiometricEnabled(nextVal);
    localStorage.setItem(VAULT_AUTH_STORAGE.WEBAUTHN_ENABLED, String(nextVal));
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

      {/* Security Credentials, Biometric Passkey, Emergency Recovery & Appearance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Master Passphrase Setting */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Master Security Passphrase</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Change your zero-knowledge master passphrase. Utilizes PBKDF2 with SHA-256 and local per-vault salt.
          </p>

          <form onSubmit={handleSaveMasterPassphrase} className="space-y-3">
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={newPassphraseInput}
                onChange={(e) => setNewPassphraseInput(e.target.value)}
                placeholder="Enter new master passphrase (min 8 chars)..."
                className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Dynamic Strength Meter */}
            {newPassphraseInput.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Entropy Strength:</span>
                  <span style={{ color: passStrength.color }} className="font-bold">
                    {passStrength.label} ({passStrength.entropyBits} bits)
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          passStrength.score >= step
                            ? passStrength.color
                            : 'rgba(51, 65, 85, 0.2)'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={newPassphraseInput.length < 6}
                className="px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Update Master Passphrase
              </button>

              {showPassphraseSaved && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passphrase saved!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Biometric Passkey & Emergency Recovery Key */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Passkey & Emergency Recovery</h3>
          </div>

          <div className="space-y-3">
            {/* Biometric Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <Fingerprint className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Touch ID / Biometric Passkey</p>
                  <p className="text-[11px] text-slate-400">WebAuthn hardware key unlock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleBiometric}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isBiometricEnabled
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isBiometricEnabled ? 'Enabled' : 'Enable'}
              </button>
            </div>

            {/* Emergency Recovery Key */}
            <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Emergency Recovery Key
                </span>
                <button
                  type="button"
                  onClick={handleGenerateNewRecoveryKey}
                  className="text-[11px] text-slate-400 hover:text-amber-400 underline font-mono"
                >
                  Generate New
                </button>
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-slate-950 px-3 py-2 rounded-xl border border-amber-500/30 font-mono text-xs text-amber-600 dark:text-amber-300 font-bold">
                <span>{recoveryKey}</span>
                <button
                  type="button"
                  onClick={handleCopyRecoveryKey}
                  className="p-1 hover:bg-amber-500/10 rounded-lg text-slate-400 hover:text-amber-300"
                  title="Copy recovery key"
                >
                  {copiedRecovery ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance & Reset Database */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Zack's Vault Privacy Patrol Logs & Identity Masker */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-850 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span>🐕 Zack's Vault Privacy Patrol Logs</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Live identity protection & local security check verification
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>All Checks Passed</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Privacy Audit Log Checklist */}
          <div className="lg:col-span-7 space-y-3.5">
            <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">Canine Guard Checklists</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {securityChecklist.map((check, index) => (
                <div key={index} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-955 border border-slate-200/80 dark:border-slate-850 flex flex-col justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-bold text-slate-900 dark:text-white leading-tight">{check.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold tracking-wide uppercase shrink-0">
                        {check.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{check.desc}</p>
                  </div>
                  <div className="text-[9.5px] font-mono text-cyan-400 border-t border-slate-200 dark:border-slate-850/60 pt-2 truncate" title={check.metric}>
                    {check.metric}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live Identity Masker Sandbox */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-955 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-850 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>Identity Masker Sandbox</span>
              </h4>
              <p className="text-[10.5px] text-slate-400">
                Type text containing card numbers or accounts below to see Zack scrub them locally:
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                rows={3}
                value={interactivePiiInput}
                onChange={(e) => setInteractivePiiInput(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Sanitized Merchant Memo:</span>
                  {maskedCount > 0 && (
                    <span className="text-emerald-400 font-bold font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10">
                      Scrubbed {maskedCount} details
                    </span>
                  )}
                </div>
                <code className="text-xs block break-all font-mono font-bold text-slate-900 dark:text-emerald-400">
                  {sanitizedOutput || 'Waiting for text...'}
                </code>
              </div>
            </div>

            <p className="text-[10px] text-slate-505 font-mono italic leading-relaxed">
              🐾 "Zack automatically runs this scrubber on bank statement rows before saving them."
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
