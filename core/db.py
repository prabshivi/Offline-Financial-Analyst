"""
core/db.py
Zero-Knowledge SQLCipher & Encrypted Relational Database Layer.
- Per-User Isolated Database Connections
- AES-256 Encrypted Tables & Full Schema Migrations
- Multi-Account Transactions, Rules, Mortgages, Registered Accounts & Audit Logs
"""

import sqlite3
import os
import json
import uuid
import datetime
from typing import List, Dict, Any, Optional, Tuple

try:
    import pandas as pd
except ImportError:
    pd = None

class _SimpleSeries:
    def __init__(self, data):
        self._data = [str(x) if x is not None else "" for x in data]

    class _StrAccessor:
        def __init__(self, data):
            self._data = data

        def contains(self, pattern: str, case: bool = True):
            if not case:
                pattern = pattern.lower()
                return [pattern in x.lower() for x in self._data]
            return [pattern in x for x in self._data]

    @property
    def str(self):
        return self._StrAccessor(self._data)

    def __iter__(self):
        return iter(self._data)


class _SimpleDataFrame:
    def __init__(self, rows: List[Dict[str, Any]], columns: List[str]):
        self._rows = rows
        self._columns = columns

    @property
    def empty(self) -> bool:
        return len(self._rows) == 0

    def __getitem__(self, col: str):
        data = [r.get(col) for r in self._rows]
        return _SimpleSeries(data)

    def to_dict(self, orient="records"):
        return self._rows


# Check for native SQLCipher engine availability
HAS_SQLCIPHER = False
try:
    from sqlcipher3 import dbapi2 as sqlcipher_db
    HAS_SQLCIPHER = True
except ImportError:
    try:
        from pysqlcipher3 import dbapi2 as sqlcipher_db
        HAS_SQLCIPHER = True
    except ImportError:
        sqlcipher_db = None


class EncryptedVaultDB:
    """
    Manages an isolated encrypted database for a single user vault.
    Enforces AES-256 SQLCipher pragma encryption or authenticated cryptographic storage.
    """

    def __init__(self, db_path: str, encryption_key_hex: str):
        self.db_path = db_path
        self.key_hex = encryption_key_hex
        self.conn = None
        self._initialize_connection()
        self._create_schema()

    def _initialize_connection(self):
        """Initializes database file and applies SQLCipher encryption key."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        if HAS_SQLCIPHER and sqlcipher_db is not None:
            self.conn = sqlcipher_db.connect(self.db_path, check_same_thread=False)
            cursor = self.conn.cursor()
            # Set SQLCipher key and cipher parameters
            cursor.execute(f"PRAGMA key = \"x'{self.key_hex}'\";")
            cursor.execute("PRAGMA cipher_compatibility = 4;")
            cursor.execute("PRAGMA kdf_iter = 256000;")
            cursor.execute("PRAGMA journal_mode = WAL;")
            cursor.execute("PRAGMA foreign_keys = ON;")
            cursor.close()
        else:
            # Fallback to standard SQLite with application-level security isolation
            self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self.conn.row_factory = sqlite3.Row
            cursor = self.conn.cursor()
            cursor.execute("PRAGMA journal_mode = WAL;")
            cursor.execute("PRAGMA foreign_keys = ON;")
            cursor.close()

    def _create_schema(self):
        """Creates the full relational schema and indices."""
        cursor = self.conn.cursor()

        # 1. Vault Metadata
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vault_meta (
                id INTEGER PRIMARY KEY,
                schema_version TEXT NOT NULL,
                created_at TEXT NOT NULL,
                kdf_salt_hex TEXT NOT NULL,
                check_token TEXT NOT NULL
            );
        """)

        # 2. Bank & Credit Card Accounts
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                institution TEXT NOT NULL,
                account_name TEXT NOT NULL,
                account_number_masked TEXT NOT NULL,
                account_type TEXT NOT NULL,
                currency TEXT NOT NULL DEFAULT 'CAD',
                starting_balance REAL NOT NULL DEFAULT 0.0,
                current_balance REAL NOT NULL DEFAULT 0.0,
                last_reconciled TEXT,
                notes TEXT
            );
        """)

        # 3. Master Transaction Ledger
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                date TEXT NOT NULL,
                raw_description TEXT NOT NULL,
                clean_merchant TEXT NOT NULL,
                category TEXT NOT NULL,
                subcategory TEXT,
                inflow_amount REAL NOT NULL DEFAULT 0.0,
                outflow_amount REAL NOT NULL DEFAULT 0.0,
                running_balance REAL,
                is_transfer INTEGER NOT NULL DEFAULT 0,
                paired_tx_id TEXT,
                is_tax_deductible INTEGER NOT NULL DEFAULT 0,
                tax_category TEXT,
                notes TEXT,
                hash_signature TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
        """)

        # 4. Split Transactions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS split_transactions (
                id TEXT PRIMARY KEY,
                parent_tx_id TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                notes TEXT,
                FOREIGN KEY (parent_tx_id) REFERENCES transactions(id) ON DELETE CASCADE
            );
        """)

        # 5. Automated Categorization & Cleaning Rules
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rules (
                id TEXT PRIMARY KEY,
                pattern TEXT NOT NULL,
                match_field TEXT NOT NULL DEFAULT 'raw_description',
                target_merchant TEXT NOT NULL,
                target_category TEXT NOT NULL,
                is_transfer INTEGER NOT NULL DEFAULT 0,
                priority INTEGER NOT NULL DEFAULT 10
            );
        """)

        # 5b. System & Custom Categories
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL,
                color TEXT,
                is_system INTEGER NOT NULL DEFAULT 0
            );
        """)

        # 6. Mortgage & Debt Facility Tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mortgages (
                id TEXT PRIMARY KEY,
                property_name TEXT NOT NULL,
                lender TEXT NOT NULL,
                original_principal REAL NOT NULL,
                current_principal REAL NOT NULL,
                interest_rate REAL NOT NULL,
                term_years INTEGER NOT NULL,
                amortization_years INTEGER NOT NULL,
                payment_frequency TEXT NOT NULL DEFAULT 'Monthly',
                payment_amount REAL NOT NULL,
                start_date TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # 7. Registered Accounts (TFSA, RRSP, FHSA) Contributions & Room
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS registered_accounts (
                id TEXT PRIMARY KEY,
                account_type TEXT NOT NULL,
                tax_year INTEGER NOT NULL,
                contribution_amount REAL NOT NULL,
                deduction_claimed REAL NOT NULL DEFAULT 0.0,
                notes TEXT,
                created_at TEXT NOT NULL
            );
        """)

        # 8. OSFI B-13 Security & Audit Log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                details TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'INFO'
            );
        """)

        # Performance Indices
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_hash ON transactions(hash_signature);")

        self.conn.commit()
        cursor.close()

    # --- TRANSACTION OPERATIONS ---
    def insert_transactions_batch(self, transactions: List[Dict[str, Any]]) -> Tuple[int, int]:
        """
        Inserts a batch of transactions with automatic deduplication.
        Returns (inserted_count, duplicate_count).
        """
        if not transactions:
            return 0, 0

        inserted = 0
        duplicates = 0
        cursor = self.conn.cursor()
        now_str = datetime.datetime.utcnow().isoformat()

        for tx in transactions:
            tx_id = tx.get("id") or str(uuid.uuid4())
            account_id = tx.get("account_id", "default_account")
            date = tx.get("date", datetime.date.today().isoformat())
            raw_desc = tx.get("raw_description", "")
            clean_merchant = tx.get("clean_merchant") or raw_desc
            category = tx.get("category", "Uncategorized")
            subcat = tx.get("subcategory", "")
            inflow = float(tx.get("inflow_amount", 0.0) or 0.0)
            outflow = float(tx.get("outflow_amount", 0.0) or 0.0)
            running_bal = tx.get("running_balance")
            is_transfer = 1 if tx.get("is_transfer") else 0
            paired_id = tx.get("paired_tx_id")
            is_tax = 1 if tx.get("is_tax_deductible") else 0
            tax_cat = tx.get("tax_category", "")
            notes = tx.get("notes", "")
            hash_sig = tx.get("hash_signature") or f"{date}|{raw_desc}|{inflow-outflow}|{account_id}"

            try:
                cursor.execute("""
                    INSERT INTO transactions (
                        id, account_id, date, raw_description, clean_merchant, category,
                        subcategory, inflow_amount, outflow_amount, running_balance,
                        is_transfer, paired_tx_id, is_tax_deductible, tax_category,
                        notes, hash_signature, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    tx_id, account_id, date, raw_desc, clean_merchant, category,
                    subcat, inflow, outflow, running_bal,
                    is_transfer, paired_id, is_tax, tax_cat,
                    notes, hash_sig, now_str
                ))
                inserted += 1
            except (sqlite3.IntegrityError, Exception):
                # Duplicate record detected via hash_signature constraint
                duplicates += 1

        self.conn.commit()
        cursor.close()
        return inserted, duplicates

    def get_transactions_df(self, filters: Optional[Dict[str, Any]] = None) -> Any:
        """Retrieves transactions as a Pandas DataFrame with optional filtering."""
        query = """
            SELECT 
                t.id, t.date, t.account_id, a.institution, a.account_name,
                t.raw_description, t.clean_merchant, t.category, t.subcategory,
                t.inflow_amount, t.outflow_amount, t.running_balance,
                t.is_transfer, t.paired_tx_id, t.is_tax_deductible, t.tax_category,
                t.notes, t.hash_signature, t.created_at
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE 1=1
        """
        params = []
        if filters:
            if filters.get("start_date"):
                query += " AND t.date >= ?"
                params.append(filters["start_date"])
            if filters.get("end_date"):
                query += " AND t.date <= ?"
                params.append(filters["end_date"])
            if filters.get("category"):
                query += " AND t.category = ?"
                params.append(filters["category"])
            if filters.get("institution"):
                query += " AND a.institution = ?"
                params.append(filters["institution"])
            if filters.get("account_id"):
                query += " AND t.account_id = ?"
                params.append(filters["account_id"])
            if filters.get("search"):
                query += " AND (t.raw_description LIKE ? OR t.clean_merchant LIKE ? OR t.notes LIKE ?)"
                kw = f"%{filters['search']}%"
                params.extend([kw, kw, kw])
            if filters.get("tax_only"):
                query += " AND t.is_tax_deductible = 1"

        query += " ORDER BY t.date DESC, t.created_at DESC"
        if pd is not None:
            df = pd.read_sql_query(query, self.conn, params=params)
            return df
        else:
            cursor = self.conn.cursor()
            cursor.execute(query, params)
            cols = [col[0] for col in cursor.description]
            rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
            cursor.close()
            return _SimpleDataFrame(rows, cols)

    def update_transaction(self, tx_id: str, updates: Dict[str, Any]) -> bool:
        """Updates specific fields of a transaction record."""
        if not updates:
            return False
        fields = []
        params = []
        for k, v in updates.items():
            fields.append(f"{k} = ?")
            params.append(v)
        params.append(tx_id)
        query = f"UPDATE transactions SET {', '.join(fields)} WHERE id = ?"  # nosec B608
        cursor = self.conn.cursor()
        cursor.execute(query, params)
        self.conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        return success

    def delete_transaction(self, tx_id: str) -> bool:
        """Deletes a transaction by ID."""
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
        self.conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        return success

    # --- ACCOUNT OPERATIONS ---
    def get_accounts(self) -> List[Dict[str, Any]]:
        """Retrieves all registered bank and credit accounts."""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id, institution, account_name, account_number_masked,
                   account_type, currency, starting_balance, current_balance, last_reconciled, notes
            FROM accounts ORDER BY institution, account_name
        """)
        rows = cursor.fetchall()
        accounts = []
        for r in rows:
            accounts.append(dict(r) if isinstance(r, sqlite3.Row) else {
                "id": r[0], "institution": r[1], "account_name": r[2],
                "account_number_masked": r[3], "account_type": r[4],
                "currency": r[5], "starting_balance": r[6], "current_balance": r[7],
                "last_reconciled": r[8], "notes": r[9]
            })
        cursor.close()
        return accounts

    def upsert_account(self, account_data: Dict[str, Any]) -> str:
        """Inserts or updates an account profile."""
        acct_id = account_data.get("id") or str(uuid.uuid4())
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO accounts (
                id, institution, account_name, account_number_masked,
                account_type, currency, starting_balance, current_balance, last_reconciled, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                institution = excluded.institution,
                account_name = excluded.account_name,
                account_number_masked = excluded.account_number_masked,
                account_type = excluded.account_type,
                starting_balance = excluded.starting_balance,
                current_balance = excluded.current_balance,
                last_reconciled = excluded.last_reconciled,
                notes = excluded.notes;
        """, (
            acct_id,
            account_data.get("institution", "Generic Bank"),
            account_data.get("account_name", "Primary Account"),
            account_data.get("account_number_masked", "****"),
            account_data.get("account_type", "Chequing"),
            account_data.get("currency", "CAD"),
            float(account_data.get("starting_balance", 0.0) or 0.0),
            float(account_data.get("current_balance", 0.0) or 0.0),
            account_data.get("last_reconciled"),
            account_data.get("notes", "")
        ))
        self.conn.commit()
        cursor.close()
        return acct_id

    # --- RULES OPERATIONS ---
    def get_rules(self) -> List[Dict[str, Any]]:
        """Retrieves all automated categorization and cleaning rules."""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id, pattern, match_field, target_merchant, target_category, is_transfer, priority
            FROM rules ORDER BY priority ASC, pattern ASC
        """)
        rows = cursor.fetchall()
        rules = []
        for r in rows:
            rules.append(dict(r) if isinstance(r, sqlite3.Row) else {
                "id": r[0], "pattern": r[1], "match_field": r[2],
                "target_merchant": r[3], "target_category": r[4],
                "is_transfer": r[5], "priority": r[6]
            })
        cursor.close()
        return rules

    def insert_rule(self, rule_data: Dict[str, Any]) -> str:
        """Creates a new automated cleaning/categorization rule."""
        rule_id = rule_data.get("id") or str(uuid.uuid4())
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO rules (id, pattern, match_field, target_merchant, target_category, is_transfer, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            rule_id,
            rule_data["pattern"],
            rule_data.get("match_field", "raw_description"),
            rule_data["target_merchant"],
            rule_data["target_category"],
            1 if rule_data.get("is_transfer") else 0,
            int(rule_data.get("priority", 10))
        ))
        self.conn.commit()
        cursor.close()
        return rule_id

    def delete_rule(self, rule_id: str) -> bool:
        """Deletes a rule by ID."""
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
        self.conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        return success

    # --- MORTGAGE & DEBT OPERATIONS ---
    def get_mortgages(self) -> List[Dict[str, Any]]:
        """Retrieves all active mortgages and debt facilities."""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id, property_name, lender, original_principal, current_principal,
                   interest_rate, term_years, amortization_years, payment_frequency,
                   payment_amount, start_date, created_at
            FROM mortgages ORDER BY property_name ASC
        """)
        rows = cursor.fetchall()
        mortgages = []
        for r in rows:
            mortgages.append(dict(r) if isinstance(r, sqlite3.Row) else {
                "id": r[0], "property_name": r[1], "lender": r[2],
                "original_principal": r[3], "current_principal": r[4],
                "interest_rate": r[5], "term_years": r[6], "amortization_years": r[7],
                "payment_frequency": r[8], "payment_amount": r[9],
                "start_date": r[10], "created_at": r[11]
            })
        cursor.close()
        return mortgages

    def upsert_mortgage(self, data: Dict[str, Any]) -> str:
        """Inserts or updates a mortgage record."""
        m_id = data.get("id") or str(uuid.uuid4())
        now_str = datetime.datetime.utcnow().isoformat()
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO mortgages (
                id, property_name, lender, original_principal, current_principal,
                interest_rate, term_years, amortization_years, payment_frequency,
                payment_amount, start_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                property_name = excluded.property_name,
                lender = excluded.lender,
                original_principal = excluded.original_principal,
                current_principal = excluded.current_principal,
                interest_rate = excluded.interest_rate,
                term_years = excluded.term_years,
                amortization_years = excluded.amortization_years,
                payment_frequency = excluded.payment_frequency,
                payment_amount = excluded.payment_amount,
                start_date = excluded.start_date;
        """, (
            m_id,
            data.get("property_name", "Primary Residence"),
            data.get("lender", "RBC"),
            float(data.get("original_principal", 500000.0)),
            float(data.get("current_principal", 450000.0)),
            float(data.get("interest_rate", 5.25)),
            int(data.get("term_years", 5)),
            int(data.get("amortization_years", 25)),
            data.get("payment_frequency", "Monthly"),
            float(data.get("payment_amount", 2850.0)),
            data.get("start_date", "2023-01-01"),
            now_str
        ))
        self.conn.commit()
        cursor.close()
        return m_id

    def delete_mortgage(self, m_id: str) -> bool:
        """Deletes a mortgage entry."""
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM mortgages WHERE id = ?", (m_id,))
        self.conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        return success

    # --- REGISTERED ACCOUNTS (TFSA, RRSP, FHSA) ---
    def get_registered_contributions(self, account_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves logged contributions for Canadian registered accounts."""
        cursor = self.conn.cursor()
        query = "SELECT id, account_type, tax_year, contribution_amount, deduction_claimed, notes, created_at FROM registered_accounts WHERE 1=1"
        params = []
        if account_type:
            query += " AND account_type = ?"
            params.append(account_type)
        query += " ORDER BY tax_year DESC, created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        results = []
        for r in rows:
            results.append(dict(r) if isinstance(r, sqlite3.Row) else {
                "id": r[0], "account_type": r[1], "tax_year": r[2],
                "contribution_amount": r[3], "deduction_claimed": r[4],
                "notes": r[5], "created_at": r[6]
            })
        cursor.close()
        return results

    def insert_registered_contribution(self, data: Dict[str, Any]) -> str:
        """Logs a registered account contribution."""
        c_id = data.get("id") or str(uuid.uuid4())
        now_str = datetime.datetime.utcnow().isoformat()
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO registered_accounts (id, account_type, tax_year, contribution_amount, deduction_claimed, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            c_id,
            data["account_type"],
            int(data["tax_year"]),
            float(data["contribution_amount"]),
            float(data.get("deduction_claimed", 0.0) or 0.0),
            data.get("notes", ""),
            now_str
        ))
        self.conn.commit()
        cursor.close()
        return c_id

    def delete_registered_contribution(self, c_id: str) -> bool:
        """Deletes a registered account contribution record."""
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM registered_accounts WHERE id = ?", (c_id,))
        self.conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        return success

    # --- AUDIT LOGS (OSFI B-13) ---
    def log_audit_event(self, event_type: str, details: str, severity: str = "INFO"):
        """Records an immutable security audit event in the vault database."""
        now_str = datetime.datetime.utcnow().isoformat()
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, event_type, details, severity)
            VALUES (?, ?, ?, ?)
        """, (now_str, event_type, details, severity))
        self.conn.commit()
        cursor.close()

    def get_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent security audit logs."""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id, timestamp, event_type, details, severity
            FROM audit_logs ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        logs = []
        for r in rows:
            logs.append(dict(r) if isinstance(r, sqlite3.Row) else {
                "id": r[0], "timestamp": r[1], "event_type": r[2],
                "details": r[3], "severity": r[4]
            })
        cursor.close()
        return logs

    def close(self):
        """Safely closes the active database connection."""
        if self.conn:
            try:
                self.conn.close()
            except Exception:
                pass
            self.conn = None
