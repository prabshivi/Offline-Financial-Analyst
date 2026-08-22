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
  Info
} from 'lucide-react';
import { StagingTransaction, InstitutionType, Transaction } from '../types';
import { parseStatementFile, generateSampleStatement } from '../utils/parser';
import { STANDARD_CATEGORIES, cleanMerchantName, generateTransactionId } from '../utils/categorizer';
import { scrubPII } from '../utils/security';
import { api } from '../utils/api';

interface IngestionViewProps {
  existingTransactions: Transaction[];
  isDarkMode?: boolean;
  onCommitTransactions: (staging: StagingTransaction[]) => Promise<{ inserted: number; duplicates: number }>;
  onNavigate: (tab: string) => void;
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
  onNavigate
}) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingIds = new Set<string>(existingTransactions.map((t) => t.id));

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
            <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Document & Statement Ingestion
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Support for PDF statements, CSV exports, Excel CSV, OFX/QFX, TXT, and receipts with zero cloud exposure.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            title="Download a formatted sample CSV file to test manual upload"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download CSV Template
          </button>
          <button
            onClick={() => setShowPasteModal(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            Paste Text
          </button>
          <button
            id="load-sample-statement-btn"
            onClick={() => handleLoadSampleStatement()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 text-xs font-semibold transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Test Sample {institution}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Ingestion Notice</p>
            <p className="mt-0.5 text-rose-800 dark:text-rose-300">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-bold">&times;</button>
        </div>
      )}

      {/* Success Notification Banner */}
      {commitResult && (
        <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-950 dark:text-white">Successfully Saved to Vault Database!</p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                <span className="font-bold">{commitResult.inserted}</span> transactions stored permanently in SQLite database. 
                {commitResult.duplicates > 0 && ` (${commitResult.duplicates} duplicates automatically skipped).`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('ledger')}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <span>View in Master Ledger</span>
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
                  id={`preset-${preset.id.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleSelectBankPreset(preset)}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-slate-800 text-white shadow-md'
                      : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Building2 className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold truncate">{preset.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                        {preset.badge}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Drag & Drop Dropzone */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Step 2: Upload Document or Statement File
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              <span>Accepted: .pdf, .csv, .tsv, .txt, .ofx, .qfx, .json, .png, .jpg</span>
            </div>
          </div>

          <input
            id="statement-file-input"
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".csv,.txt,.tsv,.pdf,.json,.ofx,.qfx,.qbo,.png,.jpg,.jpeg,.webp"
            className="hidden"
          />

          <div
            id="statement-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processFiles(Array.from(e.dataTransfer.files));
              }
            }}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3.5 ${
              dragOver
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              {isProcessing ? (
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {isProcessing ? processingStatus || 'Parsing document...' : 'Click to browse or drag & drop document'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                Upload your bank statement PDF, CSV spreadsheet, or statement photo. Files are securely analyzed client-side and saved into your local encrypted vault.
              </p>
            </div>

            {lastUploadedFileName && !isProcessing && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Last uploaded: {lastUploadedFileName}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero cloud exposure &bull; Local SQLite storage
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Interactive Staging Review Table */}
      {stagingData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-md overflow-hidden space-y-0 transition-colors">
          {/* Staging Control Top Bar */}
          <div className="p-5 bg-slate-900 dark:bg-slate-800 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold text-base">
                {stagingData.length}
              </div>
              <div>
                <h3 className="font-bold text-sm">Step 3: Verify & Save Parsed Transactions</h3>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400 font-semibold">{newCount} New to save</span>
                  <span>&bull;</span>
                  <span className="text-amber-400">{duplicateCount} Duplicates skipped</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Flip Signs Action */}
              <button
                onClick={handleFlipSigns}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                title="Invert positive/negative values if debits were formatted as positives"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Flip +/- Signs</span>
              </button>

              {/* Filter by Category */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">All Staged Categories</option>
                {STANDARD_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>

              {/* Commit Button */}
              <button
                id="commit-vault-btn"
                onClick={handleCommit}
                disabled={isProcessing || newCount === 0}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                  newCount > 0
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/30'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                {isProcessing ? 'Securing in Vault...' : `Save ${newCount} Transactions into Vault`}
              </button>
            </div>
          </div>

          {/* Staging Data Table */}
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-750">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">Status</th>
                  <th className="py-3 px-4 w-32">Date</th>
                  <th className="py-3 px-4">Original Memo</th>
                  <th className="py-3 px-4">Clean Merchant</th>
                  <th className="py-3 px-4 w-44">Category</th>
                  <th className="py-3 px-4 w-28 text-right">Amount ($)</th>
                  <th className="py-3 px-4 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-200">
                {filteredStaging.map((row) => {
                  return (
                    <tr
                      key={row.tempId}
                      className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors ${
                        row.isDuplicate ? 'bg-amber-50/40 dark:bg-amber-950/30 text-slate-400' : ''
                      }`}
                    >
                      {/* Duplicate Status */}
                      <td className="py-2.5 px-4 text-center">
                        {row.isDuplicate ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                            title="Hash matches existing record in vault.db. Will be skipped automatically."
                          >
                            Duplicate
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                            title="Unique new transaction. Will be securely saved to vault."
                          >
                            New
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-4">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleUpdateRow(row.tempId, 'date', e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 px-1 py-0.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </td>

                      {/* Raw Description */}
                      <td className="py-2.5 px-4 max-w-xs truncate font-mono text-[11px] text-slate-500 dark:text-slate-400" title={row.raw_description}>
                        {row.raw_description}
                      </td>

                      {/* Clean Merchant */}
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={row.clean_merchant}
                          onChange={(e) => handleUpdateRow(row.tempId, 'clean_merchant', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Category Selector */}
                      <td className="py-2.5 px-4">
                        <select
                          value={row.category}
                          onChange={(e) => handleUpdateRow(row.tempId, 'category', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {STANDARD_CATEGORIES.map((cat) => (
                            <option key={cat.name} value={cat.name} className="dark:bg-slate-900 dark:text-slate-100">
                              {cat.name}
                            </option>
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
                          className={`w-24 text-right bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            row.amount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                          }`}
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.tempId)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
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
              <span>{newCount} unique records will be stored into vault.db</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStagingData([])}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline font-medium"
              >
                Clear Staged Rows
              </button>
              <button
                onClick={handleCommit}
                disabled={isProcessing || newCount === 0}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
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
              <button onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold">
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
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPastedText}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-emerald-500"
              >
                Parse & Stage Lines
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
