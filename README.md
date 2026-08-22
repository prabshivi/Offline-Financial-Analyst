# Privacy-First Financial Vault & Ledger

A secure, offline-first personal finance application and statement ingestion engine designed with zero-knowledge architecture, local SQLite database storage, automated PII scrubbing, and Canadian & US bank statement parsing.

---

## Key Features for Users

- **Multi-Bank Statement Ingestion**: 
  - Direct drag-and-drop or file upload for CSV, TSV, OFX/QFX, JSON, plain text statements, and PDF/image documents.
  - Native presets with auto-detection for Canadian institutions (RBC Royal Bank, TD Canada Trust, Scotiabank, BMO, CIBC, Desjardins, Tangerine) and US institutions (Chase, Amex, Capital One, Discover, Citi, Wells Fargo, Apple Card).
- **Automated PII Scrubbing & Privacy Protection**:
  - Automatically detects and redacts 16-digit credit card numbers, Canadian transit/institution routing numbers, SINs, SSNs, phone numbers, and emails before any record is committed to storage.
- **Smart Categorization & Normalization**:
  - Heuristic- and regex-driven categorization engine that groups expenses (groceries, utilities, subscriptions, dining, transit, housing, investments).
  - Custom rules engine allows defining custom patterns, merchant alias overwrites, and priority execution.
- **Interactive Financial Dashboard & Analytics**:
  - Monthly cash flow charts, category breakdown rings, inflow vs. outflow meters, and 50/30/20 budget adherence tracking.
- **Master Ledger & Transaction Editor**:
  - Search, filter by date/institution/category, inline categorization, and manual transaction entry.
- **Zero-Knowledge Security Vault**:
  - PIN protection lock screen with instant session lock.
  - Complete database export (JSON, CSV, raw SQLite binary) and one-click database purge with zero remote telemetry.
- **Automated Bank PDF Retrieval & Dropzone Daemon**:
  - **Local Folder Watcher**: Automatic monitoring of `data/dropzone` for incoming statement files (PDF, CSV, OFX, JSON) with automatic ingestion, PII scrubbing, deduplication, and archival into `data/dropzone/processed`.
  - **Webhook Ingestion API**: Secure token-authenticated webhook (`/api/auto-fetch/webhook`) for direct ingestion from headless browser scripts (Playwright, Puppeteer), Python daemons, and cURL terminal triggers.
  - **Bank Script Generator**: Pre-built recipes for RBC Royal Bank, TD Canada Trust, Scotiabank, BMO, CIBC, Chase, and American Express with 2FA session persistence.
- **Nightly CI/CD & Test Automation**:
  - Integrated in-app test runner and automated GitHub Actions nightly workflow (`.github/workflows/nightly-tests.yml`) validating deduplication hashing, PII scrubbing, statement parsers, and type safety.

---

## Technology Stack

- **Frontend**:
  - **React 18** with **TypeScript** for type-safe UI components.
  - **Tailwind CSS** with full Dark Mode support and responsive design.
  - **Lucide React** for consistent vector iconography.
  - **Recharts** for financial data visualization and budget analytics.
- **Backend & Persistence**:
  - **Node.js & Express** embedded full-stack server.
  - **better-sqlite3** with WAL (Write-Ahead Logging) mode for local, fast transactional data storage in `data/vault.db`.
  - **Gemini API (`@google/genai`)**: Optional server-side multimodal document analysis for complex receipt and statement images.
- **Parsing & Security**:
  - **PapaParse** for streaming CSV/TSV extraction.
  - Custom deterministic **SHA-256-like hashing** for collision-free transaction deduplication.
  - **Regex PII sanitizer** for PCI-DSS & PIPEDA compliance.
- **Build & Quality Assurance**:
  - **Vite** for rapid client development and static asset bundling.
  - **esbuild** for backend compilation into standalone CommonJS (`dist/server.cjs`).
  - **TypeScript Compiler (`tsc`)** & Custom Test Runner (`npm test`).
  - **GitHub Actions** for nightly automated cron regression tests.

---

## Getting Started

### Prerequisites
- Node.js 20.x or 22.x LTS
- npm 9+

### Installation & Local Run

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

3. **Run the automated test suite**:
   ```bash
   npm test
   ```

4. **Verify TypeScript compilation**:
   ```bash
   npm run lint
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

---

## Privacy & Security Model

- **No Remote Telemetry**: Your financial transactions, account names, and amounts are stored exclusively in your local SQLite database instance.
- **Pre-Commit Redaction**: Raw statement text containing credit card strings or transit numbers is scrubbed in memory prior to state synchronization.
- **Air-Gapped Operation**: The core parsing, categorization, and ledger analytics work completely offline without requiring third-party cloud connections.
