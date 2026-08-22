import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface TransactionRecord {
  id: string;
  date: string;
  institution: string;
  account_name: string;
  raw_description: string;
  clean_merchant: string;
  category: string;
  amount: number;
  type: 'inflow' | 'outflow';
  notes?: string;
  tags?: string;
  created_at?: string;
}

export interface RuleRecord {
  id: string;
  pattern: string;
  category: string;
  clean_merchant: string;
  priority: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'vault.db');

export class VaultDatabase {
  private db: Database | null = null;
  private SQL: any = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized && this.db) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    this.SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      try {
        const fileBuffer = fs.readFileSync(DB_PATH);
        this.db = new this.SQL.Database(fileBuffer);
      } catch (err) {
        console.error('Error reading existing vault.db, creating new one:', err);
        this.db = new this.SQL.Database();
      }
    } else {
      this.db = new this.SQL.Database();
    }

    this.createTables();
    this.seedDefaultRulesIfEmpty();
    this.persist();
    this.isInitialized = true;
  }

  private createTables() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        institution TEXT NOT NULL,
        account_name TEXT,
        raw_description TEXT NOT NULL,
        clean_merchant TEXT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        notes TEXT,
        tags TEXT,
        created_at TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY,
        pattern TEXT NOT NULL,
        category TEXT NOT NULL,
        clean_merchant TEXT,
        priority INTEGER DEFAULT 0
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        icon TEXT,
        type TEXT NOT NULL
      );
    `);
  }

  private seedDefaultRulesIfEmpty() {
    if (!this.db) return;
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM rules');
    stmt.step();
    const count = (stmt.getAsObject() as any).count;
    stmt.free();

    if (count === 0) {
      const defaultRules = [
        { id: 'rule-1', pattern: 'PAYROLL|SALARY|DIRECT DEP|EMPLOYER|GUSTO', category: 'Income', clean_merchant: 'Salary & Payroll', priority: 10 },
        { id: 'rule-2', pattern: 'WHOLEFDS|TRADER JOE|SAFEWAY|KROGER|ALDI|WEGMANS|SPROUTS|HEB', category: 'Groceries', clean_merchant: 'Grocery Store', priority: 5 },
        { id: 'rule-3', pattern: 'STARBUCKS|DUNKIN|PEETS|BLUE BOTTLE|COFFEE', category: 'Coffee & Drinks', clean_merchant: 'Coffee Shop', priority: 5 },
        { id: 'rule-4', pattern: 'UBER|LYFT|CAB|TAXI|METRO|MTA|BART|TRANSIT', category: 'Transportation', clean_merchant: 'Rideshare & Transit', priority: 5 },
        { id: 'rule-5', pattern: 'AMZN|AMAZON|PRIME', category: 'Shopping', clean_merchant: 'Amazon', priority: 4 },
        { id: 'rule-6', pattern: 'NETFLIX|SPOTIFY|HULU|DISNEY|APPLE\\.COM|YOUTUBE|HBO|MAX', category: 'Entertainment & Subscriptions', clean_merchant: 'Streaming Subscription', priority: 5 },
        { id: 'rule-7', pattern: 'DOORDASH|UBER EATS|GRUBHUB|CHIPOTLE|SWEETGREEN|MCDONALD|SHAKE SHACK', category: 'Dining Out', clean_merchant: 'Restaurant / Delivery', priority: 5 },
        { id: 'rule-8', pattern: 'SHELL|CHEVRON|EXXON|BP|MOBIL|GAS', category: 'Gas & Fuel', clean_merchant: 'Gas Station', priority: 5 },
        { id: 'rule-9', pattern: 'CVS|WALGREENS|RITE AID|PHARMACY', category: 'Health & Pharmacy', clean_merchant: 'Pharmacy', priority: 5 },
        { id: 'rule-10', pattern: 'CONED|ELECTRIC|WATER|PG&E|NATIONAL GRID|VERIZON|AT&T|T-MOBILE', category: 'Utilities & Bills', clean_merchant: 'Utility Provider', priority: 5 },
        { id: 'rule-11', pattern: 'FIDELITY|VANGUARD|SCHWAB|ROBINHOOD|COINBASE', category: 'Investments', clean_merchant: 'Investment / Brokerage', priority: 6 },
        { id: 'rule-12', pattern: 'EQUINOX|PLANET FITNESS|GYM|YOGA|CROSSFIT', category: 'Fitness & Wellness', clean_merchant: 'Gym & Fitness', priority: 5 },
      ];

      for (const rule of defaultRules) {
        this.db.run(
          'INSERT INTO rules (id, pattern, category, clean_merchant, priority) VALUES (?, ?, ?, ?, ?)',
          [rule.id, rule.pattern, rule.category, rule.clean_merchant, rule.priority]
        );
      }
    }
  }

  public persist() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('Failed to persist SQLite database to disk:', err);
    }
  }

  public generateTransactionId(date: string, raw_description: string, amount: number, institution: string): string {
    const raw = `${date.trim()}|${raw_description.trim().toUpperCase()}|${Number(amount).toFixed(2)}|${institution.trim().toUpperCase()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  public getAllTransactionIds(): Set<string> {
    if (!this.db) return new Set();
    const set = new Set<string>();
    const stmt = this.db.prepare('SELECT id FROM transactions');
    while (stmt.step()) {
      const row = stmt.getAsObject();
      set.add(row.id as string);
    }
    stmt.free();
    return set;
  }

  public getAllTransactions(): TransactionRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
    const results: TransactionRecord[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as TransactionRecord);
    }
    stmt.free();
    return results;
  }

  public saveTransactions(records: Partial<TransactionRecord>[]): { inserted: number; duplicates: number; total: number } {
    if (!this.db || !records || records.length === 0) {
      return { inserted: 0, duplicates: 0, total: 0 };
    }

    const existingIds = this.getAllTransactionIds();
    let inserted = 0;
    let duplicates = 0;
    const now = new Date().toISOString();

    for (const item of records) {
      const date = item.date || new Date().toISOString().split('T')[0];
      const rawDesc = item.raw_description || item.clean_merchant || 'Unknown Transaction';
      const institution = item.institution || 'Generic';
      const amount = Number(item.amount) || 0;
      
      const id = item.id || this.generateTransactionId(date, rawDesc, amount, institution);

      if (existingIds.has(id)) {
        duplicates++;
        continue;
      }

      const cleanMerchant = item.clean_merchant || this.guessMerchant(rawDesc);
      const category = item.category || this.categorize(rawDesc);
      const type = item.type || (amount >= 0 ? 'inflow' : 'outflow');
      const accountName = item.account_name || `${institution} Primary`;
      const notes = item.notes || '';
      const tags = item.tags || '';

      this.db.run(
        `INSERT INTO transactions (id, date, institution, account_name, raw_description, clean_merchant, category, amount, type, notes, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, date, institution, accountName, rawDesc, cleanMerchant, category, amount, type, notes, tags, now]
      );

      existingIds.add(id);
      inserted++;
    }

    if (inserted > 0) {
      this.persist();
    }

    return { inserted, duplicates, total: records.length };
  }

  public updateTransaction(id: string, updates: Partial<TransactionRecord>): boolean {
    if (!this.db) return false;

    const fields: string[] = [];
    const values: any[] = [];

    const allowedKeys: (keyof TransactionRecord)[] = [
      'date', 'institution', 'account_name', 'raw_description',
      'clean_merchant', 'category', 'amount', 'type', 'notes', 'tags'
    ];

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) return false;

    values.push(id);
    this.db.run(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    this.persist();
    return true;
  }

  public deleteTransaction(id: string): boolean {
    if (!this.db) return false;
    this.db.run('DELETE FROM transactions WHERE id = ?', [id]);
    this.persist();
    return true;
  }

  public bulkDeleteTransactions(ids: string[]): number {
    if (!this.db || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    this.db.run(`DELETE FROM transactions WHERE id IN (${placeholders})`, ids);
    this.persist();
    return ids.length;
  }

  public clearAllTransactions(): boolean {
    if (!this.db) return false;
    this.db.run('DELETE FROM transactions');
    this.persist();
    return true;
  }

  public getAllRules(): RuleRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM rules ORDER BY priority DESC');
    const rules: RuleRecord[] = [];
    while (stmt.step()) {
      rules.push(stmt.getAsObject() as unknown as RuleRecord);
    }
    stmt.free();
    return rules;
  }

  public saveRule(rule: Partial<RuleRecord>): RuleRecord {
    if (!this.db) throw new Error('Database not initialized');
    const id = rule.id || `rule-${Date.now()}`;
    const pattern = rule.pattern || '';
    const category = rule.category || 'General';
    const clean_merchant = rule.clean_merchant || '';
    const priority = rule.priority ?? 0;

    this.db.run(
      `INSERT OR REPLACE INTO rules (id, pattern, category, clean_merchant, priority) VALUES (?, ?, ?, ?, ?)`,
      [id, pattern, category, clean_merchant, priority]
    );
    this.persist();
    return { id, pattern, category, clean_merchant, priority };
  }

  public deleteRule(id: string): boolean {
    if (!this.db) return false;
    this.db.run('DELETE FROM rules WHERE id = ?', [id]);
    this.persist();
    return true;
  }

  public categorize(rawDescription: string): string {
    const rules = this.getAllRules();
    const upper = rawDescription.toUpperCase();
    for (const r of rules) {
      try {
        const regex = new RegExp(r.pattern, 'i');
        if (regex.test(upper)) {
          return r.category;
        }
      } catch (e) {
        if (upper.includes(r.pattern.toUpperCase())) {
          return r.category;
        }
      }
    }
    return 'Miscellaneous';
  }

  public guessMerchant(rawDescription: string): string {
    const rules = this.getAllRules();
    const upper = rawDescription.toUpperCase();
    for (const r of rules) {
      if (r.clean_merchant) {
        try {
          const regex = new RegExp(r.pattern, 'i');
          if (regex.test(upper)) {
            return r.clean_merchant;
          }
        } catch (e) {
          if (upper.includes(r.pattern.toUpperCase())) {
            return r.clean_merchant;
          }
        }
      }
    }
    // Clean common prefixes
    let cleaned = rawDescription
      .replace(/^(POS DEBIT|CHECKCARD|DEBIT CARD PURCHASE|PURCHASE AUTHORIZED ON|SQ \*|TST\*|PAYPAL \*)/i, '')
      .replace(/\s+\d{3,}.*$/, '')
      .replace(/#\d+.*$/, '')
      .trim();
    return cleaned || rawDescription;
  }

  public getRawDbBinary(): Buffer {
    if (!this.db) throw new Error('DB not initialized');
    const data = this.db.export();
    return Buffer.from(data);
  }

  public importDbBinary(buffer: Buffer): void {
    if (!this.SQL) throw new Error('SQL engine not initialized');
    this.db = new this.SQL.Database(buffer);
    this.createTables();
    this.persist();
  }
}

export const vaultDb = new VaultDatabase();
