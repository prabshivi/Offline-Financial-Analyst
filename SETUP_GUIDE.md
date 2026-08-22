# 🍁 Local Finance Vault (Canada) - Production Setup & Security Manual

A 100% local, offline-first personal wealth and mortgage intelligence platform engineered for Canadian households. Complies strictly with **PIPEDA Schedule 1** (Fair Information Principles) and **OSFI Guideline B-13** (Technology and Cyber Risk Management).

---

## 🔒 Security Architecture Highlights

1. **Zero-Knowledge Multi-Tenant Vaults**:
   - Each user maintains an isolated encrypted database (`data/vaults/{user_uuid}.db`).
   - Encrypted at rest via **AES-256 (SQLCipher)** with keys derived on-demand using **Argon2id** (250,000 iterations, 32-byte cryptographic salt).
   - No master key or backdoors.
2. **Zero Outbound Telemetry**:
   - In-app pre-flight socket hooks intercept and prevent any external network calls, telemetry beacons, or DNS tracking queries.
3. **Automated PII Redaction**:
   - Canadian Social Insurance Numbers (SIN), 16-digit Payment Card PANs, and bank transit/institution codes are masked before being written to storage.
4. **In-Memory Statement Ingestion**:
   - All PDF and CSV statements are parsed in `io.BytesIO` memory buffers with magic-byte file signature validation.

---

## 🚀 Quickstart Installation

### 1. Prerequisites (OS-Level SQLCipher)

#### macOS (Homebrew)
```bash
brew install sqlcipher
```

#### Ubuntu / Debian
```bash
sudo apt-get update
sudo apt-get install -y libsqlcipher-dev sqlcipher python3-pip python3-venv
```

#### Fedora / RHEL
```bash
sudo dnf install -y sqlcipher-devel sqlcipher
```

---

### 2. Python Virtual Environment Setup

```bash
# Clone or navigate to the repository
cd local-finance-vault

# Create isolated Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install exact pinned dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

---

### 3. Launch the Application

```bash
streamlit run app.py --server.port 8501 --server.address 127.0.0.1
```

Once launched, navigate to `http://localhost:8501` in your browser.

---

## 🧪 Security & Compliance Testing

Run the automated test suite and static analysis audit:

```bash
chmod +x run_audit.sh
./run_audit.sh
```

Or execute Pytest directly:
```bash
pytest tests/ -v --cov=core
```

---

## 📁 End-to-End Directory Layout

```
.
├── app.py                      # Multi-tab Streamlit dashboard interface
├── requirements.txt            # Pinned open-source production dependencies
├── run_audit.sh                # Automated SAST, CVE, and Pytest audit script
├── SETUP_GUIDE.md              # OS-level deployment and configuration manual
├── core/
│   ├── __init__.py
│   ├── security.py             # Argon2id KDF, PII scrubbing, zero-network socket hook
│   ├── vault_manager.py        # Multi-user vault isolation & memory purge lifecycle
│   ├── db.py                   # SQLCipher encrypted relational database layer
│   ├── parser.py               # Universal multi-bank PDF/CSV parser with balance checks
│   ├── rules.py                # Canadian merchant cleaner and categorization engine
│   └── analytics.py            # Mortgage solver, TFSA/RRSP/FHSA trackers, subscription auditor
├── tests/
│   ├── __init__.py
│   ├── test_vault_isolation.py # Multi-tenant cryptographic isolation tests
│   ├── test_security.py        # PII masking, KDF entropy, and network hook tests
│   └── test_parser_reconciliation.py # Balance reconciliation and parser tests
└── data/
    └── vaults/                 # Isolated per-user encrypted databases (.db)
```
