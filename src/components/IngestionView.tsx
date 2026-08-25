import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Trash2, 
  ShieldCheck, 
  ArrowRight,
  Database,
  Layers,
  HelpCircle,
  Hash,
  Filter,
  CreditCard,
  Building2,
  Check,
  RefreshCw,
  Plus,
  Download,
  FileSpreadsheet,
  FileCheck,
  FileSearch,
  Zap,
  Info,
  Briefcase,
  User
} from 'lucide-react';
import { StagingTransaction, InstitutionType, Transaction, StatementType } from '../types';
import { parseStatementFile, generateSampleStatement } from '../utils/parser';
import { STANDARD_CATEGORIES, cleanMerchantName, generateTransactionId } from '../utils/categorizer';
import { scrubPII } from '../utils/security';
import { api } from '../utils/api';


import { AutoFetchStatus, AutoFetchLog } from '../types';

interface IngestionViewProps {
  existingTransactions: Transaction[];
  isDarkMode?: boolean;
  onCommitTransactions: (staging: StagingTransaction[]) => Promise<{ inserted: number; duplicates: number }>;
  onNavigate: (tab: string) => void;
  onRefreshAllData: () => Promise<void>;
}

const BANK_PRESETS: { id: string; name: string; accountLabel: string; badge: string; sub: string }[] = [
  { id: 'RBC', name: 'RBC Royal Bank', accountLabel: 'RBC Chequing / Avion', badge: 'CAD$ / CSV', sub: 'Canadian RBC' },
  { id: 'TD', name: 'TD Canada Trust', accountLabel: 'TD All-Inclusive Chequing', badge: 'Debit/Credit', sub: 'Canadian TD' },
  { id: 'Scotiabank', name: 'Scotiabank', accountLabel: 'Scotia Momentum / Scene', badge: 'CSV / PDF', sub: 'Canadian Scotia' },
  { id: 'BMO', name: 'BMO Financial', accountLabel: 'BMO Premium Checking', badge: 'CSV', sub: 'Canadian BMO' },
  { id: 'CIBC', name: 'CIBC', accountLabel: 'CIBC Smart Account / AAdvantage', badge: 'CSV / OFX', sub: 'Canadian CIBC' },
  { id: 'Tangerine', name: 'Tangerine', accountLabel: 'Tangerine No-Fee Chequing', badge: 'CSV', sub: 'Canadian Direct' },
  { id: 'Chase', name: 'Chase Bank', accountLabel: 'Chase Sapphire & Checking', badge: 'CSV / PDF', sub: 'US Chase' },
  { id: 'Amex', name: 'American Express', accountLabel: 'Amex Gold / Platinum Card', badge: 'CSV', sub: 'US / Global' },
  { id: 'Apple Card', name: 'Apple Card', accountLabel: 'Apple Card Goldman Sachs', badge: 'CSV / Wallet', sub: 'Apple Wallet' },
  { id: 'Generic CSV', name: 'Universal Document', accountLabel: 'Personal Vault Account', badge: 'CSV/PDF/OFX', sub: 'All Banks' },
];

export const IngestionView: React.FC<IngestionViewProps> = ({
  existingTransactions,
  isDarkMode = true,
  onCommitTransactions,
  onNavigate,
  onRefreshAllData
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'manual' | 'autofetch'>('manual');
  
  // Auto fetch state properties
  const [autoStatus, setAutoStatus] = useState<AutoFetchStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedSimBank, setSelectedSimBank] = useState('RBC Royal Bank');
  const [autoNotification, setAutoNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [institution, setInstitution] = useState<string>('RBC');
  const [accountName, setAccountName] = useState<string>('RBC Chequing / Avion');
  const [stagingData, setStagingData] = useState<StagingTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [commitResult, setCommitResult] = useState<{ inserted: number; duplicates: number } | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [rawTextPaste, setRawTextPaste] = useState<string>('');
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastUploadedFileName, setLastUploadedFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedStatementType, setDetectedStatementType] = useState<StatementType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingIds = new Set<string>(existingTransactions.map((t) => t.id));

  const fetchAutoStatus = async () => {
    try {
      const data = await api.getAutoFetchStatus();
      setAutoStatus(data);
    } catch (err: any) {
      console.error('Failed to load auto fetch status:', err);
    }
  };

  useEffect(() => {
    fetchAutoStatus();
    const timer = setInterval(fetchAutoStatus, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleManualScan = async () => {
    setIsScanning(true);
    setAutoNotification(null);
    try {
      const res = await api.scanDropzone();
      await fetchAutoStatus();
      await onRefreshAllData();
      setAutoNotification({
        type: 'success',
        message: `Scan complete: Zack found ${res.filesScanned} file(s). Extracted ${res.totalExtracted} rows (${res.totalInserted} new treats, ${res.duplicates} duplicates skipped).`
      });
    } catch (err: any) {
      setAutoNotification({
        type: 'error',
        message: `Scan failed: ${err.message}`
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSimulateDrop = async () => {
    setIsSimulating(true);
    setAutoNotification(null);
    try {
      const res = await api.simulateDropzoneFile(selectedSimBank);
      await fetchAutoStatus();
      await onRefreshAllData();
      setAutoNotification({
        type: 'success',
        message: `Simulation complete! Zack fetched and chewed on ${res.simulatedFile}. Inserted ${res.totalInserted} treats into the vault database!`
      });
    } catch (err: any) {
      setAutoNotification({
        type: 'error',
        message: `Simulation failed: ${err.message}`
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleToggleAutoScan = async () => {
    if (!autoStatus) return;
    try {
      const newEnabled = !autoStatus.enabled;
      await api.updateAutoFetchConfig({ enabled: newEnabled });
      setAutoStatus({ ...autoStatus, enabled: newEnabled });
    } catch (err: any) {
      console.error('Failed to update config:', err);
    }
  };

  const handleIntervalChange = async (interval: number) => {
    if (!autoStatus) return;
    try {
      await api.updateAutoFetchConfig({ scanIntervalMinutes: interval });
      setAutoStatus({ ...autoStatus, scanIntervalMinutes: interval });
    } catch (err: any) {
      console.error('Failed to update interval:', err);
    }
  };

  const handleClearLogs = async () => {
    try {
      await api.clearAutoFetchLogs();
      await fetchAutoStatus();
    } catch (err: any) {
      console.error('Failed to clear logs:', err);
    }
  };

  const handleSelectBankPreset = (preset: typeof BANK_PRESETS[0]) => {
    setInstitution(preset.id);
    setAccountName(preset.accountLabel);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
    // Reset file input value so re-uploading the same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setCommitResult(null);
    setErrorMessage(null);
    setDetectedStatementType(null);

    const allParsed: StagingTransaction[] = [];

    for (const file of files) {
      setLastUploadedFileName(file.name);
      const isPdfOrImage = 
        file.type.includes('pdf') || 
        file.type.includes('image') || 
        file.name.toLowerCase().endsWith('.pdf') || 
        file.name.toLowerCase().endsWith('.png') || 
        file.name.toLowerCase().endsWith('.jpg') || 
        file.name.toLowerCase().endsWith('.jpeg') || 
        file.name.toLowerCase().endsWith('.webp');

      if (isPdfOrImage) {
        setProcessingStatus(`Parsing document "${file.name}"...`);
        try {
          const base64Data = await fileToBase64(file);
          const response = await api.parseDocument({
            fileName: file.name,
            fileType: file.type || 'application/pdf',
            base64Data,
            institution,
            accountName
          });

          // Capture statement type from API response
          if (response.statementType) {
            setDetectedStatementType(response.statementType);
          }

          if (response.transactions && response.transactions.length > 0) {
            const staged: StagingTransaction[] = response.transactions.map((t, idx) => {
              const scrubbedRaw = scrubPII(t.raw_description || 'Document Transaction');
              const scrubbedClean = t.clean_merchant ? scrubPII(t.clean_merchant) : cleanMerchantName(scrubbedRaw);
              const hashId = t.id || generateTransactionId(t.date || '', scrubbedRaw, t.amount || 0, institution);
              return {
                tempId: `staging-doc-${Date.now()}-${idx}`,
                id: hashId,
                date: t.date || new Date().toISOString().split('T')[0],
                institution: t.institution || institution || 'Document Import',
                account_name: t.account_name || accountName || `${institution} Account`,
                raw_description: scrubbedRaw,
                clean_merchant: scrubbedClean,
                category: t.category || 'Miscellaneous',
                amount: t.amount || 0,
                type: t.type || ((t.amount || 0) >= 0 ? 'inflow' : 'outflow'),
                isDuplicate: existingIds.has(hashId)
              };
            });
            allParsed.push(...staged);
          } else if (response.textToParse) {
            const parsed = parseStatementFile(response.textToParse, institution, accountName, existingIds);
            allParsed.push(...parsed);
            // Detect statement type from extracted text if not already set
            if (!response.statementType || response.statementType === 'unknown') {
              const textLower = response.textToParse.toLowerCase();
              const hasBizSignals = ['inc.', 'corp.', 'ltd.', 'llc', 'business account', 'corporate', 'hst', 'gst', 'payroll', 'accounts payable'].some(s => textLower.includes(s));
              const hasPersonalSignals = ['personal', 'chequing account', 'savings account', 'rrsp', 'tfsa', 'grocery', 'netflix'].some(s => textLower.includes(s));
              if (hasBizSignals && !hasPersonalSignals) setDetectedStatementType('business');
              else if (hasPersonalSignals && !hasBizSignals) setDetectedStatementType('personal');
            }
          }
        } catch (err: any) {
          console.warn('PDF document parse error, attempting client text fallback:', err);
          try {
            const text = await file.text();
            const parsed = parseStatementFile(text, institution, accountName, existingIds);
            allParsed.push(...parsed);
          } catch (fallbackErr) {
            console.error('File reading failed:', fallbackErr);
          }
        }
      } else {
        // CSV, TSV, TXT, JSON, OFX, QFX
        setProcessingStatus(`Reading statement "${file.name}"...`);
        try {
          const text = await file.text();
          const parsed = parseStatementFile(text, institution, accountName, existingIds);
          allParsed.push(...parsed);
        } catch (err: any) {
          console.error('Error reading statement file:', err);
        }
      }
    }

    if (allParsed.length === 0) {
      setErrorMessage(`No valid transactions could be extracted from the uploaded document(s). Please verify the file format or try pasting text lines.`);
    } else {
      setStagingData((prev) => [...prev, ...allParsed]);
    }

    setIsProcessing(false);
    setProcessingStatus('');
  };

  const handleLoadSampleStatement = (bankId?: string) => {
    setIsProcessing(true);
    setCommitResult(null);
    setErrorMessage(null);
    const targetInst = bankId || institution;
    const sampleText = generateSampleStatement(targetInst);
    const parsed = parseStatementFile(sampleText, targetInst, `${targetInst} Test Account`, existingIds);
    setStagingData(parsed);
    setLastUploadedFileName(`Sample_${targetInst}_Statement.csv`);
    setIsProcessing(false);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = generateSampleStatement(institution);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${institution.toLowerCase().replace(/\s+/g, '_')}_sample_statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessPastedText = () => {
    if (!rawTextPaste.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);
    const parsed = parseStatementFile(rawTextPaste, institution, accountName, existingIds);
    if (parsed.length === 0) {
      setErrorMessage('Could not find transactions in the pasted text. Ensure each line has a date, description, and amount.');
    } else {
      setStagingData((prev) => [...prev, ...parsed]);
      setLastUploadedFileName('Pasted_Text_Statement');
    }
    setIsProcessing(false);
    setShowPasteModal(false);
    setRawTextPaste('');
  };

  const handleUpdateRow = (tempId: string, field: keyof StagingTransaction, value: any) => {
    setStagingData((prev) =>
      prev.map((row) => {
        if (row.tempId === tempId) {
          const updated = { ...row, [field]: value };
          if (field === 'amount') {
            updated.type = Number(value) >= 0 ? 'inflow' : 'outflow';
          }
          return updated;
        }
        return row;
      })
    );
  };

  const handleDeleteRow = (tempId: string) => {
    setStagingData((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const handleFlipSigns = () => {
    setStagingData((prev) =>
      prev.map((r) => {
        const flipped = -r.amount;
        return {
          ...r,
          amount: flipped,
          type: flipped >= 0 ? 'inflow' : 'outflow'
        };
      })
    );
  };

  const handleCommit = async () => {
    if (stagingData.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus('Securing and storing transactions into SQLite Vault...');
    try {
      // Defense-in-depth: Ensure all fields are scrubbed of any PII before committing to storage
      const sanitizedStaging: StagingTransaction[] = stagingData.map((t) => ({
        ...t,
        raw_description: scrubPII(t.raw_description),
        clean_merchant: scrubPII(t.clean_merchant)
      }));
      const result = await onCommitTransactions(sanitizedStaging);
      setCommitResult(result);
      setStagingData([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving transactions');
      console.error('Commit error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const newCount = stagingData.filter((r) => !r.isDuplicate).length;
  const duplicateCount = stagingData.filter((r) => r.isDuplicate).length;

  const filteredStaging = stagingData.filter((r) => {
    if (selectedCategoryFilter === 'all') return true;
    return r.category === selectedCategoryFilter;
  });

  return (
<div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Fetch Bank Statements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Retrieve, chew on, and sanitize bank files offline with zero cloud leaks.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={() => setActiveSubTab('manual')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'manual'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-550 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Toss a File (Manual Upload)
          </button>
          <button
            onClick={() => setActiveSubTab('autofetch')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'autofetch'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-550 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Zack's Auto-Fetcher (Backyard Dropzone)
          </button>
        </div>
      </div>

      {activeSubTab === 'manual' ? (
        <>
          {/* Manual Statements Top Bar Actions */}
          <div className="flex justify-end gap-2 flex-wrap">
            <button
              onClick={handleDownloadSampleCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Download a formatted sample CSV file to test manual upload"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Download CSV Template
            </button>
            <button
              onClick={() => setShowPasteModal(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Paste Text
            </button>
            <button
              id="load-sample-statement-btn"
              onClick={() => handleLoadSampleStatement()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Test Sample {institution}
            </button>
          </div>

          {/* Statement Type Detection Badge */}
          {detectedStatementType && detectedStatementType !== 'unknown' && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-in fade-in transition-all ${
              detectedStatementType === 'personal'
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60 text-sky-900 dark:text-sky-100'
                : 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/60 text-violet-900 dark:text-violet-100'
            }`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                detectedStatementType === 'personal'
                  ? 'bg-sky-600 text-white'
                  : 'bg-violet-600 text-white'
              }`}>
                {detectedStatementType === 'personal' ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Briefcase className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {detectedStatementType === 'personal' ? '🟢 Personal Statement Detected' : '🟣 Business / Incorporation Statement Detected'}
                </p>
                <p className={`text-xs mt-0.5 ${
                  detectedStatementType === 'personal'
                    ? 'text-sky-700 dark:text-sky-300'
                    : 'text-violet-700 dark:text-violet-300'
                }`}>
                  {detectedStatementType === 'personal'
                    ? 'This document appears to be an individual/personal bank or credit card statement.'
                    : 'This document appears to be a business, corporate, or incorporation financial statement.'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                detectedStatementType === 'personal'
                  ? 'bg-sky-200 dark:bg-sky-800 text-sky-800 dark:text-sky-200'
                  : 'bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200'
              }`}>
                {detectedStatementType === 'personal' ? 'Personal' : 'Business'}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Ingestion Notice</p>
                <p className="mt-0.5 text-rose-800 dark:text-rose-300">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-705 font-bold">&times;</button>
            </div>
          )}

          {commitResult && (
            <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-emerald-950 dark:text-white">Successfully Saved to Vault Database!</p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    <span className="font-bold">{commitResult.inserted}</span> treats stored permanently in the database. 
                    {commitResult.duplicates > 0 && ` (${commitResult.duplicates} duplicates automatically skipped).`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('ledger')}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <span>View Scent Trail in Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Ingestion Steps */}
          <div className="space-y-4">
            {/* Step 1: Bank Preset Picker */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <span>Step 1: Choose Financial Institution / Format</span>
                </h3>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Selected: {institution} ({accountName})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {BANK_PRESETS.map((preset) => {
                  const isSelected = institution === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectBankPreset(preset)}
                      className={`p-3 rounded-2xl border text-left transition-all hover:scale-102 flex flex-col justify-between h-20 relative overflow-hidden cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 text-slate-900 dark:text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-slate-350 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-[11.5px] truncate">{preset.name}</p>
                        <p className="text-[9.5px] text-slate-400 mt-0.5 truncate">{preset.sub}</p>
                      </div>
                      <span className={`text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded self-start ${
                        isSelected 
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {preset.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Dropzone Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div 
                className={`md:col-span-12 border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 ${
                  dragOver ? 'border-emerald-500 bg-emerald-500/5 scale-[0.99]' : ''
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) processFiles(Array.from(files));
                }}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-xs text-slate-500">
                  <UploadCloud className="w-6 h-6 text-emerald-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Toss Statement PDF or CSV File here</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Drag and drop your bank files, or click to browse. PII is scrubbed locally before parsing.
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept=".csv,.pdf,.xlsx,.txt,.ofx,.qfx"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all hover:scale-105 cursor-pointer shadow-sm"
                >
                  Browse Files
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Zack's Auto-Fetcher Sub-Tab */
        <div className="space-y-6">
          {/* Status & Settings */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
                  🐶
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zack's Automatic Fetcher</h3>
                  <p className="text-[10.5px] text-slate-400 font-mono">Directory Watcher Settings</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Zack checks your local folder periodically for new statements, scrubs their PII, and buries the treats in the vault database.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Canine Watcher</span>
                  <button
                    onClick={handleToggleAutoScan}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      autoStatus?.enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {autoStatus?.enabled ? 'Active / Sniffing' : 'Asleep'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Sniffing Frequency</span>
                  <select
                    value={autoStatus?.scanIntervalMinutes || 30}
                    onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                  >
                    <option value={15}>Every 15 min</option>
                    <option value={30}>Every 30 min (Default)</option>
                    <option value={60}>Every hour</option>
                    <option value={360}>Every 6 hours</option>
                  </select>
                </div>

                <div className="text-[11px] bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-1 text-slate-400">
                  <p className="font-semibold text-slate-300">Backyard Path:</p>
                  <code className="text-[9.5px] block truncate font-mono text-cyan-400">
                    {autoStatus?.dropzonePath || 'data/dropzone'}
                  </code>
                </div>
              </div>

              {/* Scan Trigger Whistle Button */}
              <button
                onClick={handleManualScan}
                disabled={isScanning}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Zack is fetching...' : 'Blow the Whistle (Scan Folder)'}</span>
              </button>
            </div>

            {/* Simulation Play Area */}
            <div className="md:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Dropzone Simulator
                </h3>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold font-mono">
                  Sandbox Testing
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Don't have real statements on hand? Toss a simulated bank file into the backyard watcher folder! Zack will fetch, sanitize, and parse it in real-time.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3">
                <label className="block text-[11px] font-mono text-slate-400">Pick a Bank Statement Template:</label>
                <div className="grid grid-cols-2 gap-2">
                  {['RBC Royal Bank', 'TD Canada Trust', 'Chase Bank', 'Apple Card'].map((bank) => (
                    <button
                      key={bank}
                      onClick={() => setSelectedSimBank(bank)}
                      className={`p-2.5 rounded-xl border text-xs text-center font-semibold transition-all cursor-pointer ${
                        selectedSimBank === bank
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-450 hover:bg-slate-800'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSimulateDrop}
                  disabled={isSimulating}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-amber-300 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>🎾 Toss Simulated {selectedSimBank} Statement</span>
                </button>
              </div>

              {autoNotification && (
                <div className={`p-3 rounded-2xl text-xs font-mono border ${
                  autoNotification.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  {autoNotification.message}
                </div>
              )}
            </div>
          </div>

          {/* Sync Scent Trails (Logs) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Statement Scent Trails</h3>
              {autoStatus?.logs && autoStatus.logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-xs text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                >
                  Clear Scent History
                </button>
              )}
            </div>

            {autoStatus?.logs && autoStatus.logs.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-850">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-850">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Filename</th>
                      <th className="py-2.5 px-4">Treats Extracted</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-850 text-slate-200">
                    {autoStatus.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-300 truncate max-w-xs">{log.fileName}</td>
                        <td className="py-3 px-4 text-emerald-400 font-mono font-bold">
                          {log.transactionsInserted} / {log.transactionsExtracted}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-455'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-850">
                <p className="text-xs text-slate-500 font-mono">No scent trails detected. Throw some statements in the backyard dropzone folder!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Staging Table Render */}
      {activeSubTab === 'manual' && stagingData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Staged Transactions</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                  {stagingData.length} records ready
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Edit or categorize rows before committing permanently.</p>
            </div>
            <button
              onClick={() => setStagingData([])}
              className="text-xs text-rose-500 hover:text-rose-600 underline font-medium cursor-pointer"
            >
              Discard All
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase font-mono text-[9px] tracking-wider border-b border-slate-200 dark:border-slate-850 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Merchant (PII Sanitized)</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-850 text-slate-800 dark:text-slate-200">
                {stagingData.map((row) => {
                  const isDuplicate = existingIds.has(row.id);
                  return (
                    <tr 
                      key={row.tempId} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors ${
                        isDuplicate ? 'opacity-40 bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-2.5 px-4 font-mono">
                        <input
                          type="text"
                          value={row.date}
                          onChange={(e) => handleUpdateRow(row.tempId, 'date', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:outline-none w-20 py-0.5 font-mono"
                        />
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-4 min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={row.clean_merchant}
                            onChange={(e) => handleUpdateRow(row.tempId, 'clean_merchant', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:outline-none w-full py-0.5 font-semibold text-slate-900 dark:text-slate-100"
                          />
                          {isDuplicate && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px] font-bold select-none shrink-0" title="Duplicate transaction detected">
                              DUP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-4">
                        <select
                          value={row.category}
                          onChange={(e) => handleUpdateRow(row.tempId, 'category', e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                        >
                          {STANDARD_CATEGORIES.map((c) => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => handleUpdateRow(row.tempId, 'amount', parseFloat(e.target.value) || 0)}
                          className="bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:outline-none w-20 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.tempId)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Remove from staging"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer stats and Commit CTA */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-755 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 transition-colors">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">Ready to save:</span>
              <span>{newCount} unique records will be stored in database</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStagingData([])}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline font-medium cursor-pointer"
              >
                Clear Staged Rows
              </button>
              <button
                onClick={handleCommit}
                disabled={isProcessing || newCount === 0}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  newCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              >
                Save {newCount} Transactions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Text Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Paste Statement Text Lines</h3>
              <button onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-750 dark:hover:text-slate-200 text-sm font-semibold cursor-pointer">
                &times;
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Copy-paste transaction rows directly from your PDF statement, banking portal, or email receipts:
            </p>
            <textarea
              rows={8}
              value={rawTextPaste}
              onChange={(e) => setRawTextPaste(e.target.value)}
              placeholder="08/15/2026 WHOLE FOODS MARKET -124.50&#10;08/16/2026 UBER TRIP -32.10&#10;08/17/2026 PAYROLL DIRECT DEPOSIT 4850.00"
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPastedText}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-emerald-500 cursor-pointer"
              >
                Parse & Stage Lines
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
