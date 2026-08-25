"""
tests/test_parser_reconciliation.py
Verifies:
- Statement parsing from CSV & text formats
- Mathematical reconciliation logic (Starting + Inflows - Outflows == Ending)
- SHA-256 deduplication signatures
- Chronological date gap detection
"""

import unittest
from core.parser import StatementParser
from core.rules import RuleEngine


class TestParserReconciliation(unittest.TestCase):

    def test_csv_parser_and_deduplication(self):
        """Verify CSV parsing with Canadian columns and SHA-256 hash deduplication."""
        csv_content = """Date,Description,Withdrawals,Deposits,Balance
2024-04-01,TIM HORTONS #4912,8.75,,4991.25
2024-04-02,PAYROLL DIRECT DEPOSIT,,3500.00,8491.25
2024-04-03,LOBLAWS SUPERSTORE,145.20,,8346.05
"""
        file_bytes = csv_content.encode("utf-8")
        result = StatementParser.parse_file(file_bytes, "rbc_statement.csv")

        self.assertTrue(result["success"])
        txs = result["transactions"]
        self.assertEqual(len(txs), 3)

        # Check Tim Hortons cleaning & category
        tx_tims = txs[0]
        self.assertEqual(tx_tims["clean_merchant"], "Tim Hortons")
        self.assertEqual(tx_tims["category"], "Dining & Restaurants")
        self.assertEqual(tx_tims["outflow_amount"], 8.75)
        self.assertIsNotNone(tx_tims["hash_signature"])

        # Check deduplication signature uniqueness
        hashes = [t["hash_signature"] for t in txs]
        self.assertEqual(len(set(hashes)), 3)

    def test_balance_reconciliation_math(self):
        """Verify mathematical reconciliation detection."""
        # Balanced statement
        txs = [
            {"inflow_amount": 1000.0, "outflow_amount": 200.0},
            {"inflow_amount": 500.0, "outflow_amount": 300.0}
        ]
        full_text = "Previous Balance: $1000.00 ... Closing Balance: $2000.00"
        reconcile = StatementParser._extract_reconciliation_from_text(full_text, txs)
        # Expected: 1000 + 1500 - 500 = 2000
        self.assertTrue(reconcile["is_balanced"])

    def test_chronological_gap_detection(self):
        """Verify gaps greater than 45 days are detected."""
        txs = [
            {"date": "2024-01-01"},
            {"date": "2024-01-15"},
            {"date": "2024-04-20"}  # 96 day gap
        ]
        gaps = StatementParser._detect_chronological_gaps(txs)
        self.assertEqual(len(gaps), 1)
        self.assertGreater(gaps[0]["gap_days"], 45)
        self.assertTrue("Missing statement" in gaps[0]["message"] or "Gap of" in gaps[0]["message"])


if __name__ == "__main__":
    unittest.main()

