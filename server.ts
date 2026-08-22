import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { vaultDb, TransactionRecord } from './src/server/database';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize SQLite Database
  await vaultDb.init();

  // --- API Endpoints ---

  // Parse Document / Statement (PDF, Image, CSV, OFX, Text) with AI & regex fallback
  app.post('/api/documents/parse', async (req, res) => {
    try {
      const { fileName, fileType, base64Data, textContent, institution, accountName } = req.body;
      const isPdfOrImage = fileType?.includes('pdf') || fileType?.includes('image') || fileName?.endsWith('.pdf') || fileName?.endsWith('.png') || fileName?.endsWith('.jpg') || fileName?.endsWith('.jpeg') || fileName?.endsWith('.webp');

      // If PDF or Image and GEMINI_API_KEY is available, use multimodal Gemini 3.7 Flash
      if (isPdfOrImage && base64Data && process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build'
              }
            }
          });

          let mimeType = fileType || (fileName?.endsWith('.pdf') ? 'application/pdf' : 'image/png');
          if (mimeType.includes('pdf')) mimeType = 'application/pdf';
          else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) mimeType = 'image/jpeg';
          else if (mimeType.includes('png')) mimeType = 'image/png';
          else if (mimeType.includes('webp')) mimeType = 'image/webp';

          const prompt = `You are a financial document parser. Extract all transaction rows from this bank statement, credit card statement, receipt, or invoice.

For each transaction, output a JSON object with:
- "date": string in YYYY-MM-DD format (use current year 2026 if year is omitted)
- "raw_description": exact memo or description text from the statement
- "clean_merchant": clean normalized merchant name (e.g. "Whole Foods", "Starbucks", "Uber", "Apple", "Costco", "Walmart", "Payroll", "Hydro")
- "category": one of [Income, Groceries, Dining Out, Coffee & Drinks, Shopping, Transportation, Gas & Fuel, Entertainment & Subscriptions, Utilities & Bills, Rent & Housing, Health & Pharmacy, Fitness & Wellness, Travel & Lodging, Investments, Education, Miscellaneous]
- "amount": number (negative for expenses/debits like -42.50, positive for income/deposits/credits like 3200.00)
- "type": "outflow" for expenses/debits, "inflow" for deposits/credits

Return a JSON array only.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
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

          const rawJson = response.text;
          if (rawJson) {
            const parsedArray = JSON.parse(rawJson);
            if (Array.isArray(parsedArray)) {
              const transactions = parsedArray.map((t: any, idx: number) => ({
                date: t.date || new Date().toISOString().split('T')[0],
                institution: institution || 'Document Upload',
                account_name: accountName || 'Imported Document Account',
                raw_description: t.raw_description || t.description || 'Document Transaction',
                clean_merchant: t.clean_merchant || t.raw_description || 'Merchant',
                category: t.category || 'Miscellaneous',
                amount: typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0,
                type: t.type || (t.amount >= 0 ? 'inflow' : 'outflow')
              }));
              res.json({ success: true, method: 'ai_gemini_multimodal', transactions });
              return;
            }
          }
        } catch (aiErr: any) {
          console.warn('AI document parsing error, falling back to text regex:', aiErr.message);
        }
      }

      // If PDF with binary base64 and AI is offline, extract printable text strings
      let textToParse = textContent || '';
      if (!textToParse && base64Data) {
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          // Extract ascii text sequences from buffer
          const rawStr = buffer.toString('utf-8');
          const printable = rawStr.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
          textToParse = printable;
        } catch {
          textToParse = '';
        }
      }

      res.json({ success: true, method: 'raw_text_ready', textToParse });
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

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a financial transaction categorizer. Categorize each transaction into one of these standard categories:
Income, Groceries, Dining Out, Coffee & Drinks, Shopping, Transportation, Gas & Fuel, Entertainment & Subscriptions, Utilities & Bills, Rent & Housing, Health & Pharmacy, Fitness & Wellness, Travel & Lodging, Education, Investments, Miscellaneous.

Also extract a clean merchant brand name.

Input descriptions:
${JSON.stringify(descriptions.slice(0, 50))}

Return JSON matching this schema:
Array of { "description": string, "category": string, "clean_merchant": string }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
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
        { date: '2026-08-01', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'WHOLEFDS SOMA #10243 SAN FRANCISCO CA', clean_merchant: 'Whole Foods Market', category: 'Groceries', amount: -142.85, type: 'outflow', notes: 'Weekly groceries' },
        { date: '2026-08-01', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'UBER TRIP HELP.UBER.COM CA', clean_merchant: 'Uber', category: 'Transportation', amount: -28.40, type: 'outflow' },
        { date: '2026-08-02', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL 883920', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow', notes: 'Bi-weekly salary' },
        { date: '2026-08-03', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'SWEETGREEN MISSION SAN FRANCISCO', clean_merchant: 'Sweetgreen', category: 'Dining Out', amount: -18.75, type: 'outflow' },
        { date: '2026-08-04', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'BLUE BOTTLE COFFEE HAYES VALLEY', clean_merchant: 'Blue Bottle Coffee', category: 'Coffee & Drinks', amount: -7.50, type: 'outflow' },
        { date: '2026-08-05', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'APPLE.COM/BILL 866-712-7753 CA', clean_merchant: 'Apple Services (iCloud + Music)', category: 'Entertainment & Subscriptions', amount: -14.99, type: 'outflow' },
        { date: '2026-08-06', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'TRADER JOE 451 MARKET ST', clean_merchant: 'Trader Joe\'s', category: 'Groceries', amount: -86.30, type: 'outflow' },
        { date: '2026-08-07', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'NETFLIX.COM LOS GATOS CA', clean_merchant: 'Netflix', category: 'Entertainment & Subscriptions', amount: -22.99, type: 'outflow' },
        { date: '2026-08-08', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'CHEVRON 0092304 SAN FRANCISCO CA', clean_merchant: 'Chevron', category: 'Gas & Fuel', amount: -58.20, type: 'outflow' },
        { date: '2026-08-09', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'CHIPOTLE 1289 NEWARK CA', clean_merchant: 'Chipotle Mexican Grill', category: 'Dining Out', amount: -16.45, type: 'outflow' },
        { date: '2026-08-10', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'AMZN Mktp US*2K4J299 Seattle WA', clean_merchant: 'Amazon', category: 'Shopping', amount: -64.12, type: 'outflow' },
        { date: '2026-08-11', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'PG&E PACIFIC GAS & ELECTRIC EBILL', clean_merchant: 'PG&E', category: 'Utilities & Bills', amount: -135.40, type: 'outflow' },
        { date: '2026-08-12', institution: 'Amex', account_name: 'Amex Platinum', raw_description: 'EQUINOX FITNESS CLUBS SAN FRANCISCO', clean_merchant: 'Equinox', category: 'Fitness & Wellness', amount: -280.00, type: 'outflow' },
        { date: '2026-08-14', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'CVS PHARMACY #9822 SAN FRANCISCO', clean_merchant: 'CVS Pharmacy', category: 'Health & Pharmacy', amount: -34.18, type: 'outflow' },
        { date: '2026-08-15', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL 883920', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow', notes: 'Bi-weekly salary' },
        { date: '2026-08-16', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'FIDELITY BROKERAGE AUTOMATIC INVESTMENT', clean_merchant: 'Fidelity Investments', category: 'Investments', amount: -1000.00, type: 'outflow', notes: 'S&P 500 DCA' },
        { date: '2026-08-17', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'STARBUCKS STORE 08442 SF', clean_merchant: 'Starbucks', category: 'Coffee & Drinks', amount: -6.85, type: 'outflow' },
        { date: '2026-08-18', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'TARGET T-0924 SAN FRANCISCO CA', clean_merchant: 'Target', category: 'Shopping', amount: -79.94, type: 'outflow' },
        { date: '2026-08-19', institution: 'Apple Card', account_name: 'Apple Card Goldman Sachs', raw_description: 'SPOTIFY USA NEW YORK NY', clean_merchant: 'Spotify', category: 'Entertainment & Subscriptions', amount: -11.99, type: 'outflow' },
        { date: '2026-08-20', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'DOORDASH*NOBU RESTAURANT SAN FRANCISCO', clean_merchant: 'Nobu (DoorDash)', category: 'Dining Out', amount: -94.50, type: 'outflow', notes: 'Date night' },
        { date: '2026-08-21', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'SAFEWAY #1490 MARINA BLVD SF', clean_merchant: 'Safeway', category: 'Groceries', amount: -62.10, type: 'outflow' },
        { date: '2026-08-22', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'INTEREST PAYMENT CHASE SAVINGS', clean_merchant: 'Chase Bank Interest', category: 'Income', amount: 18.42, type: 'inflow' },
        // Previous month data for trend charts
        { date: '2026-07-02', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow' },
        { date: '2026-07-05', institution: 'Chase', account_name: 'Chase Sapphire Reserve', raw_description: 'WHOLEFDS MARKET SF', clean_merchant: 'Whole Foods Market', category: 'Groceries', amount: -210.40, type: 'outflow' },
        { date: '2026-07-12', institution: 'Amex', account_name: 'Amex Gold Card', raw_description: 'AIRBNB HM492823 LAKE TAHOE', clean_merchant: 'Airbnb', category: 'Travel & Lodging', amount: -650.00, type: 'outflow' },
        { date: '2026-07-15', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow' },
        { date: '2026-07-20', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'RENT PAYMENT LUXURY APTS PROPERTY', clean_merchant: 'Property Management', category: 'Rent & Housing', amount: -2400.00, type: 'outflow' },
        { date: '2026-06-02', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow' },
        { date: '2026-06-15', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'DIRECT DEP TECH CORP PAYROLL', clean_merchant: 'Tech Corp Payroll', category: 'Income', amount: 4850.00, type: 'inflow' },
        { date: '2026-06-18', institution: 'Chase', account_name: 'Chase Total Checking', raw_description: 'RENT PAYMENT LUXURY APTS PROPERTY', clean_merchant: 'Property Management', category: 'Rent & Housing', amount: -2400.00, type: 'outflow' },
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
