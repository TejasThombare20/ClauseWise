# ClauseWise - AI-Powered Contract Clause Analyzer

ClauseWise is a full-stack platform that uses Claude AI to automatically extract and categorize key clause information from legal contract documents (DOCX). It parses contracts into structured data across 9 predefined clause categories, stores results in PostgreSQL, and displays them in an interactive dashboard.

---

## What the Platform Does

1. **Upload & Parse** — Place `.docx` contract files in `server/public/`. The platform discovers them automatically, including nested subdirectories.
2. **AI Analysis** — Claude AI reads the full contract text and extracts relevant content for 9 clause categories using forced tool calling.
3. **Deduplication** — MD5 checksums prevent re-analyzing unchanged files, saving API costs.
4. **Dashboard** — A React frontend displays all analyzed contracts in a table view — contracts as rows, clause categories as columns.
5. **Automation** — A configurable cron job can run batch analysis on all documents at scheduled intervals.

---

## File Structure

### Server (`server/`)

```
server/
├── package.json
├── tsconfig.json
├── .env                              # Environment variables (API keys, DB config)
├── public/                           # Drop DOCX contract files here
└── src/
    ├── index.ts                      # Express app entry point, middleware setup
    ├── config/
    │   └── logger.ts                 # Winston logger (console + file transports)
    ├── controllers/
    │   └── contractController.ts     # Route handlers for all API endpoints
    ├── db/
    │   ├── database.ts               # PostgreSQL connection pool (Database class)
    │   ├── migrate.ts                # CLI migration runner
    │   ├── migrationRunner.ts        # Migration execution logic
    │   └── migrations/
    │       ├── 001_create_contract_analyses.sql
    │       ├── 002_add_file_checksum.sql
    │       └── 003_create_documents_table.sql
    ├── repositories/
    │   ├── contractRepository.ts     # SQL queries for contract_analyses table
    │   └── documentRepository.ts     # SQL queries for documents table
    ├── routes/
    │   └── contracts.ts              # Express router definitions
    ├── schemas/
    │   └── toolSchemas.ts            # Zod schemas + Claude tool definition
    ├── services/
    │   ├── agentService.ts           # Claude AI agent (tool calling + validation)
    │   ├── contractService.ts        # Business logic (single + batch analysis)
    │   ├── cronService.ts            # Scheduled batch analysis (node-cron)
    │   └── documentParser.ts         # DOCX to Markdown (mammoth.js) + checksums
    └── types/
        └── mammoth.d.ts             # Type declarations for mammoth
```

### Client (`client/`)

```
client/
├── package.json
├── tsconfig.json
├── index.html                        # App shell with dark theme
├── vite.config.js                    # Vite dev server + API proxy
├── tailwind.config.js                # Tailwind CSS config
└── src/
    ├── main.tsx                      # React entry point
    ├── App.tsx                       # Root layout with header + main sections
    ├── index.css                     # Global styles (Tailwind imports)
    ├── lib/
    │   └── utils.ts                  # cn() utility for class merging
    ├── api/
    │   └── contracts.ts              # ContractsApi class (Axios HTTP client)
    └── components/
        ├── BatchControls.tsx         # Batch analysis trigger + cron schedule UI
        ├── ContractTable.tsx         # Contract results table (rows x clause columns)
        ├── DocumentSelector.tsx      # File picker + single document analysis
        └── ui/                       # shadcn/ui components
            ├── badge.tsx
            ├── button.tsx
            ├── card.tsx
            └── table.tsx
```

---

## Features

### LLM System (Claude AI Agent)

- Uses **Claude Sonnet** via the Anthropic SDK (`@anthropic-ai/sdk`)
- **Forced tool calling** — the model is constrained to call `store_contract_analysis` exactly once, returning structured data for all 9 clause categories
- A detailed **system prompt** instructs the model on how to extract clause text, derive a contract name, and handle missing clauses (`NO_DATA_AVAILABLE`)
- Responses are **validated with Zod** to ensure type safety and structural correctness before storage
- Key validation: all 9 clause keys must be present with no duplicates

### Schema Structure

Two PostgreSQL tables with a foreign key relationship:

**`documents`** — stores file metadata and parsed content:
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `file_name` | TEXT | Relative file path |
| `file_type` | TEXT | File extension |
| `markdown_content` | TEXT | Parsed markdown from DOCX |
| `checksum` | TEXT | MD5 hash for deduplication |
| `uploaded_at` | TIMESTAMPTZ | Timestamp |

**`contract_analyses`** — stores extracted clause data:
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `file_id` | UUID | FK to documents table |
| `contract_name` | TEXT | AI-derived contract name |
| `key_name` | TEXT | Clause category identifier |
| `content` | TEXT | Extracted clause text |
| `created_at` | TIMESTAMPTZ | Timestamp |

Unique constraint: `(file_id, contract_name, key_name)` — prevents duplicate entries per document per clause.

### Cron Job (Scheduled Batch Analysis)

- Powered by **node-cron** with configurable cron expressions (default: every 6 hours)
- Start/stop via REST API (`POST /api/cron/start`, `POST /api/cron/stop`)
- UI controls in the dashboard to configure schedule and monitor status
- Tracks last run timestamp and per-file results (analyzed / skipped / failed)
- Prevents concurrent batch runs with a running-state guard

### Document Parsing & Deduplication

- **mammoth.js** converts DOCX to Markdown, preserving headings, lists, and bold text
- MD5 checksum of the markdown content is stored per file
- If a file's name + checksum match an existing record, the LLM call is skipped entirely
- Changed files are automatically re-analyzed on the next run

### 9 Contract Clause Categories

| Key | Description |
|-----|-------------|
| `intellectual_property_ownership` | IP ownership, assignment, work product |
| `limitation_of_liability` | Caps on liability, damage exclusions |
| `warranty_disclaimer` | Disclaimers, "as-is" provisions |
| `indemnification` | Indemnify, defend, hold harmless obligations |
| `data_processing_terms` | Data handling, privacy, GDPR/CCPA |
| `termination_for_convenience` | Termination without cause, notice periods |
| `non_solicitation` | Employee/client solicitation restrictions |
| `payment_terms` | Payment schedules, compensation, invoicing |
| `confidentiality` | Confidentiality obligations, NDA terms |

### Additional Features

- **OOP Architecture** — classes for Database, AgentService, ContractService, CronService, DocumentParser, ContractRepository, DocumentRepository, ContractController
- **Winston Logging** — structured logs to console (dev), `app.log` (all), and `error.log` (errors only) with timestamps, log levels, and request timing
- **Migration System** — versioned SQL migrations with a `schema_migrations` tracking table
- **API Proxy** — Vite dev server proxies `/api` requests to the Express backend
- **Dark Theme** — shadcn/ui with Tailwind CSS, default dark mode

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (server + client) |
| Frontend | React 19, Vite 5, shadcn/ui, Tailwind CSS, Axios |
| Backend | Node.js, Express 5, ts-node |
| AI | Claude API (`@anthropic-ai/sdk`), forced tool calling |
| Database | PostgreSQL (`pg`) |
| Validation | Zod + zod-to-json-schema |
| Document Parsing | mammoth.js (DOCX to Markdown) |
| Scheduling | node-cron |
| Logging | Winston |

---

## Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Anthropic API key

## Setup

### 1. Database

```bash
createdb clausewise
```

### 2. Server

```bash
cd server
npm install
cp .env.example .env   # Set ANTHROPIC_API_KEY and DB credentials
npm run dev
```

### 3. Client

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` and proxies API requests to the server on `http://localhost:3000`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Your Anthropic API key (required) |
| `PORT` | `3000` | Server port |
| `PG_HOST` | `localhost` | PostgreSQL host |
| `PG_PORT` | `5432` | PostgreSQL port |
| `PG_USER` | `postgres` | PostgreSQL user |
| `PG_PASSWORD` | `postgres` | PostgreSQL password |
| `PG_DATABASE` | `clausewise` | PostgreSQL database name |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/documents` | List available DOCX files |
| `POST` | `/api/analyze` | Analyze a single document |
| `POST` | `/api/analyze/batch` | Trigger batch analysis |
| `GET` | `/api/analyze/status` | Get batch analysis status |
| `POST` | `/api/cron/start` | Start cron job |
| `POST` | `/api/cron/stop` | Stop cron job |
| `GET` | `/api/contracts` | List analyzed contract names |
| `GET` | `/api/contracts/:name` | Get clause data for a contract |
