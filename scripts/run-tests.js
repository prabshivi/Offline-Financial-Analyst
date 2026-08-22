import { categorizeTransaction, cleanMerchantName, generateTransactionId } from './src/utils/categorizer.js';
import { parseStatementFile, generateSampleStatement } from './src/utils/parser.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
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
const existingIds = new Set(chaseStaged.map(t => t.id));
const reImport = parseStatementFile(chaseSample, 'Chase', 'Chase Sapphire Reserve', existingIds);
assert(reImport.every(t => t.isDuplicate === true), 'Re-importing existing file marks 100% rows as duplicate');

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
