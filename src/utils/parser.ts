import Papa from 'papaparse';
import { StagingTransaction, InstitutionType } from '../types';
import { categorizeTransaction, cleanMerchantName, generateTransactionId } from './categorizer';
import { scrubPII } from './security';

export function parseStatementFile(
  content: string,
  institution: InstitutionType | string,
  accountName: string,
  existingIds: Set<string>
): StagingTransaction[] {
  const trimmed = content.trim();

  // 1. Check if it's JSON
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsedJson = JSON.parse(trimmed);
      const items = Array.isArray(parsedJson) ? parsedJson : (parsedJson.transactions || [parsedJson]);
      if (Array.isArray(items) && items.length > 0 && (items[0].amount !== undefined || items[0].date !== undefined)) {
        return parseJsonTransactions(items, institution, accountName, existingIds);
      }
    } catch {
      // Fall through to CSV
    }
  }

  // 2. Check if it's OFX / QFX / QBO
  if (trimmed.includes('<OFX>') || trimmed.includes('<STMTTRN>') || trimmed.includes('OFXHEADER')) {
    const ofxResults = parseOfxContent(trimmed, institution, accountName, existingIds);
    if (ofxResults.length > 0) return ofxResults;
  }

  // 3. Try CSV parsing with auto-delimiter detection
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    delimitersToGuess: [',', '\t', ';', '|']
  });

  if (parsed.data && parsed.data.length > 0 && Object.keys(parsed.data[0] as object).length > 1) {
    const csvResults = parseCsvRows(parsed.data as Record<string, string>[], institution, accountName, existingIds);
    if (csvResults.length > 0) return csvResults;
  }

  // 4. Fallback to line-by-line / PDF text extracted parser
  return parseRawTextLines(content, institution, accountName, existingIds);
}

function parseJsonTransactions(
  items: any[],
  institution: string,
  accountName: string,
  existingIds: Set<string>
): StagingTransaction[] {
  const transactions: StagingTransaction[] = [];

  items.forEach((item, i) => {
    const rawAmt = item.amount ?? item.Amount ?? item.total ?? 0;
    const numAmt = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.-]/g, '')) || 0;
    const initialDesc = item.description || item.raw_description || item.merchant || item.clean_merchant || item.name || item.memo || item.payee || 'Transaction';
    const rawDesc = scrubPII(initialDesc);
    const rawDate = item.date || item.Date || item.transaction_date || item.posted_date || new Date().toISOString().split('T')[0];
    const formattedDate = normalizeDate(rawDate);
    const category = item.category || categorizeTransaction(rawDesc);
    const cleanMerchant = item.clean_merchant ? scrubPII(item.clean_merchant) : cleanMerchantName(rawDesc);
    const type: 'inflow' | 'outflow' = item.type || (numAmt >= 0 ? 'inflow' : 'outflow');
    const hashId = item.id || generateTransactionId(formattedDate, rawDesc, numAmt, institution);
    const isDuplicate = existingIds.has(hashId);

    transactions.push({
      tempId: `staging-json-${Date.now()}-${i}`,
      id: hashId,
      date: formattedDate,
      institution: item.institution || institution || 'JSON Import',
      account_name: item.account_name || accountName || `${institution} Account`,
      raw_description: rawDesc,
      clean_merchant: cleanMerchant,
      category,
      amount: numAmt,
      type,
      notes: item.notes,
      tags: item.tags,
      isDuplicate
    });
  });

  return transactions;
}

function parseOfxContent(
  ofx: string,
  institution: string,
  accountName: string,
  existingIds: Set<string>
): StagingTransaction[] {
  const transactions: StagingTransaction[] = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = stmtTrnRegex.exec(ofx)) !== null) {
    const block = match[1];
    
    // Extract fields
    const trnTypeMatch = block.match(/<TRNTYPE>([^\r\n<]+)/i);
    const dtPostedMatch = block.match(/<DTPOSTED>([0-9]{8})/i);
    const trnAmtMatch = block.match(/<TRNAMT>([^\r\n<]+)/i);
    const nameMatch = block.match(/<NAME>([^\r\n<]+)/i);
    const memoMatch = block.match(/<MEMO>([^\r\n<]+)/i);

    const rawAmt = trnAmtMatch ? parseFloat(trnAmtMatch[1].trim()) : 0;
    const initialDesc = (nameMatch ? nameMatch[1].trim() : '') + (memoMatch ? ` ${memoMatch[1].trim()}` : '') || 'OFX Transaction';
    const desc = scrubPII(initialDesc);
    
    let formattedDate = new Date().toISOString().split('T')[0];
    if (dtPostedMatch) {
      const y = dtPostedMatch[1].substring(0, 4);
      const m = dtPostedMatch[1].substring(4, 6);
      const d = dtPostedMatch[1].substring(6, 8);
      formattedDate = `${y}-${m}-${d}`;
    }

    const cleanMerchant = cleanMerchantName(desc);
    const category = categorizeTransaction(desc);
    const hashId = generateTransactionId(formattedDate, desc, rawAmt, institution);
    const isDuplicate = existingIds.has(hashId);

    transactions.push({
      tempId: `staging-ofx-${Date.now()}-${idx++}`,
      id: hashId,
      date: formattedDate,
      institution: institution || 'OFX Import',
      account_name: accountName || `${institution} Statement`,
      raw_description: desc,
      clean_merchant: cleanMerchant,
      category,
      amount: rawAmt,
      type: rawAmt >= 0 ? 'inflow' : 'outflow',
      isDuplicate
    });
  }

  return transactions;
}

function parseCsvRows(
  rows: Record<string, string>[],
  institution: InstitutionType | string,
  accountName: string,
  existingIds: Set<string>
): StagingTransaction[] {
  const transactions: StagingTransaction[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const keys = Object.keys(row);
    if (keys.length === 0) continue;

    let date = '';
    let description = '';
    let amount = 0;
    let category = '';
    let type: 'inflow' | 'outflow' = 'outflow';

    // Normalize keys
    const lowerMap: Record<string, string> = {};
    for (const k of keys) {
      if (k && row[k] !== undefined) {
        lowerMap[k.toLowerCase().trim()] = String(row[k]).trim();
      }
    }

    // Canadian Bank Specific (RBC, TD, BMO, CIBC, Scotiabank, Tangerine)
    if (institution === 'RBC' || lowerMap['cad$'] !== undefined || lowerMap['usd$'] !== undefined || lowerMap['description 1'] !== undefined) {
      date = lowerMap['transaction date'] || lowerMap['date'] || '';
      description = [lowerMap['description 1'], lowerMap['description 2']].filter(Boolean).join(' ') || lowerMap['description'] || '';
      const rawAmt = lowerMap['cad$'] || lowerMap['usd$'] || lowerMap['amount'] || '0';
      const parsedAmt = parseAmountString(rawAmt);
      amount = parsedAmt;
      type = amount >= 0 ? 'inflow' : 'outflow';
    } else if (institution === 'TD' || (lowerMap['debit'] !== undefined && lowerMap['credit'] !== undefined)) {
      date = lowerMap['date'] || lowerMap['transaction date'] || '';
      description = lowerMap['description'] || lowerMap['activity'] || lowerMap['memo'] || '';
      const debit = parseAmountString(lowerMap['debit'] || '');
      const credit = parseAmountString(lowerMap['credit'] || '');
      if (debit !== 0) {
        amount = -Math.abs(debit);
        type = 'outflow';
      } else if (credit !== 0) {
        amount = Math.abs(credit);
        type = 'inflow';
      } else {
        amount = parseAmountString(lowerMap['amount'] || '0');
        type = amount >= 0 ? 'inflow' : 'outflow';
      }
    } else if (institution === 'Chase') {
      date = lowerMap['transaction date'] || lowerMap['posting date'] || lowerMap['post date'] || lowerMap['date'] || '';
      description = lowerMap['description'] || lowerMap['memo'] || lowerMap['payee'] || '';
      category = lowerMap['category'] || '';
      const rawAmt = lowerMap['amount'] || '0';
      const parsedAmt = parseAmountString(rawAmt);
      amount = parsedAmt;
      type = amount >= 0 ? 'inflow' : 'outflow';
    } else if (institution === 'Amex') {
      date = lowerMap['date'] || lowerMap['transaction date'] || '';
      description = lowerMap['description'] || lowerMap['details'] || '';
      const rawAmt = lowerMap['amount'] || '0';
      const parsedAmt = parseAmountString(rawAmt);
      // Amex credit card statements: positive = charge (expense), negative = payment/credit
      if (parsedAmt > 0) {
        amount = -parsedAmt;
        type = 'outflow';
      } else {
        amount = Math.abs(parsedAmt);
        type = 'inflow';
      }
    } else if (institution === 'Apple Card') {
      date = lowerMap['transaction date'] || lowerMap['clearing date'] || lowerMap['date'] || '';
      description = lowerMap['description'] || lowerMap['merchant'] || '';
      category = lowerMap['category'] || '';
      const rawAmt = lowerMap['amount (usd)'] || lowerMap['amount'] || '0';
      const parsedAmt = parseAmountString(rawAmt);
      const cardType = lowerMap['type']?.toLowerCase() || '';
      if (cardType.includes('payment') || cardType.includes('refund')) {
        amount = Math.abs(parsedAmt);
        type = 'inflow';
      } else {
        amount = -Math.abs(parsedAmt);
        type = 'outflow';
      }
    } else {
      // Universal Smart Parser
      date = lowerMap['date'] || lowerMap['trans date'] || lowerMap['transaction date'] || lowerMap['posting date'] || lowerMap['time'] || lowerMap['posted'] || '';
      description = lowerMap['description'] || lowerMap['memo'] || lowerMap['payee'] || lowerMap['name'] || lowerMap['narrative'] || lowerMap['merchant'] || lowerMap['details'] || lowerMap['title'] || '';
      category = lowerMap['category'] || lowerMap['tag'] || '';

      // Check for separated Debit / Credit or Outflow / Inflow columns
      const debit = parseAmountString(lowerMap['debit'] || lowerMap['outflow'] || lowerMap['withdrawal'] || lowerMap['charge'] || '');
      const credit = parseAmountString(lowerMap['credit'] || lowerMap['inflow'] || lowerMap['deposit'] || lowerMap['payment'] || '');

      if (debit !== 0) {
        amount = -Math.abs(debit);
        type = 'outflow';
      } else if (credit !== 0) {
        amount = Math.abs(credit);
        type = 'inflow';
      } else {
        const rawAmt = lowerMap['amount'] || lowerMap['total'] || lowerMap['net amount'] || lowerMap['value'] || '0';
        const parsedAmt = parseAmountString(rawAmt);
        amount = parsedAmt;
        type = amount >= 0 ? 'inflow' : 'outflow';
      }
    }

    if (!description && !date && amount === 0) continue;
    if (!description) description = 'Transaction';

    // Scrub PII from description
    const scrubbedDesc = scrubPII(description);
    const formattedDate = normalizeDate(date);
    if (!category) {
      category = categorizeTransaction(scrubbedDesc);
    }
    const cleanMerchant = cleanMerchantName(scrubbedDesc);
    const hashId = generateTransactionId(formattedDate, scrubbedDesc, amount, institution);
    const isDuplicate = existingIds.has(hashId);

    transactions.push({
      tempId: `staging-${Date.now()}-${i}`,
      id: hashId,
      date: formattedDate,
      institution: institution || 'Universal CSV',
      account_name: accountName || `${institution} Account`,
      raw_description: scrubbedDesc,
      clean_merchant: cleanMerchant,
      category: category || 'Miscellaneous',
      amount,
      type,
      isDuplicate
    });
  }

  return transactions;
}

function parseAmountString(raw: string): number {
  if (!raw) return 0;
  let str = String(raw).trim();
  
  // Handle Accounting format: ($124.50) -> -124.50
  const isParenNegative = /^\(.*\)$/.test(str);
  if (isParenNegative) {
    str = '-' + str.replace(/[()]/g, '');
  }

  // Remove currency symbols, commas, CAD/USD tags
  const clean = str.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

function parseRawTextLines(
  rawText: string,
  institution: InstitutionType | string,
  accountName: string,
  existingIds: Set<string>
): StagingTransaction[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const transactions: StagingTransaction[] = [];

  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i;
  const amountPattern = /(-?\$?\s*\d+(?:,\d{3})*(?:\.\d{2})?|\(\$?\s*\d+(?:,\d{3})*(?:\.\d{2})?\))/;

  lines.forEach((line, idx) => {
    // Skip headers or summary lines
    if (/balance|statement period|page \d|account number/i.test(line) && !line.match(amountPattern)) {
      return;
    }

    const dateMatch = line.match(datePattern);
    const amountMatch = line.match(amountPattern);

    if (dateMatch && amountMatch) {
      const rawDate = dateMatch[0];
      const parsedAmt = parseAmountString(amountMatch[0]);

      let desc = line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim();
      desc = desc.replace(/^[-|:,\s]+/, '').replace(/[-|:,\s]+$/, '').trim();

      if (desc.length > 1 && !isNaN(parsedAmt) && parsedAmt !== 0) {
        const scrubbedDesc = scrubPII(desc);
        const formattedDate = normalizeDate(rawDate);
        const amount = parsedAmt < 0 
          ? parsedAmt 
          : (line.toLowerCase().includes('deposit') || line.toLowerCase().includes('payroll') || line.toLowerCase().includes('credit') || line.toLowerCase().includes('refund') 
              ? parsedAmt 
              : -parsedAmt);

        const category = categorizeTransaction(scrubbedDesc);
        const cleanMerchant = cleanMerchantName(scrubbedDesc);
        const hashId = generateTransactionId(formattedDate, scrubbedDesc, amount, institution);
        const isDuplicate = existingIds.has(hashId);

        transactions.push({
          tempId: `staging-txt-${Date.now()}-${idx}`,
          id: hashId,
          date: formattedDate,
          institution: institution || 'Text Statement',
          account_name: accountName || `${institution} Account`,
          raw_description: scrubbedDesc,
          clean_merchant: cleanMerchant,
          category,
          amount,
          type: amount >= 0 ? 'inflow' : 'outflow',
          isDuplicate
        });
      }
    }
  });

  return transactions;
}

function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const trimmed = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // YYYYMMDD
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.substring(0, 4)}-${trimmed.substring(4, 6)}-${trimmed.substring(6, 8)}`;
  }

  // MM/DD/YYYY or M/D/YY or DD/MM/YYYY
  const slashParts = trimmed.split(/[\/\-]/);
  if (slashParts.length === 3) {
    let year = slashParts[2];
    if (year.length === 2) year = `20${year}`;
    let month = slashParts[0].padStart(2, '0');
    let day = slashParts[1].padStart(2, '0');
    
    // If year is first (YYYY/MM/DD)
    if (slashParts[0].length === 4) {
      year = slashParts[0];
      month = slashParts[1].padStart(2, '0');
      day = slashParts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

export function generateSampleStatement(institution: string): string {
  if (institution === 'Chase') {
    return `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
08/15/2026,08/16/2026,WHOLEFDS SOMA #10243,Food & Drink,Sale,-124.50,
08/16/2026,08/17/2026,UBER TRIP CA SAN FRANCISCO,Travel,Sale,-32.10,
08/17/2026,08/18/2026,STARBUCKS STORE 08442,Food & Drink,Sale,-6.85,
08/18/2026,08/19/2026,AMZN Mktp US*2K4J299,Shopping,Sale,-45.99,
08/19/2026,08/20/2026,CHEVRON 0092304 SAN FRANCISCO,Gas,Sale,-62.40,
08/20/2026,08/21/2026,SWEETGREEN MISSION SF,Food & Drink,Sale,-18.25,
08/21/2026,08/22/2026,DIRECT DEP TECH CORP PAYROLL 883920,Income,Deposit,4850.00,Salary Deposit
08/22/2026,08/22/2026,NETFLIX.COM LOS GATOS CA,Bills & Utilities,Sale,-22.99,`;
  }

  if (institution === 'Amex') {
    return `Date,Description,Amount,Extended Details
08/14/2026,EQUINOX FITNESS CLUBS SF,280.00,Monthly membership
08/15/2026,DOORDASH*NOBU RESTAURANT,88.40,Dinner order
08/16/2026,BLUE BOTTLE COFFEE HAYES,7.50,Espresso and pastry
08/17/2026,DELTA AIR LINES 00623910,420.80,Flight SFO to JFK
08/18/2026,CHIPOTLE 1289 NEWARK CA,16.45,Burrito bowl
08/19/2026,AUTOPAY PAYMENT RECEIVED - THANK YOU,-813.15,Online payment`;
  }

  if (institution === 'RBC' || institution === 'RBC Royal Bank') {
    return `Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$
Chequing,102-992-1,08/10/2026,,PAYROLL DIRECT DEP TECH CORP,,4650.00
Chequing,102-992-1,08/11/2026,,LOBLAWS SUPERSTORE #1029,, -134.80
Chequing,102-992-1,08/12/2026,,TIM HORTONS #4928 TORONTO,, -5.45
Chequing,102-992-1,08/14/2026,,TORONTO HYDRO ELEC BILL,, -112.30
Chequing,102-992-1,08/16/2026,,SHOPPERS DRUG MART #082,, -42.15
Chequing,102-992-1,08/18/2026,,METROLINX PRESTO AUTO-LOAD,, -50.00`;
  }

  if (institution === 'TD' || institution === 'TD Canada Trust') {
    return `Date,Description,Debit,Credit,Balance
08/10/2026,EMPLOYER PAYROLL DIRECT DEPOSIT,,4500.00,12450.00
08/11/2026,METRO GROCERY STORE TORONTO,86.40,,12363.60
08/12/2026,UBER TRIP HELP.UBER.COM,24.50,,12339.10
08/14/2026,ROGERS COMMUNICATIONS BILL,95.00,,12244.10
08/15/2026,AMAZON.CA*PRIME SUBSCRIPTION,12.99,,12231.11`;
  }

  if (institution === 'Apple Card') {
    return `Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD)
08/10/2026,08/11/2026,APPLE.COM/BILL 866-712-7753 CA,Apple,Services,Purchase,14.99
08/12/2026,08/13/2026,SPOTIFY USA NEW YORK NY,Spotify,Entertainment,Purchase,11.99
08/14/2026,08/15/2026,TARGET T-0924 SAN FRANCISCO,Target,Merchandise,Purchase,74.20
08/16/2026,08/17/2026,CVS PHARMACY #9822 SF,CVS,Health,Purchase,28.45
08/18/2026,08/19/2026,Daily Cash Adjustment,Apple,Reward,Adjustment,1.48`;
  }

  return `Date,Description,Amount,Account
2026-08-15,WHOLEFDS SOMA #10243,-124.50,Checking
2026-08-16,DIRECT DEP TECH CORP PAYROLL,4850.00,Checking
2026-08-17,PG&E PACIFIC GAS & ELECTRIC,-135.40,Checking
2026-08-18,UBER TRIP CA SAN FRANCISCO,-32.10,Checking
2026-08-19,TRADER JOE 451 MARKET ST,-68.90,Checking`;
}
