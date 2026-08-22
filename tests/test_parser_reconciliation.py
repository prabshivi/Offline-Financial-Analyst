"""
tests/test_parser_reconciliation.py
Verifies:
- Statement parsing from CSV & text formats
- Mathematical reconciliation logic (Starting + Inflows - Outflows == Ending)
- SHA-256 deduplication signatures
- Chronological date gap detection
"""

import pytest
from core.parser import StatementParser
from core.rules import RuleEngine


def test_csv_parser_and_deduplication():
    """Verify CSV parsing with Canadian columns and SHA-256 hash deduplication."""
    csv_content = """Date,Description,Withdrawals,Deposits,Balance
2024-04-01,TIM HORTONS #4912,8.75,,4991.25
2024-04-02,PAYROLL DIRECT DEPOSIT,,3500.00,8491.25
2024-04-03,LOBLAWS SUPERSTORE,145.20,,8346.05
"""
    file_bytes = csv_content.encode("utf-8")
    result = StatementParser.parse_file(file_bytes, "rbc_statement.csv")

    assert result["success"] is True
    txs = result["transactions"]
    assert len(txs) == 3

    # Check Tim Hortons cleaning & category
    tx_tims = txs[0]
    assert tx_tims["clean_merchant"] == "Tim Hortons"
    assert tx_tims["category"] == "Dining & Restaurants"
    assert tx_tims["outflow_amount"] == 8.75
    assert tx_tims["hash_signature"] is not None

    # Check deduplication signature uniqueness
    hashes = [t["hash_signature"] for t in txs]
    assert len(set(hashes)) == 3


def test_balance_reconciliation_math():
    """Verify mathematical reconciliation detection."""
    # Balanced statement
    txs = [
        {"inflow_amount": 1000.0, "outflow_amount": 200.0},
        {"inflow_amount": 500.0, "outflow_amount": 300.0}
    ]
    full_text = "Previous Balance: $1000.00 ... Closing Balance: $2000.00"
    reconcile = StatementParser._extract_reconciliation_from_text(full_text, txs)
    # Expected: 1000 + 1500 - 500 = 2000
    assert reconcile["is_balanced"] is True


def test_chronological_gap_detection():
    """Verify gaps greater than 45 days are detected."""
    txs = [
        {"date": "2024-01-01"},
        {"date": "2024-01-15"},
        {"date": "2024-04-20"}  # 96 day gap
    ]
    gaps = StatementParser._detect_chronological_gaps(txs)
    assert len(gaps) == 1
    assert gaps[0]["gap_days"] > 45
    assert "Missing statement" in gaps[0]["message"] or "Gap of" in gaps[0]["message"]
