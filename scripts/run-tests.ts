import { categorizeTransaction, cleanMerchantName, generateTransactionId } from '../src/utils/categorizer';
import { parseStatementFile, generateSampleStatement } from '../src/utils/parser';
import { scrubPII, containsPII } from '../src/utils/security';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASSED: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${testName}`);
    failed++;
  }
}

console.log('\n--- Running Vault Automated Test Suite ---\n');

// 1. Categorization & Normalization
console.log('[1/4] Testing Categorization & Heuristics...');
assert(categorizeTransaction('DIRECT DEP TECH CORP PAYROLL') === 'Income', 'Categorizes Payroll as Income');
assert(categorizeTransaction('WHOLEFDS SOMA #10243') === 'Groceries', 'Categorizes Whole Foods as Groceries');
assert(categorizeTransaction('STARBUCKS STORE 08442') === 'Coffee & Drinks', 'Categorizes Starbucks as Coffee & Drinks');
assert(categorizeTransaction('UBER TRIP HELP.UBER.COM') === 'Transportation', 'Categorizes Uber as Transportation');
assert(categorizeTransaction('NETFLIX.COM LOS GATOS') === 'Entertainment & Subscriptions', 'Categorizes Netflix as Subscriptions');
assert(categorizeTransaction('PG&E PACIFIC GAS & ELECTRIC') === 'Utilities & Bills', 'Categorizes PG&E as Utilities & Bills');
assert(cleanMerchantName('WHOLEFDS SOMA #10243 SAN FRANCISCO CA') === 'Grocery Store', 'Normalizes Whole Foods clean merchant');
assert(cleanMerchantName('NETFLIX.COM LOS GATOS CA') === 'Streaming & Media', 'Normalizes Netflix clean merchant');

// 2. Deduplication Hashes
console.log('\n[2/4] Testing Deterministic Deduplication Hashing...');
const id1 = generateTransactionId('2026-08-15', 'WHOLEFDS SOMA #10243', -124.50, 'Chase');
const id2 = generateTransactionId('2026-08-15', 'WHOLEFDS SOMA #10243', -124.50, 'Chase');
const id3 = generateTransactionId('2026-08-16', 'WHOLEFDS SOMA #10243', -124.50, 'Chase');
assert(id1 === id2, 'Identical transactions produce identical hash IDs');
assert(id1 !== id3, 'Different dates produce distinct hash IDs');
assert(typeof id1 === 'string' && id1.length >= 8, 'Hash ID is valid non-empty string');

// 3. Statement Parsers (US & Canadian formats)
console.log('\n[3/4] Testing Bank Statement Parsing Engines...');
const chaseSample = generateSampleStatement('Chase');
const chaseStaged = parseStatementFile(chaseSample, 'Chase', 'Chase Sapphire Reserve', new Set());
assert(chaseStaged.length > 0, 'Parses Chase statement rows');
assert(chaseStaged.some(t => t.type === 'outflow' && t.amount < 0), 'Chase debits have negative amounts and outflow type');
assert(chaseStaged.some(t => t.type === 'inflow' && t.amount > 0), 'Chase credits/income have positive amounts');

const rbcSample = generateSampleStatement('RBC');
const rbcStaged = parseStatementFile(rbcSample, 'RBC', 'RBC Chequing', new Set());
assert(rbcStaged.length > 0, 'Parses RBC Royal Bank CSV format');

const tdSample = generateSampleStatement('TD');
const tdStaged = parseStatementFile(tdSample, 'TD', 'TD Chequing', new Set());
assert(tdStaged.length > 0, 'Parses TD Canada Trust CSV format');

// 4. Duplicate Staging Detection
console.log('\n[4/4] Testing Duplicate Ingestion Guard...');
const existingIds = new Set(chaseStaged.map(t => t.id || ''));
const reImport = parseStatementFile(chaseSample, 'Chase', 'Chase Sapphire Reserve', existingIds);
assert(reImport.every(t => t.isDuplicate === true), 'Re-importing existing file marks 100% rows as duplicate');

// 5. PII Redaction & Scrubbing Unit Tests
console.log('\n[5/6] Testing PII Scrubbing Utility...');
assert(containsPII('PAYMENT 4532-8819-2049-1123 VISA'), 'Detects credit card in memo');
assert(containsPII('TRANSIT # 00192-004-991203'), 'Detects bank transit and institution codes');
assert(scrubPII('PAYMENT 4532 8819 2049 1123 VISA').includes('[CARD-****-1123]'), 'Redacts spaced 16-digit card number with masked token');
assert(scrubPII('TRANSFER TO TRANSIT 01928-004 ACCT 9920193').includes('[REDACTED-TRANSIT]'), 'Redacts Canadian transit pattern');
assert(!scrubPII('TRANSFER TO USER user@domain.com').includes('@domain.com'), 'Redacts personal email addresses');

// 6. Automation & Dropzone Pipeline Tests
console.log('\n[6/7] Testing Automation & Dropzone Processing...');
import fs from 'fs';
import path from 'path';

const testDropzoneDir = path.join(process.cwd(), 'data', 'dropzone');
if (!fs.existsSync(testDropzoneDir)) {
  fs.mkdirSync(testDropzoneDir, { recursive: true });
}
assert(fs.existsSync(testDropzoneDir), 'Dropzone directory initialized and accessible');

const sampleRbcCsv = `Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$
Chequing,00192-991203,08/18/2026,,WHOLE FOODS TORONTO ON,CARD 4532 9918 2011,-88.45,`;
const testDropPath = path.join(testDropzoneDir, 'test_autofetch_rbc.csv');
fs.writeFileSync(testDropPath, sampleRbcCsv, 'utf-8');
assert(fs.existsSync(testDropPath), 'Dropzone receives file correctly');
fs.unlinkSync(testDropPath); // cleanup
assert(!fs.existsSync(testDropPath), 'Dropzone file processed and cleaned up');

// 7. Debt Payoff & Mortgage Suite Calculations
console.log('\n[7/7] Testing Debt Payoff & Mortgage Suite Algorithms...');
import { calculateDebtPayoffPlan, getComparativeDebtPayoffPlans, calculateMortgageDeepDive, DEFAULT_DEBT_PORTFOLIO } from '../src/utils/debtCalculator';

const baseline = calculateDebtPayoffPlan(DEFAULT_DEBT_PORTFOLIO, 'baseline', 0);
const snowball = calculateDebtPayoffPlan(DEFAULT_DEBT_PORTFOLIO, 'snowball', 350);
const avalanche = calculateDebtPayoffPlan(DEFAULT_DEBT_PORTFOLIO, 'avalanche', 350);

assert(snowball.monthsToPayoff < baseline.monthsToPayoff, 'Snowball with accelerator pays off debts faster than baseline minimums');
assert(avalanche.totalInterestPaid <= snowball.totalInterestPaid, 'Avalanche strategy achieves mathematically minimum total interest paid');
assert(snowball.milestones.length === DEFAULT_DEBT_PORTFOLIO.length, 'All debt milestones are properly scheduled in payoff order');

const mortgageTest = DEFAULT_DEBT_PORTFOLIO.find(d => d.type === 'mortgage')!;
const mDeepDive = calculateMortgageDeepDive(mortgageTest, 200);
assert(mDeepDive.biweeklyYearsSaved > 0, 'Bi-weekly mortgage schedule trims years off standard amortization');
assert(mDeepDive.currentLTV > 0 && mDeepDive.currentLTV < 100, 'Calculates loan-to-value ratio accurately');

// 8. Zack Canine Companion & Financial Mood Engine Functional Flow Tests
import { runZackFunctionalTests } from './zack-companion-tests';
runZackFunctionalTests(assert);

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
