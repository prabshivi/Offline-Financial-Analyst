import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { vaultDb, TransactionRecord } from './src/server/database';
import { GoogleGenAI } from '@google/genai';
import { scrubPII } from './src/utils/security';
// @ts-ignore — pdf-parse has no bundled types
import { PDFParse } from 'pdf-parse';

type StatementType = 'personal' | 'business' | 'unknown';

/**
 * Detects whether a financial statement is personal or business/incorporation.
 * Scans extracted text for keyword signals.
 */
function detectStatementType(text: string): StatementType {
  const lower = text.toLowerCase();

  // Business / Incorporation signals
  const businessSignals = [
    'inc.', 'inc ', 'corp.', 'corp ', 'ltd.', 'ltd ', 'llc', 'l.l.c.',
    'limited', 'incorporated', 'corporation',
    'business account', 'business chequing', 'business savings',
    'corporate', 'commercial', 'operating account',
    'hst', 'gst', 'ein:', 'business number', 'bn:',
    'payroll', 'accounts payable', 'accounts receivable', 'a/p', 'a/r',
    'invoice', 'vendor', 'supplier',
    'articles of incorporation', 'certificate of incorporation',
    'registered agent', 'bylaws', 'shareholders',
    'profit and loss', 'balance sheet', 'capital stock',
    'dba', 'd.b.a.', 'doing business as',
    'merchant services', 'point of sale', 'pos terminal',
    'business visa', 'business mastercard', 'corporate card',
    'commercial loan', 'business line of credit'
  ];

  // Personal signals
  const personalSignals = [
    'personal account', 'personal chequing', 'personal savings',
    'chequing account', 'checking account', 'savings account',
    'visa infinite', 'visa platinum', 'gold visa', 'cashback',
    'joint account', 'individual account',
    'rrsp', 'tfsa', 'resp', 'fhsa', 'ira', '401k', '401(k)', 'roth',
    'personal visa', 'personal mastercard',
    'mortgage payment', 'auto loan', 'student loan',
    'grocery', 'groceries', 'dining', 'restaurant', 'uber eats',
    'netflix', 'spotify', 'amazon prime', 'disney+',
    'gym', 'fitness', 'pharmacy'
  ];

  let businessScore = 0;
  let personalScore = 0;

  for (const signal of businessSignals) {
    if (lower.includes(signal)) businessScore++;
  }
  for (const signal of personalSignals) {
    if (lower.includes(signal)) personalScore++;
  }

  if (businessScore >= 2 && businessScore > personalScore) return 'business';
  if (personalScore >= 2 && personalScore > businessScore) return 'personal';
  if (businessScore > 0 && personalScore === 0) return 'business';
  if (personalScore > 0 && businessScore === 0) return 'personal';
  return 'unknown';
}

// Dropzone directories for automated statement ingestion
const DROPZONE_DIR = path.join(process.cwd(), 'data', 'dropzone');
const PROCESSED_DIR = path.join(DROPZONE_DIR, 'processed');

interface AutoFetchLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  institution: string;
  fileSizeBytes: number;
  transactionsExtracted: number;
  transactionsInserted: number;
  duplicatesSkipped: number;
  status: 'success' | 'failed' | 'processing';
  message: string;
}

let autoFetchLogs: AutoFetchLogEntry[] = [];
let autoScanEnabled = true;
let scanIntervalMinutes = 30;
let webhookSecretToken = 'vault-auto-sync-key-8891';
let lastScanTimestamp = new Date().toISOString();

function ensureDropzoneDirs() {
  if (!fs.existsSync(DROPZONE_DIR)) {
    fs.mkdirSync(DROPZONE_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROCESSED_DIR)) {
    fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  }
}

// Active supported models with cascade fallback for high demand/availability
const SUPPORTED_GEMINI_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

async function callGeminiModelWithFallback(
  params: {
    contents: any;
    config?: any;
    preferredModels?: string[];
  }
): Promise<{ text: string; modelUsed: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const models = params.preferredModels || SUPPORTED_GEMINI_MODELS;
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });

      const text = response.text;
      if (text) {
        return { text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.statusCode;
      console.warn(`AI model ${model} parsing error, trying next fallback:`, err.message || err);
      
      // If temporary overload / rate limit / 503 / 429, brief backoff before trying next fallback model
      if (status === 503 || status === 429 || status === 500) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  throw lastError || new Error('All Gemini model fallbacks exhausted');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize SQLite Database
  await vaultDb.init();

  // --- API Endpoints ---

  // Parse Document / Statement (PDF, Image, CSV, OFX, Text) with deep Gemini AI & regex fallback
  app.post('/api/documents/parse', async (req, res) => {
    try {
      const { fileName, fileType, base64Data, textContent, institution, accountName } = req.body;
      const isPdf = fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
      const isImage = fileType?.includes('image') || /\.(png|jpg|jpeg|webp)$/i.test(fileName || '');
      const isPdfOrImage = isPdf || isImage;

      // If PDF or Image and GEMINI_API_KEY is available, try multimodal Gemini models with cascading fallback
      if (isPdfOrImage && base64Data && process.env.GEMINI_API_KEY) {
        let mimeType = fileType || (isPdf ? 'application/pdf' : 'image/png');
        if (mimeType.includes('pdf')) mimeType = 'application/pdf';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) mimeType = 'image/jpeg';
        else if (mimeType.includes('png')) mimeType = 'image/png';
        else if (mimeType.includes('webp')) mimeType = 'image/webp';

        const prompt = `You are an elite financial statement analyst and OCR engine. Analyze this bank/credit card/corporate PDF statement deeply.
IMPORTANT PRIVACY DIRECTIVE: Do not extract or return full raw government identifiers (SSN/SIN) or full 16-digit credit card PAN numbers. Always mask any account numbers to their last 4 digits (e.g. "...9420").

Extract ALL transactions and also construct a comprehensive financial statement profile to dynamically customize the user interface.

Return a valid JSON object with the following exact structure:
{
  "statementProfile": {
    "accountHolder": "Name of the person or entity on statement (e.g. Alex Morgan, Apex Tech LLC)",
    "entityName": "Company name if business/commercial statement, or null if individual",
    "institution": "Bank name (e.g. Chase, RBC Royal Bank, TD Canada Trust, Silicon Valley Bank, Amex, Wells Fargo, BofA)",
    "accountNumberMasked": "Masked account number like ...9420 or null",
    "accountType": "checking" | "savings" | "credit_card" | "line_of_credit" | "investment" | "corporate_operating" | "unknown",
    "statementType": "personal" | "business" | "freelance" | "investment" | "credit_card",
    "statementPeriod": {
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "label": "e.g. August 2026 or July 1 - July 31, 2026"
    },
    "openingBalance": 12450.00,
    "closingBalance": 16120.45,
    "totalInflows": 9718.42,
    "totalOutflows": 6047.97,
    "currency": "USD" | "CAD" | "EUR" | "GBP",
    "detectedPersona": "e.g. Tech Professional / Software Engineer, Small Business Owner, Freelance Consultant, Student, Canadian Homeowner",
    "detectedKeyMetrics": {
      "primaryIncomeSource": "e.g. Tech Corp Direct Deposit Payroll, Stripe Merchant Invoices, Interac E-Transfer",
      "averageMonthlyIncome": 9700.00,
      "fixedExpenseRatio": 48,
      "discretionaryRatio": 22,
      "topExpenseCategory": "Rent & Housing" | "Software & Technology" | "Groceries",
      "savingsRatePercentage": 37.8,
      "taxDeductibleRatio": 90.0
    },
    "detectedSubscriptions": [
      {
        "merchant": "Netflix",
        "amount": 22.99,
        "cadence": "monthly" | "annual" | "weekly" | "quarterly",
        "category": "Entertainment & Subscriptions" | "Software & Technology" | "Utilities & Bills",
        "isEssential": false,
        "cancellationTip": "Recent price hike detected. Consider standard plan.",
        "confidence": 95
      }
    ],
    "customUITheme": {
      "dashboardTitle": "e.g. Personal Wealth & Cashflow Executive or Corporate Treasury & Operating Health",
      "dashboardSubtitle": "Customized subtitle based on the account and institution",
      "outflowMetricLabel": "e.g. Total Living Expenditures or Operating Outflows & COGS",
      "inflowMetricLabel": "e.g. Net Payroll & Inflows or Client Revenues & Retainers",
      "netCashflowLabel": "e.g. Monthly Net Savings or Net Operating Profit",
      "subscriptionTabLabel": "e.g. Recurring Subscriptions & Fixed Drain or SaaS & Vendor Commitments",
      "recurringMetricLabel": "e.g. Monthly Fixed Commitments or Monthly SaaS Drain",
      "budgetTabLabel": "e.g. Personal Budget Envelopes or Department Operating Caps",
      "ledgerTabLabel": "e.g. Personal Vault Ledger or Corporate General Ledger",
      "recommendationTitle": "e.g. Personal Financial Health Signals or Enterprise Profit & Tax Signals",
      "personaBadge": "e.g. Tech Professional Portfolio or Commercial B2B Entity",
      "accountBadge": "e.g. Chase Sapphire (...9420)",
      "themeAccent": "cyan" | "indigo" | "rose" | "emerald" | "amber"
    },
    "visibleSections": {
      "showBusinessMetrics": boolean (true if business/commercial, false if personal),
      "showPersonalSavings": boolean (true if personal, false if corporate),
      "showDebtSnowball": boolean (true if personal/credit card, false if corporate),
      "showSubscriptionsTrimmer": true,
      "showForeignExchangeTracker": boolean (true if multi-currency or non-USD),
      "showTaxDeductibleTracker": boolean (true if business/freelance),
      "showCategoryBudgetTracker": true,
      "showPayrollCashflowTracker": true,
      "showVendorBreakdown": boolean (true if business/freelance)
    },
    "aiExecutiveSummary": "2-3 concise sentences analyzing the statement cashflow, top spending drains, and notable flags.",
    "suggestedActionItems": [
      "Key recommendation 1",
      "Key recommendation 2",
      "Key recommendation 3"
    ]
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "raw_description": "exact description text",
      "clean_merchant": "clean merchant name",
      "category": "Income" | "Groceries" | "Dining Out" | "Coffee & Drinks" | "Shopping" | "Transportation" | "Gas & Fuel" | "Entertainment & Subscriptions" | "Utilities & Bills" | "Rent & Housing" | "Health & Pharmacy" | "Fitness & Wellness" | "Travel & Lodging" | "Investments" | "Software & Technology" | "Education" | "Miscellaneous",
      "amount": number (negative for debit/expense, positive for credit/deposit),
      "type": "outflow" | "inflow"
    }
  ]
}`;

        try {
          const { text: rawJson, modelUsed } = await callGeminiModelWithFallback({
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                },
                {
                  text: prompt
                }
              ]
            },
            config: {
              responseMimeType: 'application/json'
            }
          });

          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            const aiStatementProfile = parsed.statementProfile || null;
            const aiStatementType: StatementType = aiStatementProfile?.statementType || parsed.statementType || 'unknown';
            const parsedArray = Array.isArray(parsed) ? parsed : (parsed.transactions || []);
            if (Array.isArray(parsedArray) && parsedArray.length > 0) {
              const transactions = parsedArray.map((t: any) => ({
                date: t.date || new Date().toISOString().split('T')[0],
                institution: institution || aiStatementProfile?.institution || 'Document Upload',
                account_name: accountName || aiStatementProfile?.accountHolder || 'Imported Document Account',
                raw_description: t.raw_description || t.description || 'Document Transaction',
                clean_merchant: t.clean_merchant || t.raw_description || 'Merchant',
                category: t.category || 'Miscellaneous',
                amount: typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0,
                type: t.type || (t.amount >= 0 ? 'inflow' : 'outflow')
              }));
              res.json({ 
                success: true, 
                method: `ai_${modelUsed}_multimodal`, 
                transactions, 
                statementType: aiStatementType,
                statementProfile: aiStatementProfile 
              });
              return;
            }
          }
        } catch (aiErr: any) {
          console.warn('AI multimodal parsing fallback:', aiErr.message || aiErr);
        }
      }

      // PDF fallback: use pdf-parse to extract real text from PDF structure
      if (isPdf && base64Data) {
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          const pdfData = await new PDFParse({ data: buffer }).getText();
          const extractedText = pdfData.text || '';
          const statementType = detectStatementType(extractedText);

          if (extractedText.trim().length > 20) {
            res.json({ success: true, method: 'pdf_parse_text', textToParse: extractedText, statementType });
            return;
          }
        } catch (pdfErr: any) {
          console.warn('pdf-parse extraction failed, falling back to raw bytes:', pdfErr.message);
        }
      }

      // Final fallback: extract printable text from raw buffer (images, corrupt PDFs)
      let textToParse = textContent || '';
      if (!textToParse && base64Data) {
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          const rawStr = buffer.toString('utf-8');
          textToParse = rawStr.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
        } catch {
          textToParse = '';
        }
      }

      const statementType = detectStatementType(textToParse);
      res.json({ success: true, method: 'raw_text_ready', textToParse, statementType });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dedicated AI Statement Profile Synthesis endpoint (can synthesize profile from parsed text or transactions)
  app.post('/api/statements/ai-synthesize-profile', async (req, res) => {
    try {
      const { textContent, transactions, fileName, institution } = req.body;

      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build'
              }
            }
          });

          const summaryContext = textContent 
            ? textContent.slice(0, 8000) 
            : JSON.stringify(transactions?.slice(0, 30) || []);

          const prompt = `You are an AI financial statement intelligence system.
Analyze the following bank/credit card/corporate financial statement context from file "${fileName || 'statement.pdf'}":
${summaryContext}

Generate a comprehensive AI financial statement profile to dynamically reconfigure the dashboard, tab visibility, custom labels, detected subscriptions, and executive summary.

Return ONLY a JSON object matching this schema:
{
  "accountHolder": "Name of individual or company",
  "entityName": "Entity name or null",
  "institution": "${institution || 'Bank Name'}",
  "accountNumberMasked": "...1234",
  "accountType": "checking" | "savings" | "credit_card" | "line_of_credit" | "investment" | "corporate_operating",
  "statementType": "personal" | "business" | "freelance" | "investment" | "credit_card",
  "statementPeriod": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "label": "Month Year" },
  "openingBalance": 10000,
  "closingBalance": 12500,
  "totalInflows": 5000,
  "totalOutflows": 2500,
  "currency": "USD" | "CAD" | "EUR" | "GBP",
  "detectedPersona": "e.g. Software Engineer, B2B SaaS Agency, Canadian Homeowner",
  "detectedKeyMetrics": {
    "primaryIncomeSource": "e.g. Payroll Direct Deposit",
    "averageMonthlyIncome": 5000,
    "fixedExpenseRatio": 45,
    "discretionaryRatio": 20,
    "topExpenseCategory": "Rent & Housing",
    "savingsRatePercentage": 35,
    "taxDeductibleRatio": 10
  },
  "detectedSubscriptions": [
    {
      "merchant": "Netflix",
      "amount": 22.99,
      "cadence": "monthly",
      "category": "Entertainment & Subscriptions",
      "isEssential": false,
      "cancellationTip": "Price hike detected",
      "confidence": 95
    }
  ],
  "customUITheme": {
    "dashboardTitle": "e.g. Personal Wealth & Cashflow Executive",
    "dashboardSubtitle": "Statement analysis for...",
    "outflowMetricLabel": "Total Living Expenditures",
    "inflowMetricLabel": "Net Payroll & Inflows",
    "netCashflowLabel": "Monthly Net Savings",
    "subscriptionTabLabel": "Recurring Subscriptions",
    "recurringMetricLabel": "Monthly Fixed Commitments",
    "budgetTabLabel": "Personal Budget Envelopes",
    "ledgerTabLabel": "Personal Vault Ledger",
    "recommendationTitle": "Financial Health Signals",
    "personaBadge": "Personal Account",
    "accountBadge": "Checking (...1234)",
    "themeAccent": "cyan"
  },
  "visibleSections": {
    "showBusinessMetrics": false,
    "showPersonalSavings": true,
    "showDebtSnowball": true,
    "showSubscriptionsTrimmer": true,
    "showForeignExchangeTracker": false,
    "showTaxDeductibleTracker": false,
    "showCategoryBudgetTracker": true,
    "showPayrollCashflowTracker": true,
    "showVendorBreakdown": false
  },
  "aiExecutiveSummary": "Summary here...",
  "suggestedActionItems": ["Action 1", "Action 2"]
}`;

          const { text } = await callGeminiModelWithFallback({
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          if (text) {
            const profile = JSON.parse(text);
            return res.json({ success: true, profile });
          }
        } catch (genErr: any) {
          console.warn('AI statement profile synthesis failed:', genErr.message);
        }
      }

      // Fallback heuristics if AI is offline
      const isBusiness = fileName?.toLowerCase().includes('business') || fileName?.toLowerCase().includes('corp') || fileName?.toLowerCase().includes('agency');
      const isCad = fileName?.toLowerCase().includes('rbc') || fileName?.toLowerCase().includes('td') || fileName?.toLowerCase().includes('canada');

      res.json({
        success: true,
        profile: {
          accountHolder: isBusiness ? 'Enterprise Corporation' : 'Primary Account Holder',
          institution: institution || (isCad ? 'RBC Royal Bank Canada' : 'Chase Bank'),
          accountType: isBusiness ? 'corporate_operating' : 'checking',
          statementType: isBusiness ? 'business' : 'personal',
          currency: isCad ? 'CAD' : 'USD',
          detectedPersona: isBusiness ? 'Commercial B2B Enterprise' : 'Professional Account Holder',
          aiExecutiveSummary: 'Heuristic profile synthesized from statement metadata and transaction volume.'
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  ensureDropzoneDirs();

  // Helper to parse any file buffer into transactions
  async function parseStatementBuffer(
    buffer: Buffer,
    fileName: string,
    institutionGuess?: string
  ): Promise<{ transactions: Partial<TransactionRecord>[]; method: string; statementType?: StatementType }> {
    const ext = path.extname(fileName).toLowerCase();
    const isPdf = ext === '.pdf';
    const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    const isCsv = ext === '.csv' || ext === '.tsv';
    const isOfx = ext === '.ofx' || ext === '.qfx';
    const isJson = ext === '.json';

    let institution = institutionGuess || 'Auto-Ingested Statement';
    if (fileName.toLowerCase().includes('rbc')) institution = 'RBC Royal Bank';
    else if (fileName.toLowerCase().includes('td')) institution = 'TD Canada Trust';
    else if (fileName.toLowerCase().includes('scotia')) institution = 'Scotiabank';
    else if (fileName.toLowerCase().includes('bmo')) institution = 'BMO Bank of Montreal';
    else if (fileName.toLowerCase().includes('cibc')) institution = 'CIBC';
    else if (fileName.toLowerCase().includes('chase')) institution = 'Chase';
    else if (fileName.toLowerCase().includes('amex')) institution = 'American Express';
    else if (fileName.toLowerCase().includes('apple')) institution = 'Apple Card';

    // 1. JSON format
    if (isJson) {
      try {
        const text = buffer.toString('utf-8');
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : (parsed.transactions || []);
        const sanitized = list.map((t: any) => ({
          date: t.date || new Date().toISOString().split('T')[0],
          institution: t.institution || institution,
          account_name: t.account_name || `${institution} Automated Account`,
          raw_description: scrubPII(t.raw_description || t.description || 'Automated Transaction'),
          clean_merchant: scrubPII(t.clean_merchant || vaultDb.guessMerchant(t.raw_description || t.description || '')),
          category: t.category || vaultDb.categorize(t.raw_description || t.description || ''),
          amount: typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0,
          type: t.type || ((Number(t.amount) || 0) >= 0 ? 'inflow' : 'outflow')
        }));
        return { transactions: sanitized, method: 'json_parser' };
      } catch (e) {
        console.warn('Failed to parse JSON file:', e);
      }
    }

    // 2. PDF or Image with Gemini Multimodal AI (if API key is set)
    if ((isPdf || isImage) && process.env.GEMINI_API_KEY) {
      try {
        const mimeType = isPdf ? 'application/pdf' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png');
        const base64Data = buffer.toString('base64');

        const prompt = `Extract all transaction rows from this bank statement or document into a clean JSON array.
PRIVACY DIRECTIVE: Never output full Social Security/SIN numbers or full credit card PANs. Replace card numbers with [CARD-****-last4].

For each transaction:
- "date": string in YYYY-MM-DD format (use year 2026 if year is not stated)
- "raw_description": exact memo or description
- "clean_merchant": normalized merchant name (e.g. "Whole Foods", "Starbucks", "Uber", "Hydro", "Payroll")
- "category": one of [Income, Groceries, Dining Out, Coffee & Drinks, Shopping, Transportation, Gas & Fuel, Entertainment & Subscriptions, Utilities & Bills, Rent & Housing, Health & Pharmacy, Fitness & Wellness, Travel & Lodging, Investments, Education, Miscellaneous]
- "amount": number (negative for expenses like -35.20, positive for income/deposits like 2400.00)
- "type": "outflow" or "inflow"

Return a JSON array only.`;

        const { text: rawJson, modelUsed } = await callGeminiModelWithFallback({
          contents: {
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt }
            ]
          },
          config: { responseMimeType: 'application/json' }
        });

        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map((t: any) => {
              const rawDesc = scrubPII(t.raw_description || t.description || 'Bank Statement Row');
              const cleanM = t.clean_merchant ? scrubPII(t.clean_merchant) : vaultDb.guessMerchant(rawDesc);
              return {
                date: t.date || new Date().toISOString().split('T')[0],
                institution: institution,
                account_name: `${institution} e-Statement`,
                raw_description: rawDesc,
                clean_merchant: cleanM,
                category: t.category || vaultDb.categorize(rawDesc),
                amount: typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0,
                type: t.type || ((Number(t.amount) || 0) >= 0 ? 'inflow' : 'outflow')
              };
            });
            return { transactions: sanitized, method: `gemini_multimodal_${modelUsed}` };
          }
        }
      } catch (err: any) {
        console.warn('Gemini statement PDF parsing fallback:', err.message);
      }
    }

    // Regex for date + description + amount line
    // E.g. "2026-08-01 WHOLE FOODS -45.20" or "08/14/2026 STARBUCKS $6.50"
    const lineRegex = /(?:(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}))\s+([A-Za-z0-9\s*#&._\-'/,]{3,50})\s+([+-]?\$?\s*\d{1,6}(?:[.,]\d{2})?)/i;

    // 2b. PDF fallback with pdf-parse (proper text extraction from PDF structure)
    if (isPdf) {
      try {
        const pdfData = await new PDFParse({ data: buffer }).getText();
        const extractedText = pdfData.text || '';
        if (extractedText.trim().length > 20) {
          // Re-parse the properly extracted text through our regex/CSV pipeline
          const textLines = extractedText.split(/\r?\n/);
          const pdfExtracted: Partial<TransactionRecord>[] = [];
          for (const line of textLines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('date')) continue;
            const match = trimmed.match(lineRegex);
            if (match) {
              const dateStr = match[1] || match[2];
              const descStr = match[3].trim();
              const amtStr = match[4].replace(/[\$,\s]/g, '');
              const numAmt = parseFloat(amtStr);
              if (!isNaN(numAmt) && descStr.length > 2 && !descStr.toUpperCase().includes('BALANCE')) {
                const rawDesc = scrubPII(descStr);
                pdfExtracted.push({
                  date: dateStr || new Date().toISOString().split('T')[0],
                  institution,
                  account_name: `${institution} Account`,
                  raw_description: rawDesc,
                  clean_merchant: scrubPII(vaultDb.guessMerchant(rawDesc)),
                  category: vaultDb.categorize(rawDesc),
                  amount: numAmt,
                  type: numAmt >= 0 ? 'inflow' : 'outflow'
                });
              }
            }
          }
          if (pdfExtracted.length > 0) {
            const stType = detectStatementType(extractedText);
            return { transactions: pdfExtracted, method: 'pdf_parse_text', statementType: stType };
          }
          // Even if no regex matches, return the text for the client-side parser
          const stType = detectStatementType(extractedText);
          return { transactions: [], method: 'pdf_parse_text_raw', statementType: stType };
        }
      } catch (pdfErr: any) {
        console.warn('pdf-parse extraction failed in parseStatementBuffer:', pdfErr.message);
      }
    }

    // 3. Text / CSV / OFX / Raw regex extraction
    const rawText = buffer.toString('utf-8');
    const printable = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    const lines = printable.split(/\r?\n/);
    const extracted: Partial<TransactionRecord>[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('date')) continue;

      // CSV line splitting fallback
      if (isCsv && trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.replace(/^["']|["']$/g, '').trim());
        if (parts.length >= 3) {
          const datePart = parts[0] || parts[1];
          const descPart = parts[1] || parts[2];
          const amtPart = parts[2] || parts[3] || parts[parts.length - 1];
          const parsedAmt = parseFloat(amtPart.replace(/[^0-9.-]/g, ''));
          if (!isNaN(parsedAmt) && descPart && descPart.length > 1) {
            const rawDesc = scrubPII(descPart);
            extracted.push({
              date: datePart.includes('-') ? datePart : new Date().toISOString().split('T')[0],
              institution,
              account_name: `${institution} Account`,
              raw_description: rawDesc,
              clean_merchant: scrubPII(vaultDb.guessMerchant(rawDesc)),
              category: vaultDb.categorize(rawDesc),
              amount: parsedAmt,
              type: parsedAmt >= 0 ? 'inflow' : 'outflow'
            });
            continue;
          }
        }
      }

      // Regex matching on plain text / converted PDF lines
      const match = trimmed.match(lineRegex);
      if (match) {
        const dateStr = match[1] || match[2];
        const descStr = match[3].trim();
        const amtStr = match[4].replace(/[\$,\s]/g, '');
        const numAmt = parseFloat(amtStr);

        if (!isNaN(numAmt) && descStr.length > 2 && !descStr.toUpperCase().includes('BALANCE')) {
          const rawDesc = scrubPII(descStr);
          extracted.push({
            date: dateStr || new Date().toISOString().split('T')[0],
            institution,
            account_name: `${institution} Account`,
            raw_description: rawDesc,
            clean_merchant: scrubPII(vaultDb.guessMerchant(rawDesc)),
            category: vaultDb.categorize(rawDesc),
            amount: numAmt,
            type: numAmt >= 0 ? 'inflow' : 'outflow'
          });
        }
      }
    }

    const stType = detectStatementType(printable);
    return { transactions: extracted, method: isCsv ? 'csv_parser' : 'text_heuristic_parser', statementType: stType };
  }

  // Auto-scan dropzone runner
  async function runDropzoneScan(): Promise<{
    filesScanned: number;
    totalExtracted: number;
    totalInserted: number;
    duplicates: number;
    results: any[];
  }> {
    ensureDropzoneDirs();
    lastScanTimestamp = new Date().toISOString();

    const files = fs.readdirSync(DROPZONE_DIR).filter(f => {
      const fullPath = path.join(DROPZONE_DIR, f);
      return fs.statSync(fullPath).isFile() && !f.startsWith('.');
    });

    let filesScanned = 0;
    let totalExtracted = 0;
    let totalInserted = 0;
    let totalDuplicates = 0;
    const results: any[] = [];

    for (const fileName of files) {
      const filePath = path.join(DROPZONE_DIR, fileName);
      try {
        filesScanned++;
        const fileBuffer = fs.readFileSync(filePath);
        const stats = fs.statSync(filePath);

        const { transactions, method } = await parseStatementBuffer(fileBuffer, fileName);
        totalExtracted += transactions.length;

        let saveResult = { inserted: 0, duplicates: 0, total: 0 };
        if (transactions.length > 0) {
          saveResult = vaultDb.saveTransactions(transactions);
          totalInserted += saveResult.inserted;
          totalDuplicates += saveResult.duplicates;
        }

        // Move to processed folder with timestamp prefix
        const processedName = `${Date.now()}_${fileName}`;
        const processedPath = path.join(PROCESSED_DIR, processedName);
        fs.renameSync(filePath, processedPath);

        const logEntry: AutoFetchLogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          fileName,
          institution: transactions[0]?.institution || 'Automated Document',
          fileSizeBytes: stats.size,
          transactionsExtracted: transactions.length,
          transactionsInserted: saveResult.inserted,
          duplicatesSkipped: saveResult.duplicates,
          status: 'success',
          message: `Parsed ${transactions.length} rows via ${method} (${saveResult.inserted} inserted, ${saveResult.duplicates} duplicates skipped)`
        };

        autoFetchLogs.unshift(logEntry);
        if (autoFetchLogs.length > 50) autoFetchLogs.pop();

        results.push({
          fileName,
          extracted: transactions.length,
          inserted: saveResult.inserted,
          duplicates: saveResult.duplicates,
          method
        });
      } catch (err: any) {
        console.error(`Error processing dropzone file ${fileName}:`, err);
        const logEntry: AutoFetchLogEntry = {
          id: `log-err-${Date.now()}`,
          timestamp: new Date().toISOString(),
          fileName,
          institution: 'Unknown',
          fileSizeBytes: 0,
          transactionsExtracted: 0,
          transactionsInserted: 0,
          duplicatesSkipped: 0,
          status: 'failed',
          message: `Processing failed: ${err.message}`
        };
        autoFetchLogs.unshift(logEntry);
      }
    }

    return {
      filesScanned,
      totalExtracted,
      totalInserted,
      duplicates: totalDuplicates,
      results
    };
  }

  // Periodic Auto-Scanner background daemon
  setInterval(async () => {
    if (autoScanEnabled) {
      try {
        await runDropzoneScan();
      } catch (e) {
        console.error('Background dropzone scan error:', e);
      }
    }
  }, scanIntervalMinutes * 60 * 1000);

  // --- Auto-Fetch & Automation API Endpoints ---

  // Get Auto-Fetch Status & Dropzone Metrics
  app.get('/api/auto-fetch/status', (req, res) => {
    try {
      ensureDropzoneDirs();
      const pendingFiles = fs.readdirSync(DROPZONE_DIR).filter(f => {
        const fullPath = path.join(DROPZONE_DIR, f);
        return fs.statSync(fullPath).isFile() && !f.startsWith('.');
      });
      const processedFiles = fs.readdirSync(PROCESSED_DIR).filter(f => !f.startsWith('.'));
      
      const totalAutoTx = autoFetchLogs.reduce((acc, log) => acc + log.transactionsInserted, 0);

      res.json({
        enabled: autoScanEnabled,
        dropzonePath: 'data/dropzone',
        pendingFilesCount: pendingFiles.length,
        pendingFiles,
        processedFilesCount: processedFiles.length,
        webhookUrl: '/api/auto-fetch/webhook',
        webhookToken: webhookSecretToken,
        lastScanTime: lastScanTimestamp,
        scanIntervalMinutes: scanIntervalMinutes,
        totalAutomatedTransactions: totalAutoTx,
        logs: autoFetchLogs
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger immediate Dropzone Scan
  app.post('/api/auto-fetch/scan', async (req, res) => {
    try {
      const scanResults = await runDropzoneScan();
      res.json({ success: true, ...scanResults });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Webhook endpoint for automated scripts (Playwright, Python, cURL, Email Forwarder)
  app.post('/api/auto-fetch/webhook', async (req, res) => {
    try {
      const authHeader = req.headers['x-vault-token'] || req.headers['authorization'];
      const queryToken = req.query.token as string;
      const providedToken = (authHeader ? String(authHeader).replace(/^Bearer\s+/i, '') : queryToken);

      // Verify token
      if (providedToken !== webhookSecretToken) {
        res.status(401).json({ error: 'Unauthorized: Invalid or missing webhook token' });
        return;
      }

      const { fileName = `webhook_import_${Date.now()}.pdf`, base64Data, textContent, institution, transactions } = req.body;

      if (Array.isArray(transactions) && transactions.length > 0) {
        // Direct transactions JSON payload
        const sanitized = transactions.map((t: any) => ({
          ...t,
          raw_description: scrubPII(t.raw_description || t.description || 'Webhook Transaction'),
          clean_merchant: scrubPII(t.clean_merchant || vaultDb.guessMerchant(t.raw_description || ''))
        }));
        const saveResult = vaultDb.saveTransactions(sanitized);

        const logEntry: AutoFetchLogEntry = {
          id: `log-webhook-${Date.now()}`,
          timestamp: new Date().toISOString(),
          fileName,
          institution: institution || 'Webhook API Client',
          fileSizeBytes: JSON.stringify(transactions).length,
          transactionsExtracted: transactions.length,
          transactionsInserted: saveResult.inserted,
          duplicatesSkipped: saveResult.duplicates,
          status: 'success',
          message: `Direct JSON ingestion received ${transactions.length} rows (${saveResult.inserted} inserted)`
        };
        autoFetchLogs.unshift(logEntry);

        res.json({ success: true, ...saveResult });
        return;
      }

      let buffer: Buffer;
      if (base64Data) {
        buffer = Buffer.from(base64Data, 'base64');
      } else if (textContent) {
        buffer = Buffer.from(textContent, 'utf-8');
      } else {
        res.status(400).json({ error: 'Missing base64Data, textContent, or transactions array in webhook body' });
        return;
      }

      const parsed = await parseStatementBuffer(buffer, fileName, institution);
      let saveResult = { inserted: 0, duplicates: 0, total: 0 };
      if (parsed.transactions.length > 0) {
        saveResult = vaultDb.saveTransactions(parsed.transactions);
      }

      const logEntry: AutoFetchLogEntry = {
        id: `log-webhook-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fileName,
        institution: institution || parsed.transactions[0]?.institution || 'Webhook Document',
        fileSizeBytes: buffer.length,
        transactionsExtracted: parsed.transactions.length,
        transactionsInserted: saveResult.inserted,
        duplicatesSkipped: saveResult.duplicates,
        status: 'success',
        message: `Webhook received ${fileName} via ${parsed.method} (${saveResult.inserted} inserted, ${saveResult.duplicates} duplicates skipped)`
      };
      autoFetchLogs.unshift(logEntry);

      res.json({
        success: true,
        method: parsed.method,
        extracted: parsed.transactions.length,
        inserted: saveResult.inserted,
        duplicates: saveResult.duplicates
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Simulate an automated bank statement drop into the dropzone
  app.post('/api/auto-fetch/simulate-drop', async (req, res) => {
    try {
      ensureDropzoneDirs();
      const { institution = 'RBC Royal Bank' } = req.body;

      const randomBatchId = Math.floor(1000 + Math.random() * 9000);
      const fileName = `${institution.replace(/\s+/g, '_')}_Monthly_Statement_Batch_${randomBatchId}.csv`;
      const filePath = path.join(DROPZONE_DIR, fileName);

      let sampleContent = '';
      if (institution.includes('RBC')) {
        sampleContent = `Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$
Chequing,00192-991203,08/18/2026,,WHOLE FOODS TORONTO ON,CARD 4532 9918 2011,-88.45,
Chequing,00192-991203,08/19/2026,,TIM HORTONS #4928 OTTAWA ON,DEBIT CARD,-5.75,
Chequing,00192-991203,08/20/2026,,PAYROLL DIRECT DEPOSIT ACME CORP,TRANSIT 01928,3450.00,
Chequing,00192-991203,08/21/2026,,HYDRO ONE UTILITIES BILL,E-PAYMENT,-124.30,
Chequing,00192-991203,08/22/2026,,TTC METROPASS TRANSIT TORONTO,POS DEBIT,-156.00,`;
      } else if (institution.includes('TD')) {
        sampleContent = `Date,Transaction Description,Debit,Credit,Balance
2026-08-16,LOBLAWS SUPERMARKET #102,-112.50,,4820.10
2026-08-17,STARBUCKS COFFEE VANCOUVER,-6.80,,4813.30
2026-08-18,UBER TRIP VANCOUVER BC,-24.15,,4789.15
2026-08-19,EMPLOYER PAYROLL DIRECT DEP,,3100.00,7889.15
2026-08-20,NETFLIX.COM SUBSCRIPTION,-22.99,,7866.16`;
      } else {
        sampleContent = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
08/15/2026,08/16/2026,TRADER JOE'S #491,Groceries,Sale,-74.20,CARD 4532-8819-2049-1123
08/17/2026,08/18/2026,CHEVRON GAS STATION,Gas,Sale,-52.10,SAN FRANCISCO CA
08/19/2026,08/20/2026,SWEETGREEN MISSION,Dining,Sale,-17.85,LUNCH ORDER
08/20/2026,08/21/2026,TECH CORP PAYROLL,Income,Credit,4850.00,DIRECT DEPOSIT ACCT #992-102
08/21/2026,08/22/2026,EQUINOX FITNESS SF,Fitness,Sale,-280.00,MONTHLY MEMBERSHIP`;
      }

      fs.writeFileSync(filePath, sampleContent, 'utf-8');

      // Now run the scan immediately
      const scanResults = await runDropzoneScan();

      res.json({
        success: true,
        simulatedFile: fileName,
        institution,
        ...scanResults
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Auto-Fetch Configuration
  app.post('/api/auto-fetch/config', (req, res) => {
    try {
      const { enabled, scanIntervalMinutes: interval } = req.body;
      if (typeof enabled === 'boolean') autoScanEnabled = enabled;
      if (typeof interval === 'number' && interval >= 1) scanIntervalMinutes = interval;

      res.json({
        success: true,
        enabled: autoScanEnabled,
        scanIntervalMinutes
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clear Auto-Fetch Logs
  app.post('/api/auto-fetch/clear-logs', (req, res) => {
    try {
      autoFetchLogs = [];
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health check & Vault status
  app.get('/api/health', (req, res) => {
    const dataDir = path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'vault.db');
    let dbSize = 0;
    if (fs.existsSync(dbPath)) {
      dbSize = fs.statSync(dbPath).size;
    }
    const allTx = vaultDb.getAllTransactions();
    res.json({
      status: 'ok',
      dbPath: 'data/vault.db',
      dbSizeBytes: dbSize,
      transactionCount: allTx.length,
      ruleCount: vaultDb.getAllRules().length,
      localOnly: true,
      timestamp: new Date().toISOString()
    });
  });

  // Get all transactions with optional filter
  app.get('/api/transactions', (req, res) => {
    try {
      const allTx = vaultDb.getAllTransactions();
      res.json(allTx);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Save / Ingest transactions with deduplication
  app.post('/api/transactions', (req, res) => {
    try {
      const { transactions } = req.body;
      if (!Array.isArray(transactions)) {
        res.status(400).json({ error: 'transactions must be an array' });
        return;
      }
      const result = vaultDb.saveTransactions(transactions);
      res.json({
        success: true,
        inserted: result.inserted,
        duplicates: result.duplicates,
        total: result.total
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update a single transaction
  app.put('/api/transactions/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const success = vaultDb.updateTransaction(id, updates);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Transaction not found or invalid updates' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a transaction
  app.delete('/api/transactions/:id', (req, res) => {
    try {
      const { id } = req.params;
      const success = vaultDb.deleteTransaction(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk delete transactions
  app.post('/api/transactions/bulk-delete', (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'ids must be an array' });
        return;
      }
      const count = vaultDb.bulkDeleteTransactions(ids);
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clear entire vault
  app.post('/api/vault/clear', (req, res) => {
    try {
      vaultDb.clearAllTransactions();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Rules management
  app.get('/api/rules', (req, res) => {
    try {
      res.json(vaultDb.getAllRules());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/rules', (req, res) => {
    try {
      const rule = vaultDb.saveRule(req.body);
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/rules/:id', (req, res) => {
    try {
      const success = vaultDb.deleteRule(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export raw SQLite DB
  app.get('/api/export/db', (req, res) => {
    try {
      const buffer = vaultDb.getRawDbBinary();
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="vault.db"');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export JSON
  app.get('/api/export/json', (req, res) => {
    try {
      const txs = vaultDb.getAllTransactions();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="vault_transactions.json"');
      res.send(JSON.stringify(txs, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Import SQLite DB binary or JSON
  app.post('/api/import', (req, res) => {
    try {
      const { format, data } = req.body;
      if (format === 'json') {
        const records = Array.isArray(data) ? data : JSON.parse(data);
        const result = vaultDb.saveTransactions(records);
        res.json({ success: true, ...result });
      } else if (format === 'base64_db') {
        const buffer = Buffer.from(data, 'base64');
        vaultDb.importDbBinary(buffer);
        const allTx = vaultDb.getAllTransactions();
        res.json({ success: true, total: allTx.length });
      } else {
        res.status(400).json({ error: 'Unsupported format' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Optional AI Categorization helper with Gemini
  app.post('/api/ai/categorize', async (req, res) => {
    try {
      const { descriptions } = req.body;
      if (!Array.isArray(descriptions) || descriptions.length === 0) {
        res.json({ categories: [] });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        // Fallback to local rule engine
        const fallback = descriptions.map((desc: string) => ({
          description: desc,
          category: vaultDb.categorize(desc),
          clean_merchant: vaultDb.guessMerchant(desc)
        }));
        res.json({ categories: fallback });
        return;
      }

      const prompt = `You are a financial transaction categorizer. Categorize each transaction into one of these standard categories:
Income, Groceries, Dining Out, Coffee & Drinks, Shopping, Transportation, Gas & Fuel, Entertainment & Subscriptions, Utilities & Bills, Rent & Housing, Health & Pharmacy, Fitness & Wellness, Travel & Lodging, Education, Investments, Miscellaneous.

Also extract a clean merchant brand name.

Input descriptions:
${JSON.stringify(descriptions.slice(0, 50))}

Return JSON matching this schema:
Array of { "description": string, "category": string, "clean_merchant": string }`;

      const { text } = await callGeminiModelWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (text) {
        const parsed = JSON.parse(text);
        res.json({ categories: parsed });
        return;
      }

      // Fallback if empty text
      const fallback = descriptions.map((desc: string) => ({
        description: desc,
        category: vaultDb.categorize(desc),
        clean_merchant: vaultDb.guessMerchant(desc)
      }));
      res.json({ categories: fallback });
    } catch (err: any) {
      console.warn('AI categorization failed, using local rules:', err.message);
      const { descriptions } = req.body;
      const fallback = (descriptions || []).map((desc: string) => ({
        description: desc,
        category: vaultDb.categorize(desc),
        clean_merchant: vaultDb.guessMerchant(desc)
      }));
      res.json({ categories: fallback });
    }
  });

  // Seed sample transactions
  app.post('/api/seed-sample-data', (req, res) => {
    try {
      const sampleData: Partial<TransactionRecord>[] = [
        // August 2026 transactions
        { date: '2026-08-01', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'WHOLEFDS SOMA #10243 SAN FRANCISCO CA', clean_merchant: 'Whole Foods Market', category: 'Groceries', amount: -142.85, type: 'outflow', notes: 'Weekly groceries' },
        { date: '2026-08-01', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'UBER TRIP HELP.UBER.COM CA', clean_merchant: 'Uber', category: 'Transportation', amount: -28.40, type: 'outflow' },
        { date: '2026-08-02', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL 883920', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow', notes: 'Bi-weekly salary' },
        { date: '2026-08-03', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'SWEETGREEN MISSION SAN FRANCISCO', clean_merchant: 'Sweetgreen', category: 'Dining Out', amount: -18.75, type: 'outflow' },
        { date: '2026-08-04', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'BLUE BOTTLE COFFEE HAYES VALLEY', clean_merchant: 'Blue Bottle Coffee', category: 'Coffee & Drinks', amount: -7.50, type: 'outflow' },
        { date: '2026-08-05', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'APPLE.COM/BILL 866-712-7753 CA', clean_merchant: 'Apple Services', category: 'Entertainment & Subscriptions', amount: -14.99, type: 'outflow' },
        { date: '2026-08-06', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'TRADER JOE 451 MARKET ST', clean_merchant: 'Trader Joe\'s', category: 'Groceries', amount: -86.30, type: 'outflow' },
        { date: '2026-08-07', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'NETFLIX.COM LOS GATOS CA', clean_merchant: 'Netflix', category: 'Entertainment & Subscriptions', amount: -22.99, type: 'outflow' }, // Price hike from 19.99
        { date: '2026-08-08', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'CHEVRON 0092304 SAN FRANCISCO CA', clean_merchant: 'Chevron', category: 'Gas & Fuel', amount: -58.20, type: 'outflow' },
        { date: '2026-08-09', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'CHIPOTLE 1289 NEWARK CA', clean_merchant: 'Chipotle Mexican Grill', category: 'Dining Out', amount: -16.45, type: 'outflow' },
        { date: '2026-08-10', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'OPENAI *CHATGPT SUBSCRIPTION OPENAI.COM CA', clean_merchant: 'ChatGPT Plus', category: 'Software & Technology', amount: -20.00, type: 'outflow' },
        { date: '2026-08-11', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'PG&E PACIFIC GAS & ELECTRIC EBILL', clean_merchant: 'PG&E', category: 'Utilities & Bills', amount: -135.40, type: 'outflow' },
        { date: '2026-08-12', institution: 'Amex', account_name: 'Amex Platinum', raw_description: 'EQUINOX FITNESS CLUBS SAN FRANCISCO', clean_merchant: 'Equinox Fitness', category: 'Fitness & Wellness', amount: -280.00, type: 'outflow' },
        { date: '2026-08-14', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'CVS PHARMACY #9822 SAN FRANCISCO', clean_merchant: 'CVS Pharmacy', category: 'Health & Pharmacy', amount: -34.18, type: 'outflow' },
        { date: '2026-08-15', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL 883920', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow', notes: 'Bi-weekly salary' },
        { date: '2026-08-16', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'FIDELITY BROKERAGE AUTOMATIC INVESTMENT', clean_merchant: 'Fidelity Investments', category: 'Investments', amount: -1000.00, type: 'outflow', notes: 'S&P 500 DCA' },
        { date: '2026-08-17', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'STARBUCKS STORE 08442 SF', clean_merchant: 'Starbucks', category: 'Coffee & Drinks', amount: -6.85, type: 'outflow' },
        { date: '2026-08-18', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'TARGET T-0924 SAN FRANCISCO CA', clean_merchant: 'Target', category: 'Shopping', amount: -79.94, type: 'outflow' },
        { date: '2026-08-19', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'SPOTIFY USA NEW YORK NY', clean_merchant: 'Spotify', category: 'Entertainment & Subscriptions', amount: -11.99, type: 'outflow' },
        { date: '2026-08-20', institution: 'Amex', account_name: 'Amex Platinum', raw_description: 'AMAZON PRIME ANNUAL MEMBERSHIP SEATTLE WA', clean_merchant: 'Amazon Prime', category: 'Entertainment & Subscriptions', amount: -139.00, type: 'outflow', notes: 'Annual renewal' },
        { date: '2026-08-21', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'SAFEWAY #1490 MARINA BLVD SF', clean_merchant: 'Safeway', category: 'Groceries', amount: -62.10, type: 'outflow' },
        { date: '2026-08-22', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'INTEREST PAYMENT CHASE SAVINGS', clean_merchant: 'Chase Bank Interest', category: 'Income', amount: 18.42, type: 'inflow' },
        { date: '2026-08-23', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'YOUTUBE PREMIUM GOOGLE*SERVICES CA', clean_merchant: 'YouTube Premium', category: 'Entertainment & Subscriptions', amount: -13.99, type: 'outflow' },
        { date: '2026-08-24', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'NYTIMES DIGITAL SUBSCRIPTION NEW YORK NY', clean_merchant: 'New York Times', category: 'Entertainment & Subscriptions', amount: -4.00, type: 'outflow' },

        // July 2026 transactions (showing recurring cycle pattern)
        { date: '2026-07-02', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow' },
        { date: '2026-07-05', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'APPLE.COM/BILL 866-712-7753 CA', clean_merchant: 'Apple Services', category: 'Entertainment & Subscriptions', amount: -14.99, type: 'outflow' },
        { date: '2026-07-07', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'NETFLIX.COM LOS GATOS CA', clean_merchant: 'Netflix', category: 'Entertainment & Subscriptions', amount: -19.99, type: 'outflow' }, // Earlier lower price
        { date: '2026-07-10', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'OPENAI *CHATGPT SUBSCRIPTION OPENAI.COM CA', clean_merchant: 'ChatGPT Plus', category: 'Software & Technology', amount: -20.00, type: 'outflow' },
        { date: '2026-07-11', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'PG&E PACIFIC GAS & ELECTRIC EBILL', clean_merchant: 'PG&E', category: 'Utilities & Bills', amount: -128.50, type: 'outflow' },
        { date: '2026-07-12', institution: 'Amex', account_name: 'Amex Platinum', raw_description: 'EQUINOX FITNESS CLUBS SAN FRANCISCO', clean_merchant: 'Equinox Fitness', category: 'Fitness & Wellness', amount: -280.00, type: 'outflow' },
        { date: '2026-07-15', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow' },
        { date: '2026-07-19', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'SPOTIFY USA NEW YORK NY', clean_merchant: 'Spotify', category: 'Entertainment & Subscriptions', amount: -11.99, type: 'outflow' },
        { date: '2026-07-20', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'RENT PAYMENT LUXURY APTS PROPERTY', clean_merchant: 'Property Management', category: 'Rent & Housing', amount: -2400.00, type: 'outflow' },
        { date: '2026-07-23', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'YOUTUBE PREMIUM GOOGLE*SERVICES CA', clean_merchant: 'YouTube Premium', category: 'Entertainment & Subscriptions', amount: -13.99, type: 'outflow' },
        { date: '2026-07-24', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'NYTIMES DIGITAL SUBSCRIPTION NEW YORK NY', clean_merchant: 'New York Times', category: 'Entertainment & Subscriptions', amount: -4.00, type: 'outflow' },

        // June 2026 transactions (establishing 3-cycle recurring cadence)
        { date: '2026-06-02', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow' },
        { date: '2026-06-05', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'APPLE.COM/BILL 866-712-7753 CA', clean_merchant: 'Apple Services', category: 'Entertainment & Subscriptions', amount: -14.99, type: 'outflow' },
        { date: '2026-06-07', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'NETFLIX.COM LOS GATOS CA', clean_merchant: 'Netflix', category: 'Entertainment & Subscriptions', amount: -19.99, type: 'outflow' },
        { date: '2026-06-10', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'OPENAI *CHATGPT SUBSCRIPTION OPENAI.COM CA', clean_merchant: 'ChatGPT Plus', category: 'Software & Technology', amount: -20.00, type: 'outflow' },
        { date: '2026-06-11', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'PG&E PACIFIC GAS & ELECTRIC EBILL', clean_merchant: 'PG&E', category: 'Utilities & Bills', amount: -121.10, type: 'outflow' },
        { date: '2026-06-12', institution: 'Amex', account_name: 'Amex Platinum', raw_description: 'EQUINOX FITNESS CLUBS SAN FRANCISCO', clean_merchant: 'Equinox Fitness', category: 'Fitness & Wellness', amount: -280.00, type: 'outflow' },
        { date: '2026-06-15', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow' },
        { date: '2026-06-18', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'RENT PAYMENT LUXURY APTS PROPERTY', clean_merchant: 'Property Management', category: 'Rent & Housing', amount: -2400.00, type: 'outflow' },
        { date: '2026-06-19', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'SPOTIFY USA NEW YORK NY', clean_merchant: 'Spotify', category: 'Entertainment & Subscriptions', amount: -11.99, type: 'outflow' },
        { date: '2026-06-23', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'YOUTUBE PREMIUM GOOGLE*SERVICES CA', clean_merchant: 'YouTube Premium', category: 'Entertainment & Subscriptions', amount: -13.99, type: 'outflow' },
        { date: '2026-06-24', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'NYTIMES DIGITAL SUBSCRIPTION NEW YORK NY', clean_merchant: 'New York Times', category: 'Entertainment & Subscriptions', amount: -4.00, type: 'outflow' },
        { date: '2026-06-25', institution: 'Amex', account_name: 'Amex Platinum', raw_description: 'DELTA AIR LINES 00623910 ATLANTA', clean_merchant: 'Delta Air Lines', category: 'Travel & Lodging', amount: -480.20, type: 'outflow' }
      ];

      const result = vaultDb.saveTransactions(sampleData);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Financial Vault Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
