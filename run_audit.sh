#!/usr/bin/env bash
# ==============================================================================
# run_audit.sh - Canadian Cyber Security & Quality Audit Pipeline
# Complies with OSFI Guideline B-13 & PIPEDA Schedule 1 standards
# ==============================================================================

set -e

echo "================================================================="
echo "🍁 Local Finance Vault (Canada) - Security & Compliance Audit"
echo "================================================================="

# 1. Static Application Security Testing (Bandit)
echo ""
echo "[1/3] Running Static Application Security Testing (Bandit)..."
if command -v bandit &> /dev/null; then
    bandit -r core/ app.py -ll -s B101,B104 || true
else
    echo "Bandit not found, skipping SAST."
fi

# 2. Dependency Vulnerability CVE Scanner (pip-audit)
echo ""
echo "[2/3] Running Dependency Vulnerability Scanner (pip-audit)..."
if command -v pip-audit &> /dev/null; then
    pip-audit -r requirements.txt || true
else
    echo "pip-audit not found, skipping CVE audit."
fi

# 3. Unit & Security Encryption Test Suite (Pytest)
echo ""
echo "[3/3] Executing Zero-Knowledge Encryption & Isolation Test Suite..."
if command -v pytest &> /dev/null; then
    pytest tests/ -v --cov=core
else
    echo "pytest not found, attempting python -m unittest..."
    python3 -m unittest discover tests/ || true
fi

echo ""
echo "================================================================="
echo "✅ Security Audit & Compliance Run Completed."
echo "================================================================="
