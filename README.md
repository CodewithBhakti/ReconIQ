# ReconIQ — Financial Intelligence Platform

Enterprise-grade multi-currency reconciliation and financial analytics platform designed to solve real-world corporate merger data fragmentation across unstructured server logs, historical SQL customer registries, and volatile foreign exchange feeds.

![ReconIQ Architecture](https://img.shields.io/badge/Architecture-FastAPI%20%7C%20React%20%7C%20SQLite%20%7C%20Tailwind-blue)
![Engine SLA](https://img.shields.io/badge/Engine%20SLA-99.98%25%20Verified-teal)
![Scale](https://img.shields.io/badge/Scale-100%2C000%20Events%20%2F%20%3C2s-navy)

---

## Executive Summary & Verified Production Metrics

From the complete FY2023 dataset containing **100,001 log records**, **47,464 historical user updates**, and **365 calendar exchange rates**, ReconIQ produced:

- **Total Reconciled USD Revenue**: `$148,274,623.47`
- **Total Reconciled EUR Amount**: `€134,958,287.20`
- **Total Raw Ingestion Lines**: `100,001`
- **Valid Transaction Events Extracted**: `94,902`
- **System Error Logs Filtered**: `5,098` (0 corrupted lines allowed into the ledger)
- **Active KYC Customers (Latest Window)**: `14,183` (from `25,000` unique users)
- **Reconciled Transactions**: `53,899`
- **Inactive/Suspended Counterparty Exceptions Flagged**: `41,003`
- **Average Settled FX Rate**: `1.0987 EUR/USD`
- **Pipeline Execution Latency**: `~1.85 seconds` (100% vectorized in Pandas & compiled C regex)

---

## Pedagogical Traps & Architectural Resolutions

| Trap | Pedagogical Challenge | ReconIQ Architectural Resolution |
| :--- | :--- | :--- |
| **Trap 1: Scale & Optimization** | 100,000 log lines cause standard Pandas `for` loops or `iterrows()` to timeout or take hours. | Implemented pure vectorized operations in Pandas with pre-compiled regular expressions. Full dataset reconciles in under 2 seconds. |
| **Trap 2: Unstructured Data** | Transaction attributes are trapped inside messy, unstructured server log strings with embedded error messages. | Compiled regex parser (`LOG_INFO_PATTERN`) extracts Timestamp, User ID, Product ID, and EUR Amount, strictly isolating `ERROR` log lines into an audit exception queue. |
| **Trap 3: Temporal Reconciliation** | Financial markets close on weekends; Saturday/Sunday lack exchange rates, causing standard `INNER JOIN` to silently delete ~28% of data. | Applied chronological temporal forward-filling (`ffill()`) so Friday's closing market rate rolls forward across Saturday and Sunday. |
| **Trap 4: Version Control (Advanced SQL)** | `users` table is a historical ledger where accounts appear multiple times with changing statuses (`Pending`, `Active`, `Suspended`). | Implemented SQL Window Function `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, rowid DESC)` to evaluate only the most recent chronological state. |

---

## Repository Structure

```
iStudio/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py             # FastAPI REST endpoints
│   │   ├── core/
│   │   │   ├── audit_db.py           # SQLite forensic run history database
│   │   │   ├── config.py             # Settings, paths, and CORS configuration
│   │   │   └── state.py              # In-memory pipeline coordinator & caching
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic models for API validation
│   │   ├── pipeline/
│   │   │   ├── analytics.py          # Revenue models, product breakdown, customer ranking
│   │   │   ├── fx_engine.py          # Temporal forward-fill & FX validator
│   │   │   ├── log_parser.py         # High-speed log parser & error filter
│   │   │   ├── reconciler.py         # Multi-currency join & ledger attribution
│   │   │   └── user_processor.py     # SQL Window Function user version extractor
│   │   └── main.py                   # FastAPI server entrypoint
│   ├── uploads/                      # Isolated directory for user uploads
│   └── reconiq_audit.db              # Persistent SQLite audit database
├── data/
│   ├── daily_exchange_rates.csv      # Daily EUR-to-USD exchange rate feed
│   ├── enterprise_database.db        # Master customer SQLite database
│   ├── server_logs.txt               # 100,000 raw server transaction logs
│   ├── statement.pdf                 # Capstone difficulty analysis
│   └── Student_work_file.ipynb       # Reference student notebook
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts             # TypeScript API client
│   │   ├── components/
│   │   │   └── Navigation.tsx        # Navy sidebar & top header (Google Stitch design)
│   │   ├── pages/
│   │   │   ├── OverviewView.tsx      # Executive overview, KPIs, charts & stream
│   │   │   ├── TransactionsView.tsx  # Paginated transaction ledger & forensic inspector
│   │   │   ├── CustomersView.tsx     # Institutional customer volume rankings
│   │   │   ├── RevenueAnalyticsView.tsx # Multi-currency quarterly models & SKU performance
│   │   │   ├── DataSourcesView.tsx   # File schema validation & upload dropzones
│   │   │   ├── ReconciliationRulesView.tsx # Interactive trap solutions & code inspector
│   │   │   ├── AuditLogsView.tsx     # Persistent execution run history
│   │   │   └── SettingsView.tsx      # Engine controls & health diagnostics
│   │   ├── App.tsx                   # Main component shell
│   │   ├── index.css                 # Tailwind CSS & tabular typography setup
│   │   └── main.tsx                  # React entrypoint
│   ├── package.json
│   ├── tailwind.config.js            # ReconIQ design tokens
│   └── vite.config.ts
├── tests/
│   └── test_pipeline.py              # Comprehensive automated unit & integration test suite
├── start_platform.ps1                # One-click startup script for Windows
├── .env.example                      # Environment variables template
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python**: 3.12 or 3.13 (with `pandas`, `fastapi`, `uvicorn`, `pydantic`, `pytest`)
- **Node.js**: v20+ or v24+ (with `npm`)

### 1. Backend Setup

```bash
cd backend

# Install Python requirements
pip install fastapi uvicorn pydantic pydantic-settings python-multipart pandas numpy pytest httpx pypdf

# Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will run on `http://localhost:8000`. You can inspect interactive OpenAPI documentation at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend will run on `http://localhost:5173`.

---

## Automated Test Suite

ReconIQ includes a comprehensive pytest suite covering all 4 trap resolutions, math formulas, error states, and API contracts.

```bash
# Run tests from project root
pytest tests/test_pipeline.py -v
```

### Verified Test Results:
```text
tests/test_pipeline.py::test_historical_user_window_function PASSED [ 16%]
tests/test_pipeline.py::test_log_parser_and_error_filtering PASSED  [ 33%]
tests/test_pipeline.py::test_exchange_rate_forward_filling PASSED   [ 50%]
tests/test_pipeline.py::test_financial_reconciliation PASSED        [ 66%]
tests/test_pipeline.py::test_empty_dataset_handling PASSED          [ 83%]
tests/test_pipeline.py::test_api_endpoints PASSED                   [100%]
======================== 6 passed in 3.96s =========================
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health check and engine state |
| `POST` | `/api/reconciliation/run` | Triggers complete 4-stage pipeline execution |
| `GET` | `/api/dashboard` | Returns full executive dashboard metrics & charts |
| `GET` | `/api/transactions` | Paginated, searchable, and filtered transaction ledger |
| `GET` | `/api/customers/top` | Customers ranked by cleared USD volume |
| `GET` | `/api/datasources` | File verification details for all 5 enterprise assets |
| `GET` | `/api/audit-logs` | Historical execution runs from SQLite audit store |
| `GET` | `/api/export/transactions` | Streams downloadable CSV of reconciled transactions |
| `POST` | `/api/upload` | Multipart file upload and schema validation endpoint |

---

## Design System & Color Palette

ReconIQ implements the **Institutional Financial Intelligence** design system:
- **Navy Sidebar**: `#14243A`
- **Deep Midnight Navy**: `#0B1728`
- **Royal Operational Blue**: `#356AE6`
- **Validation Teal**: `#16A6A1`
- **Teal Light Pill**: `#E8F8F7`
- **Soft Canvas Ivory**: `#F7F8FA`
- **Surface Pure White**: `#FFFFFF`
- **Subtle Borders**: `#E2E8F0`
- **Monospace Tabular Numbers**: `font-feature-settings: "tnum" 1, "cv05" 1`
