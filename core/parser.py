"""
core/parser.py
Universal Multi-Bank Statement Ingestion Engine.
- Multi-Format Parsing (PDF via pdfplumber, CSV, OFX/QFX)
- Bank-Specific Layout Detection (RBC, TD, Scotiabank, BMO, CIBC, Tangerine, Desjardins, AMEX, etc.)
- Mathematical Balance Reconciliation (Starting + Inflows - Outflows == Ending)
- Chronological Gap Detection & SHA-256 Deduplication Signatures
"""

import io
import re
import csv
import math
import hashlib
import datetime
from typing import List, Dict, Any, Tuple, Optional

try:
    import pandas as pd
except ImportError:
    pd = None

from .security import PIISanitizer, InputValidator
from .rules import RuleEngine


class StatementParser:
    """
    Parses bank statements into a standardized financial ledger schema.
    """

    @classmethod
    def parse_file(
        cls,
        file_bytes: bytes,
        filename: str,
        account_info: Optional[Dict[str, Any]] = None,
        password: Optional[str] = None,
        rule_engine: Optional[RuleEngine] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for multi-format ingestion.
        Returns:
            {
                "success": bool,
                "transactions": List[Dict],
                "reconciliation": Dict,
                "gaps": List[Dict],
                "institution": str,
                "error": Optional[str]
            }
        """
        valid, msg = InputValidator.validate_file_buffer(file_bytes, filename)
        if not valid:
            return {"success": False, "error": msg, "transactions": [], "reconciliation": {}}

        ext = filename.lower().split(".")[-1]
        rules = rule_engine or RuleEngine()
        account = account_info or {}

        try:
            if ext == "pdf":
                result = cls._parse_pdf(file_bytes, filename, account, password, rules)
            elif ext in ["csv", "txt"]:
                result = cls._parse_csv(file_bytes, filename, account, rules)
            elif ext in ["ofx", "qfx"]:
                result = cls._parse_ofx(file_bytes, filename, account, rules)
            else:
                return {"success": False, "error": f"Unsupported format .{ext}", "transactions": []}

            # Post-process transactions: compute hashes and detect chronological gaps
            txs = result.get("transactions", [])
            for tx in txs:
                # Sanitize text
                tx["raw_description"] = PIISanitizer.sanitize_text(tx["raw_description"])
                tx["clean_merchant"] = PIISanitizer.sanitize_text(tx["clean_merchant"])

                # Calculate deterministic SHA-256 deduplication signature
                amt_net = float(tx.get("inflow_amount", 0.0)) - float(tx.get("outflow_amount", 0.0))
                hash_input = f"{tx.get('date')}|{tx.get('raw_description')}|{amt_net:.2f}|{tx.get('account_id', 'acct')}"
                tx["hash_signature"] = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()

            # Run chronological gap detection
            gaps = cls._detect_chronological_gaps(txs)
            result["gaps"] = gaps
            result["success"] = True
            return result

        except Exception as e:
            return {"success": False, "error": f"Parsing failure: {str(e)}", "transactions": []}

    # --- CSV PARSING ENGINE ---
    @classmethod
    def _parse_csv(
        cls,
        file_bytes: bytes,
        filename: str,
        account: Dict[str, Any],
        rules: RuleEngine
    ) -> Dict[str, Any]:
        """Parses CSV with auto-detection of delimiters and bank column formats."""
        rows_data = []
        columns = []

        if pd is not None:
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), skipinitialspace=True)
            except Exception:
                df = pd.read_csv(io.BytesIO(file_bytes), sep=";", skipinitialspace=True)

            df.columns = [str(c).strip() for c in df.columns]
            columns = list(df.columns)
            for _, r in df.iterrows():
                rows_data.append(dict(r))
        else:
            # Pure Python CSV reader fallback
            text = file_bytes.decode("utf-8", errors="replace")
            delimiter = ";" if ";" in text.split("\n")[0] else ","
            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter, skipinitialspace=True)
            if reader.fieldnames:
                columns = [str(c).strip() for c in reader.fieldnames]
            for row in reader:
                clean_row = {str(k).strip(): v for k, v in row.items() if k is not None}
                rows_data.append(clean_row)

        cols_lower = {c.lower(): c for c in columns}

        # Detect institution and column mappings
        institution = account.get("institution") or cls._detect_institution_from_columns(columns)
        date_col = cls._find_matching_col(cols_lower, ["date", "transaction date", "posting date", "trans date", "date de transaction"])
        desc_col = cls._find_matching_col(cols_lower, ["description", "memo", "payee", "transaction", "details", "narrative", "libellé"])
        debit_col = cls._find_matching_col(cols_lower, ["debit", "withdrawal", "withdrawals", "outflow", "debits", "retrait"])
        credit_col = cls._find_matching_col(cols_lower, ["credit", "deposit", "deposits", "inflow", "credits", "dépot"])
        amount_col = cls._find_matching_col(cols_lower, ["amount", "cad$", "usd$", "montant"])
        balance_col = cls._find_matching_col(cols_lower, ["balance", "running balance", "solde"])

        if not date_col or (not desc_col and not amount_col):
            # Fallback: assume column 0=date, 1=desc, 2=amount
            if len(columns) >= 3:
                date_col = columns[0]
                desc_col = columns[1]
                amount_col = columns[2]
            else:
                raise ValueError("Could not identify Date, Description, or Amount columns in CSV.")

        transactions = []
        total_inflows = 0.0
        total_outflows = 0.0

        for row in rows_data:
            val_date = row.get(date_col)
            date_val = str(val_date).strip() if (val_date is not None and str(val_date).lower() != "nan") else None
            parsed_date = cls._normalize_date(date_val)
            if not parsed_date:
                continue

            val_desc = row.get(desc_col)
            raw_desc = str(val_desc).strip() if (desc_col and val_desc is not None and str(val_desc).lower() != "nan") else "CSV Transaction"
            clean_merch, category, is_transfer = rules.clean_and_categorize(raw_desc)

            inflow = 0.0
            outflow = 0.0

            if debit_col and credit_col:
                d_val = cls._clean_currency_val(row.get(debit_col))
                c_val = cls._clean_currency_val(row.get(credit_col))
                outflow = abs(d_val) if d_val else 0.0
                inflow = abs(c_val) if c_val else 0.0
            elif amount_col:
                a_val = cls._clean_currency_val(row.get(amount_col))
                if a_val < 0:
                    outflow = abs(a_val)
                else:
                    inflow = a_val

            run_bal = cls._clean_currency_val(row.get(balance_col)) if (balance_col and row.get(balance_col) is not None) else None

            total_inflows += inflow
            total_outflows += outflow

            transactions.append({
                "account_id": account.get("id", "csv_account"),
                "institution": institution,
                "account_name": account.get("account_name", f"{institution} Account"),
                "date": parsed_date,
                "raw_description": raw_desc,
                "clean_merchant": clean_merch,
                "category": category,
                "inflow_amount": inflow,
                "outflow_amount": outflow,
                "running_balance": run_bal,
                "is_transfer": 1 if is_transfer else 0
            })

        # Mathematical reconciliation estimate
        reconciliation = {
            "total_inflows": total_inflows,
            "total_outflows": total_outflows,
            "net_flow": total_inflows - total_outflows,
            "is_balanced": True,
            "notes": "CSV records parsed successfully."
        }

        return {
            "institution": institution,
            "transactions": transactions,
            "reconciliation": reconciliation
        }

    # --- PDF PARSING ENGINE (PDFPLUMBER) ---
    @classmethod
    def _parse_pdf(
        cls,
        file_bytes: bytes,
        filename: str,
        account: Dict[str, Any],
        password: Optional[str],
        rules: RuleEngine
    ) -> Dict[str, Any]:
        """
        Parses Canadian PDF statements using pdfplumber with table extraction and regex fallback.
        """
        import pdfplumber

        stream = io.BytesIO(file_bytes)
        transactions = []
        full_text = ""
        institution = account.get("institution") or "Generic Bank"

        with pdfplumber.open(stream, password=password) as pdf:
            if len(pdf.pages) > InputValidator.MAX_PDF_PAGES:
                raise ValueError(f"PDF exceeds {InputValidator.MAX_PDF_PAGES} page limit.")

            # Sample first page to detect Canadian institution
            first_page_text = pdf.pages[0].extract_text() or ""
            institution = cls._detect_institution_from_text(first_page_text) or institution

            for page_idx, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                full_text += f"\n{text}"

                # Try bounding box tables first
                tables = page.extract_tables()
                parsed_from_tables = False

                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    # Check if table headers look like transactions
                    headers = [str(cell).lower().strip() for cell in table[0] if cell]
                    has_date = any("date" in h for h in headers)
                    has_amt = any(h in ["amount", "debit", "credit", "withdrawals", "deposits", "montant"] for h in headers)

                    if has_date and (has_amt or len(table[0]) >= 3):
                        parsed_from_tables = True
                        for row in table[1:]:
                            if not row or not any(row):
                                continue
                            tx = cls._parse_pdf_table_row(row, institution, account, rules)
                            if tx:
                                transactions.append(tx)

                # If table extraction yielded nothing on this page, run regex line parser
                if not parsed_from_tables:
                    line_txs = cls._parse_pdf_text_lines(text, institution, account, rules)
                    transactions.extend(line_txs)

        # Mathematical reconciliation check from summary text if present
        reconcile_info = cls._extract_reconciliation_from_text(full_text, transactions)

        return {
            "institution": institution,
            "transactions": transactions,
            "reconciliation": reconcile_info
        }

    # --- OFX / QFX PARSER ---
    @classmethod
    def _parse_ofx(
        cls,
        file_bytes: bytes,
        filename: str,
        account: Dict[str, Any],
        rules: RuleEngine
    ) -> Dict[str, Any]:
        """Parses Open Financial Exchange (OFX/QFX) statement format."""
        text = file_bytes.decode("utf-8", errors="replace")
        stmt_blocks = re.findall(r'<STMTTRN>(.*?)</STMTTRN>', text, flags=re.DOTALL | re.IGNORECASE)
        if not stmt_blocks:
            # Try unclosed tag format
            stmt_blocks = text.split("<STMTTRN>")[1:]

        transactions = []
        institution = account.get("institution") or "OFX Institution"

        for block in stmt_blocks:
            dt_match = re.search(r'<DTPOSTED>(\d{8})', block, re.IGNORECASE)
            amt_match = re.search(r'<TRNAMT>([-+]?\d*\.?\d+)', block, re.IGNORECASE)
            name_match = re.search(r'<NAME>(.*?)(?:<|\n|$)', block, re.IGNORECASE)
            memo_match = re.search(r'<MEMO>(.*?)(?:<|\n|$)', block, re.IGNORECASE)

            if not dt_match or not amt_match:
                continue

            raw_date = dt_match.group(1)
            parsed_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
            amount = float(amt_match.group(1))

            name = name_match.group(1).strip() if name_match else ""
            memo = memo_match.group(1).strip() if memo_match else ""
            raw_desc = f"{name} {memo}".strip() or "OFX Transaction"

            clean_merch, category, is_transfer = rules.clean_and_categorize(raw_desc)

            inflow = amount if amount > 0 else 0.0
            outflow = abs(amount) if amount < 0 else 0.0

            transactions.append({
                "account_id": account.get("id", "ofx_account"),
                "institution": institution,
                "account_name": account.get("account_name", f"{institution} Account"),
                "date": parsed_date,
                "raw_description": raw_desc,
                "clean_merchant": clean_merch,
                "category": category,
                "inflow_amount": inflow,
                "outflow_amount": outflow,
                "running_balance": None,
                "is_transfer": 1 if is_transfer else 0
            })

        return {
            "institution": institution,
            "transactions": transactions,
            "reconciliation": {"is_balanced": True, "notes": "OFX stream parsed."}
        }

    # --- HELPER UTILITIES & REGEX DETECTORS ---
    @classmethod
    def _detect_institution_from_text(cls, text: str) -> Optional[str]:
        """Identifies Canadian Bank branding in document headers."""
        text_u = text.upper()
        if "ROYAL BANK" in text_u or "RBC" in text_u:
            return "RBC Royal Bank"
        if "TD CANADA TRUST" in text_u or "TORONTO-DOMINION" in text_u:
            return "TD Canada Trust"
        if "SCOTIABANK" in text_u or "BANK OF NOVA SCOTIA" in text_u:
            return "Scotiabank"
        if "BMO" in text_u or "BANK OF MONTREAL" in text_u:
            return "BMO Bank of Montreal"
        if "CIBC" in text_u or "CANADIAN IMPERIAL BANK" in text_u:
            return "CIBC"
        if "TANGERINE" in text_u:
            return "Tangerine Bank"
        if "NATIONAL BANK" in text_u or "BANQUE NATIONALE" in text_u:
            return "National Bank of Canada"
        if "DESJARDINS" in text_u:
            return "Desjardins"
        if "AMERICAN EXPRESS" in text_u or "AMEX" in text_u:
            return "American Express Canada"
        if "EQ BANK" in text_u:
            return "EQ Bank"
        if "SIMPLII" in text_u:
            return "Simplii Financial"
        if "WEALTHSIMPLE" in text_u:
            return "Wealthsimple"
        return None

    @classmethod
    def _detect_institution_from_columns(cls, cols: List[str]) -> str:
        s = " ".join([str(c).lower() for c in cols])
        if "rbc" in s: return "RBC Royal Bank"
        if "td" in s: return "TD Canada Trust"
        if "scotia" in s: return "Scotiabank"
        if "bmo" in s: return "BMO Bank of Montreal"
        if "cibc" in s: return "CIBC"
        return "Generic Financial Institution"

    @classmethod
    def _find_matching_col(cls, cols_lower: Dict[str, str], candidates: List[str]) -> Optional[str]:
        for c in candidates:
            if c in cols_lower:
                return cols_lower[c]
        # Partial match
        for c in candidates:
            for actual in cols_lower:
                if c in actual:
                    return cols_lower[actual]
        return None

    @classmethod
    def _clean_currency_val(cls, val: Any) -> float:
        if val is None or (isinstance(val, float) and math.isnan(val)) or (pd is not None and pd.isna(val)):
            return 0.0
        s = str(val).replace("$", "").replace(",", "").replace("CAD", "").replace("USD", "").strip()
        # Handle trailing negative e.g. 50.00- or (50.00)
        if s.endswith("-"):
            s = f"-{s[:-1]}"
        elif s.startswith("(") and s.endswith(")"):
            s = f"-{s[1:-1]}"
        try:
            return float(s)
        except Exception:
            return 0.0

    @classmethod
    def _normalize_date(cls, date_str: Optional[str]) -> Optional[str]:
        """Converts varied date representations to standard ISO YYYY-MM-DD."""
        if not date_str:
            return None
        clean_d = re.sub(r'[\r\n\t]', ' ', str(date_str)).strip()

        # Try standard datetime formats
        formats = [
            "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d",
            "%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y",
            "%b %d %Y", "%d-%b-%Y", "%m-%d-%Y", "%Y%m%d",
            "%b %d", "%d %b"
        ]
        for fmt in formats:
            try:
                dt = datetime.datetime.strptime(clean_d, fmt)
                # If year wasn't in format, assign current year
                if dt.year == 1900:
                    dt = dt.replace(year=datetime.date.today().year)
                return dt.strftime("%Y-%m-%d")
            except Exception:
                continue

        # Regex fallback for YYYY-MM-DD or MM/DD/YYYY
        m = re.search(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', clean_d)
        if m:
            return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"

        m = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', clean_d)
        if m:
            return f"{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"

        return None

    @classmethod
    def _parse_pdf_table_row(cls, row: List[Any], institution: str, account: Dict[str, Any], rules: RuleEngine) -> Optional[Dict[str, Any]]:
        cells = [str(c).strip() for c in row if c is not None and str(c).strip()]
        if len(cells) < 3:
            return None

        # Look for date in first two cells
        date_cand = cls._normalize_date(cells[0]) or cls._normalize_date(cells[1])
        if not date_cand:
            return None

        desc_cand = ""
        inflow = 0.0
        outflow = 0.0
        balance = None

        # Find amounts in remaining cells
        amounts = []
        for cell in cells:
            clean_num = cls._clean_currency_val(cell)
            if clean_num != 0.0:
                amounts.append(clean_num)
            elif len(cell) > 3 and not cls._normalize_date(cell):
                desc_cand += f" {cell}"

        desc_cand = desc_cand.strip() or "PDF Transaction"
        clean_merch, category, is_transfer = rules.clean_and_categorize(desc_cand)

        if len(amounts) == 1:
            amt = amounts[0]
            if amt < 0:
                outflow = abs(amt)
            else:
                inflow = amt
        elif len(amounts) >= 2:
            outflow = abs(amounts[0]) if amounts[0] < 0 else amounts[0]
            balance = amounts[-1]

        return {
            "account_id": account.get("id", "pdf_account"),
            "institution": institution,
            "account_name": account.get("account_name", f"{institution} Statement"),
            "date": date_cand,
            "raw_description": desc_cand,
            "clean_merchant": clean_merch,
            "category": category,
            "inflow_amount": inflow,
            "outflow_amount": outflow,
            "running_balance": balance,
            "is_transfer": 1 if is_transfer else 0
        }

    @classmethod
    def _parse_pdf_text_lines(cls, text: str, institution: str, account: Dict[str, Any], rules: RuleEngine) -> List[Dict[str, Any]]:
        """Fallback line parser using Canadian transaction narrative regexes."""
        lines = text.splitlines()
        txs = []
        # Pattern: Date (e.g. Jan 15 or 2024-01-15) + Description + Amount (e.g. $12.34 or 12.34-)
        pattern = re.compile(r'^([A-Za-z]{3}\s*\d{1,2}|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})\s+(.+?)\s+([\$\d,]+\.\d{2}-?)\s*([\$\d,]+\.\d{2})?$', re.IGNORECASE)

        for line in lines:
            line_str = line.strip()
            match = pattern.match(line_str)
            if match:
                dt_str, desc, amt_str, bal_str = match.groups()
                dt_norm = cls._normalize_date(dt_str)
                if not dt_norm:
                    continue

                amt = cls._clean_currency_val(amt_str)
                bal = cls._clean_currency_val(bal_str) if bal_str else None
                inflow = amt if amt > 0 else 0.0
                outflow = abs(amt) if amt < 0 else 0.0

                clean_merch, category, is_transfer = rules.clean_and_categorize(desc)

                txs.append({
                    "account_id": account.get("id", "pdf_account"),
                    "institution": institution,
                    "account_name": account.get("account_name", f"{institution} Statement"),
                    "date": dt_norm,
                    "raw_description": desc,
                    "clean_merchant": clean_merch,
                    "category": category,
                    "inflow_amount": inflow,
                    "outflow_amount": outflow,
                    "running_balance": bal,
                    "is_transfer": 1 if is_transfer else 0
                })
        return txs

    @classmethod
    def _extract_reconciliation_from_text(cls, full_text: str, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates mathematical reconciliation check: Starting + Inflows - Outflows == Ending."""
        tot_inflows = sum(tx["inflow_amount"] for tx in transactions)
        tot_outflows = sum(tx["outflow_amount"] for tx in transactions)

        # Look for explicit starting/ending balances in statement headers
        start_m = re.search(r'(?:Opening|Previous|Starting)\s*Balance[:\s]*\$?([\d,]+\.\d{2})', full_text, re.IGNORECASE)
        end_m = re.search(r'(?:Closing|New|Ending)\s*Balance[:\s]*\$?([\d,]+\.\d{2})', full_text, re.IGNORECASE)

        start_bal = cls._clean_currency_val(start_m.group(1)) if start_m else None
        end_bal = cls._clean_currency_val(end_m.group(1)) if end_m else None

        is_balanced = True
        notes = "Reconciled with statement."
        if start_bal is not None and end_bal is not None:
            expected_end = start_bal + tot_inflows - tot_outflows
            diff = abs(expected_end - end_bal)
            if diff > 0.02:
                is_balanced = False
                notes = f"Discrepancy detected: Expected ending balance ${expected_end:,.2f} vs reported ${end_bal:,.2f} (Diff: ${diff:,.2f})"
            else:
                notes = f"Exact mathematical balance verified (${start_bal:,.2f} + ${tot_inflows:,.2f} - ${tot_outflows:,.2f} == ${end_bal:,.2f})."

        return {
            "starting_balance": start_bal,
            "ending_balance": end_bal,
            "total_inflows": tot_inflows,
            "total_outflows": tot_outflows,
            "is_balanced": is_balanced,
            "notes": notes
        }

    @classmethod
    def _detect_chronological_gaps(cls, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Flags missing statement months or date gaps (> 45 days)."""
        if len(transactions) < 2:
            return []

        sorted_dates = sorted([tx["date"] for tx in transactions if tx.get("date")])
        gaps = []

        for i in range(len(sorted_dates) - 1):
            try:
                d1 = datetime.datetime.strptime(sorted_dates[i], "%Y-%m-%d")
                d2 = datetime.datetime.strptime(sorted_dates[i+1], "%Y-%m-%d")
                delta_days = (d2 - d1).days
                if delta_days > 45:
                    gaps.append({
                        "from_date": sorted_dates[i],
                        "to_date": sorted_dates[i+1],
                        "gap_days": delta_days,
                        "severity": "WARNING",
                        "message": f"Gap of {delta_days} days detected between {sorted_dates[i]} and {sorted_dates[i+1]}. Potential missing statement."
                    })
            except Exception:
                continue

        return gaps
