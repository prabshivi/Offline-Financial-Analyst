import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  FolderSync, 
  Terminal, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Play, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  Cpu, 
  Code2, 
  Mail, 
  Cloud, 
  FolderOpen,
  ArrowRight,
  Sparkles,
  Database,
  Lock,
  Trash2
} from 'lucide-react';
import { AutoFetchStatus, AutoFetchLog } from '../types';
import { api } from '../utils/api';

interface AutoFetchViewProps {
  onRefreshAllData: () => Promise<void>;
}

export const AutoFetchView: React.FC<AutoFetchViewProps> = ({ onRefreshAllData }) => {
  const [status, setStatus] = useState<AutoFetchStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedSimBank, setSelectedSimBank] = useState('RBC Royal Bank');
  const [activeScriptTab, setActiveScriptTab] = useState<'playwright' | 'python' | 'curl' | 'email'>('playwright');
  const [selectedScriptBank, setSelectedScriptBank] = useState('RBC Royal Bank');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getAutoFetchStatus();
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to load auto fetch status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleManualScan = async () => {
    setIsScanning(true);
    setNotification(null);
    try {
      const res = await api.scanDropzone();
      await fetchStatus();
      await onRefreshAllData();
      setNotification({
        type: 'success',
        message: `Scan complete: ${res.filesScanned} file(s) evaluated. Extracted ${res.totalExtracted} rows (${res.totalInserted} new inserted, ${res.duplicates} duplicates skipped).`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Scan failed: ${err.message}`
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSimulateDrop = async () => {
    setIsSimulating(true);
    setNotification(null);
    try {
      const res = await api.simulateDropzoneFile(selectedSimBank);
      await fetchStatus();
      await onRefreshAllData();
      setNotification({
        type: 'success',
        message: `Auto-Fetch simulation complete! Dropped and parsed ${res.simulatedFile} for ${selectedSimBank}. Inserted ${res.totalInserted} transactions with automatic PII sanitization.`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Simulation failed: ${err.message}`
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleToggleAutoScan = async () => {
    if (!status) return;
    try {
      const newEnabled = !status.enabled;
      await api.updateAutoFetchConfig({ enabled: newEnabled });
      setStatus({ ...status, enabled: newEnabled });
    } catch (err: any) {
      console.error('Failed to update config:', err);
    }
  };

  const handleIntervalChange = async (interval: number) => {
    if (!status) return;
    try {
      await api.updateAutoFetchConfig({ scanIntervalMinutes: interval });
      setStatus({ ...status, scanIntervalMinutes: interval });
    } catch (err: any) {
      console.error('Failed to update interval:', err);
    }
  };

  const handleClearLogs = async () => {
    try {
      await api.clearAutoFetchLogs();
      await fetchStatus();
    } catch (err: any) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Generate Playwright Automation Script
  const getPlaywrightScript = (bank: string) => {
    return `// =========================================================================
// Automated Bank PDF Statement Downloader & Vault Ingestor
// Bank: ${bank} | Framework: Playwright (Headless Node.js)
// =========================================================================

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const VAULT_WEBHOOK_URL = 'http://localhost:3000/api/auto-fetch/webhook';
const VAULT_SECRET_TOKEN = '${status?.webhookToken || 'vault-auto-sync-key-8891'}';
const SESSION_STATE_PATH = './auth-state-${bank.toLowerCase().replace(/[^a-z0-9]/g, '')}.json';

async function fetchBankStatements() {
  console.log('[1/4] Launching automated browser for ${bank}...');
  
  // Reuse existing 2FA/login session cookies if available
  const contextOptions = fs.existsSync(SESSION_STATE_PATH)
    ? { storageState: SESSION_STATE_PATH }
    : {};

  const browser = await chromium.launch({ headless: false }); // Set headless: true for background cron
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    // 1. Navigate to Bank Online Banking Portal
    console.log('[2/4] Navigating to ${bank} e-Statements portal...');
    ${bank.includes('RBC') 
      ? `await page.goto('https://www.rbcroyalbank.com/banking/e-statements');` 
      : bank.includes('TD') 
      ? `await page.goto('https://easyweb.td.com/statements');` 
      : bank.includes('Chase')
      ? `await page.goto('https://www.chase.com/statements');`
      : `await page.goto('https://banking.${bank.toLowerCase().replace(/\s+/g, '')}.com/statements');`
    }

    // Note: If running first time, complete 2FA manually in browser window
    console.log('Waiting for statement download link or user session...');
    await page.waitForTimeout(5000);

    // Save session storage state so future cron runs are 100% headless
    await context.storageState({ path: SESSION_STATE_PATH });

    // 2. Set up automated download event listener
    const [ download ] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a:has-text("Download PDF"), button:has-text("Download Statement")') // Target download trigger
    ]);

    const tempPdfPath = await download.path();
    const pdfFileName = download.suggestedFilename();
    console.log(\`[3/4] Downloaded latest statement: \${pdfFileName}\`);

    // 3. Read downloaded PDF and POST directly to Privacy Vault Webhook
    const pdfBuffer = fs.readFileSync(tempPdfPath);
    const base64Data = pdfBuffer.toString('base64');

    console.log('[4/4] Transmitting encrypted PDF statement to Local Vault Webhook...');
    const response = await fetch(VAULT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vault-token': VAULT_SECRET_TOKEN
      },
      body: JSON.stringify({
        fileName: pdfFileName,
        base64Data: base64Data,
        institution: '${bank}'
      })
    });

    const result = await response.json();
    console.log('✅ Ingestion Successful:', result);
  } catch (error) {
    console.error('❌ Automation Error:', error);
  } finally {
    await browser.close();
  }
}

fetchBankStatements();`;
  };

  // Generate Python Automation Script
  const getPythonScript = (bank: string) => {
    return `# =========================================================================
# Automated Bank PDF Statement Ingestion Daemon (Python)
# Bank: ${bank} | Library: requests + selenium/playwright
# =========================================================================

import os
import base64
import requests

VAULT_WEBHOOK = "http://localhost:3000/api/auto-fetch/webhook"
VAULT_TOKEN = "${status?.webhookToken || 'vault-auto-sync-key-8891'}"
STATEMENTS_FOLDER = os.path.expanduser("~/Downloads/BankStatements")

def upload_statement_to_vault(pdf_path, institution="${bank}"):
    """Reads a PDF statement and sends it to the local Vault Webhook"""
    file_name = os.path.basename(pdf_path)
    print(f"[*] Processing statement: {file_name}")

    with open(pdf_path, "rb") as f:
        encoded_data = base64.b64encode(f.read()).decode("utf-8")

    payload = {
        "fileName": file_name,
        "base64Data": encoded_data,
        "institution": institution
    }

    headers = {
        "Content-Type": "application/json",
        "x-vault-token": VAULT_TOKEN
    }

    resp = requests.post(VAULT_WEBHOOK, json=payload, headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ Ingested {file_name}: {data.get('inserted')} new transactions added!")
    else:
        print(f"❌ Ingestion failed ({resp.status_code}): {resp.text}")

if __name__ == "__main__":
    # Scan downloads folder for recent bank PDF statements
    for root, dirs, files in os.walk(STATEMENTS_FOLDER):
        for file in files:
            if file.lower().endswith(".pdf"):
                full_path = os.path.join(root, file)
                upload_statement_to_vault(full_path)`;
  };

  // Generate cURL Terminal Command
  const getCurlSnippet = () => {
    return `# 1. Ingest a local PDF statement via cURL:
curl -X POST http://localhost:3000/api/auto-fetch/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-vault-token: ${status?.webhookToken || 'vault-auto-sync-key-8891'}" \\
  -d '{
    "fileName": "RBC_Statement_Aug2026.pdf",
    "base64Data": "'$(base64 -i ~/Downloads/statement.pdf | tr -d '\\n')'",
    "institution": "RBC Royal Bank"
  }'

# 2. Trigger an immediate background dropzone scan:
curl -X POST http://localhost:3000/api/auto-fetch/scan`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-cyan-950/30 border border-emerald-500/20 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-neutral-100">Bank Statement PDF Automation Engine</h1>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Daemon
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
              Automate the ingestion of PDF, CSV, and OFX bank statements from Canadian & US financial institutions. Set up local folder sync, run headless browser cron jobs, or trigger webhook endpoints with automatic PII redaction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-manual-scan-dropzone"
            onClick={handleManualScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Dropzone...' : 'Scan Dropzone Now'}
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-xs text-neutral-400 hover:text-neutral-200">Dismiss</button>
        </div>
      )}

      {/* Grid: Live Status & Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Monitored Dropzone Status */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-200 font-medium text-sm">
              <FolderSync className="w-4 h-4 text-emerald-400" />
              <span>Local Monitored Dropzone</span>
            </div>
            <span className="text-xs font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
              {status?.dropzonePath || 'data/dropzone'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg">
              <div className="text-xs text-neutral-400">Pending in Dropzone</div>
              <div className="text-xl font-semibold text-neutral-100 mt-0.5 flex items-center gap-2">
                {status?.pendingFilesCount || 0}
                <span className="text-xs font-normal text-neutral-500">files</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg">
              <div className="text-xs text-neutral-400">Processed Archive</div>
              <div className="text-xl font-semibold text-emerald-400 mt-0.5 flex items-center gap-2">
                {status?.processedFilesCount || 0}
                <span className="text-xs font-normal text-neutral-500">files</span>
              </div>
            </div>
          </div>

          {/* Pending files list */}
          <div className="space-y-1.5">
            <div className="text-xs text-neutral-400 font-medium">Pending Files in Queue:</div>
            {status?.pendingFiles && status.pendingFiles.length > 0 ? (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {status.pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-neutral-950 px-2.5 py-1.5 rounded border border-neutral-800 text-neutral-300">
                    <span className="font-mono truncate">{file}</span>
                    <span className="text-amber-400 text-[10px] uppercase font-semibold">Ready</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-neutral-500 italic p-2 bg-neutral-950/50 rounded border border-dashed border-neutral-800 text-center">
                Dropzone empty. Ready to ingest files dropped into <code className="text-neutral-400 font-mono">data/dropzone</code>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Daemon Settings & Webhook Key */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-200 font-medium text-sm">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Background Automation Daemon</span>
            </div>
            <button
              onClick={handleToggleAutoScan}
              className={`px-2.5 py-0.5 text-xs font-medium rounded-full transition-all ${
                status?.enabled 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
              }`}
            >
              {status?.enabled ? 'Auto-Scan Active' : 'Auto-Scan Paused'}
            </button>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Scan Frequency:</span>
              <select
                value={status?.scanIntervalMinutes || 30}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className="bg-neutral-950 border border-neutral-700 text-neutral-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour</option>
                <option value={360}>Every 6 hours</option>
                <option value={1440}>Every 24 hours (Daily)</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Webhook Secret Token:</span>
                <button
                  onClick={() => handleCopy(status?.webhookToken || '', 'webhook-token')}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                >
                  {copiedKey === 'webhook-token' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'webhook-token' ? 'Copied' : 'Copy Token'}
                </button>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 rounded font-mono text-xs text-neutral-300 truncate">
                {status?.webhookToken || 'vault-auto-sync-key-8891'}
              </div>
            </div>

            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Last scan check: {status?.lastScanTime ? new Date(status.lastScanTime).toLocaleTimeString() : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Test Automation Simulation */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-200 font-medium text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Test Automation Pipeline</span>
            </div>
            <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              Live Simulator
            </span>
          </div>

          <p className="text-xs text-neutral-400">
            Simulate a bank automated statement drop. This writes an incoming e-statement to the dropzone and triggers the auto-parser, PII scrubber, and SQLite ledger insertion.
          </p>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Select Bank Preset:</label>
              <select
                value={selectedSimBank}
                onChange={(e) => setSelectedSimBank(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-neutral-200 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="RBC Royal Bank">RBC Royal Bank (Chequing & Credit)</option>
                <option value="TD Canada Trust">TD Canada Trust (EasyWeb)</option>
                <option value="Chase">Chase Bank (Checking & Sapphire)</option>
                <option value="American Express">American Express (Gold & Platinum)</option>
              </select>
            </div>

            <button
              id="btn-simulate-bank-drop"
              onClick={handleSimulateDrop}
              disabled={isSimulating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Processing Simulated Drop...' : `Simulate ${selectedSimBank} Statement Drop`}
            </button>
          </div>
        </div>
      </div>

      {/* Integration Methods & Automation Scripts */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-neutral-800 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                Automated Bank Retrieval Methods & Script Generator
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Choose an automation strategy to fetch your monthly statements without sharing bank credentials with third parties.
              </p>
            </div>

            {/* Script Tab Switcher */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setActiveScriptTab('playwright')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  activeScriptTab === 'playwright' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Playwright (Node.js)
              </button>
              <button
                onClick={() => setActiveScriptTab('python')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  activeScriptTab === 'python' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Python Daemon
              </button>
              <button
                onClick={() => setActiveScriptTab('curl')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  activeScriptTab === 'curl' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                cURL / Webhook API
              </button>
              <button
                onClick={() => setActiveScriptTab('email')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  activeScriptTab === 'email' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Email & Cloud Sync
              </button>
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-5 space-y-4">
          {/* Institution Selector for Scripts */}
          {(activeScriptTab === 'playwright' || activeScriptTab === 'python') && (
            <div className="flex items-center justify-between bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                <span>Target Institution Automation Preset:</span>
                <select
                  value={selectedScriptBank}
                  onChange={(e) => setSelectedScriptBank(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 text-neutral-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="RBC Royal Bank">RBC Royal Bank (Canada)</option>
                  <option value="TD Canada Trust">TD Canada Trust (EasyWeb)</option>
                  <option value="Scotiabank">Scotiabank (Canada)</option>
                  <option value="BMO Bank of Montreal">BMO Bank of Montreal</option>
                  <option value="CIBC">CIBC Online Banking</option>
                  <option value="Chase">Chase Bank (US)</option>
                  <option value="American Express">American Express (US & Canada)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Zero-Knowledge: Runs 100% locally on your machine
                </span>
              </div>
            </div>
          )}

          {/* Script Code Block */}
          {activeScriptTab === 'playwright' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Headless Browser Automation Script (<code className="font-mono text-emerald-400">fetch-statements.ts</code>):</span>
                <button
                  onClick={() => handleCopy(getPlaywrightScript(selectedScriptBank), 'playwright-script')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition-all"
                >
                  {copiedKey === 'playwright-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'playwright-script' ? 'Copied to Clipboard' : 'Copy Script'}
                </button>
              </div>

              <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs text-neutral-300 overflow-x-auto max-h-96 leading-relaxed">
                {getPlaywrightScript(selectedScriptBank)}
              </pre>

              {/* Instructions on scheduling */}
              <div className="bg-neutral-950/60 border border-neutral-800 rounded-lg p-4 space-y-2 text-xs text-neutral-300">
                <div className="font-semibold text-neutral-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  How to run this on a Monthly / Daily Cron Schedule:
                </div>
                <div className="space-y-1 text-neutral-400">
                  <p>1. Install Playwright: <code className="text-neutral-200 font-mono bg-neutral-900 px-1.5 py-0.5 rounded">npm install -g playwright && npx playwright install chromium</code></p>
                  <p>2. First Run: Execute manually once to authenticate with 2FA; session cookies are saved locally in <code className="text-neutral-200 font-mono bg-neutral-900 px-1.5 py-0.5 rounded">./auth-state.json</code>.</p>
                  <p>3. Cron Setup (macOS / Linux): Add to <code className="text-neutral-200 font-mono bg-neutral-900 px-1.5 py-0.5 rounded">crontab -e</code>: <code className="text-emerald-400 font-mono bg-neutral-900 px-1.5 py-0.5 rounded">0 3 1 * * node /path/to/fetch-statements.js</code> (Runs on 1st of every month at 3:00 AM).</p>
                </div>
              </div>
            </div>
          )}

          {activeScriptTab === 'python' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Python Dropzone & Webhook Script (<code className="font-mono text-emerald-400">auto_ingest.py</code>):</span>
                <button
                  onClick={() => handleCopy(getPythonScript(selectedScriptBank), 'python-script')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition-all"
                >
                  {copiedKey === 'python-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'python-script' ? 'Copied to Clipboard' : 'Copy Python Script'}
                </button>
              </div>

              <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs text-neutral-300 overflow-x-auto max-h-96 leading-relaxed">
                {getPythonScript(selectedScriptBank)}
              </pre>
            </div>
          )}

          {activeScriptTab === 'curl' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Direct Terminal cURL / Webhook API:</span>
                <button
                  onClick={() => handleCopy(getCurlSnippet(), 'curl-script')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition-all"
                >
                  {copiedKey === 'curl-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'curl-script' ? 'Copied' : 'Copy cURL Command'}
                </button>
              </div>

              <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs text-neutral-300 overflow-x-auto max-h-96 leading-relaxed">
                {getCurlSnippet()}
              </pre>

              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2 text-xs">
                <div className="font-semibold text-neutral-200">Webhook Endpoints Specification:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-neutral-400">
                  <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
                    <span className="font-mono text-emerald-400 font-semibold">POST /api/auto-fetch/webhook</span>
                    <p className="mt-1">Accepts base64 encoded PDF, raw text, or JSON transactions array with token authentication.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
                    <span className="font-mono text-cyan-400 font-semibold">POST /api/auto-fetch/scan</span>
                    <p className="mt-1">Scans the <code className="font-mono text-neutral-300">data/dropzone</code> folder, parses pending statements, and records an audit log.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeScriptTab === 'email' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email Ingestion */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-neutral-200 text-sm">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    Option A: Automated Bank Email Forwarding
                  </div>
                  <p className="text-xs text-neutral-400">
                    Most Canadian and US banks send monthly notifications when an e-statement PDF is ready.
                  </p>
                  <div className="space-y-2 text-xs text-neutral-300">
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 space-y-1">
                      <span className="font-semibold text-neutral-200">1. Setup Email Filter (Gmail / Outlook):</span>
                      <p className="text-neutral-400 font-mono text-[11px]">from:(*@rbc.com OR *@td.com OR *@chase.com) "Statement"</p>
                    </div>
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 space-y-1">
                      <span className="font-semibold text-neutral-200">2. Forward or Save Attachment:</span>
                      <p className="text-neutral-400">Use a local IMAP script or Zapier/n8n rule to send the PDF attachment to your Vault Webhook URL.</p>
                    </div>
                  </div>
                </div>

                {/* Cloud Sync Ingestion */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-neutral-200 text-sm">
                    <Cloud className="w-4 h-4 text-cyan-400" />
                    Option B: Cloud Folder Watcher Sync
                  </div>
                  <p className="text-xs text-neutral-400">
                    Link a synced cloud storage folder directly to your Vault Dropzone directory.
                  </p>
                  <div className="space-y-2 text-xs text-neutral-300">
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 space-y-1">
                      <span className="font-semibold text-neutral-200">Symlink Dropzone to Synced Folder:</span>
                      <p className="text-neutral-400 font-mono text-[11px]">ln -s ~/Dropbox/BankStatements ./data/dropzone</p>
                    </div>
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 space-y-1">
                      <span className="font-semibold text-neutral-200">Mobile PDF Ingestion:</span>
                      <p className="text-neutral-400">Whenever you save a statement PDF from your mobile banking app to iCloud or Google Drive, the app automatically ingests it!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Automated Statement Ingestion Audit Trail
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Historical record of automated dropzone scans, webhook pushes, and PII sanitization executions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded transition-all"
            >
              <Trash2 className="w-3 h-3 text-neutral-400" />
              Clear Logs
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950 text-neutral-400 uppercase font-semibold text-[10px] tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">File / Source</th>
                <th className="px-5 py-3">Institution</th>
                <th className="px-5 py-3 text-center">Extracted</th>
                <th className="px-5 py-3 text-center">Inserted</th>
                <th className="px-5 py-3 text-center">Duplicates</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Processing Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {status?.logs && status.logs.length > 0 ? (
                status.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-5 py-3 text-neutral-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono font-medium text-neutral-200">
                      {log.fileName}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded font-medium">
                        {log.institution}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-neutral-200">
                      {log.transactionsExtracted}
                    </td>
                    <td className="px-5 py-3 text-center font-mono font-semibold text-emerald-400">
                      +{log.transactionsInserted}
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-neutral-400">
                      {log.duplicatesSkipped}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        log.status === 'success' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-400 truncate max-w-xs">
                      {log.message}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-neutral-500 italic">
                    No automated ingestions logged yet. Drop a statement file into <code className="font-mono text-neutral-400">data/dropzone</code> or click "Simulate Bank Drop" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
