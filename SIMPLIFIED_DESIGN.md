# Career-Ops Simplified Architecture Design

## Current State Analysis

**Problem**: 200+ files in root, 160+ provider files, 20+ hidden agent directories, complex multi-language modes, heavy CI/CD, trying to be both AI-agent skill and CLI tool.

**Goal**: Single project structure, minimal dependencies, easy maintenance, all job search features.

---

## Reference Architecture: job-forager + job_search_tool

| Aspect | job-forager | job_search_tool |
|--------|-------------|-----------------|
| Language | Python (stdlib-first) | Python + Next.js |
| Config | TOML | YAML |
| Storage | SQLite | SQLite |
| Providers | 18 sources, modular | Greenhouse/Lever/Workday |
| UI | CLI + CSV/JSON export | Web dashboard (Next.js) |
| Scheduling | GitHub Actions | Manual/cron |

**Key Principles to Adopt**:
1. **Single language runtime** (Node.js only — no Python/Go mix)
2. **Config-driven providers** (YAML → provider modules auto-loaded)
3. **SQLite for state** (scan history, dedup, tracker — replace TSV/MD files)
4. **CLI-first** with optional web UI
5. **Plugin system for AI agents** (separate from core)

---

## Proposed Simplified Structure

```
career-ops/
├── package.json                 # Single entry point, bin, scripts
├── tsconfig.json                # TypeScript config
├── .gitignore
├── README.md
├── LICENSE
├── 
├── src/
│   ├── index.ts                 # Main CLI entry (commander.js)
│   ├── core/
│   │   ├── config.ts            # Config loader (YAML + env)
│   │   ├── database.ts          # SQLite wrapper (better-sqlite3)
│   │   ├── scanner.ts           # Orchestrator: fetch → filter → dedup → store
│   │   ├── models.ts            # TypeScript interfaces (Job, Company, ScanRun)
│   │   └── utils.ts             # Shared helpers
│   │
│   ├── providers/
│   │   ├── index.ts             # Auto-load all providers from providers/
│   │   ├── base.ts              # BaseProvider abstract class
│   │   ├── registry.ts          # Provider registry + detection
│   │   ├── http.ts              # Shared HTTP client with cache/rate-limit
│   │   ├── greenhouse.ts
│   │   ├── lever.ts
│   │   ├── ashby.ts
│   │   ├── workday.ts
│   │   ├── icims.ts
│   │   ├── successfactors.ts
│   │   ├── bamboo.ts
│   │   ├── smartrecruiters.ts
│   │   ├── jobvite.ts
│   │   ├── adp.ts
│   │   ├── oracle.ts
│   │   ├── dayforce.ts
│   │   ├── comeet.ts
│   │   ├── teamtailor.ts
│   │   └── ... (20 core providers, not 160)
│   │
│   ├── filters/
│   │   ├── title.ts             # Title filter (positive/negative, word/stem)
│   │   ├── location.ts          # Location filter (allow/block/always_allow)
│   │   ├── experience.ts        # Experience filter (years parsing)
│   │   └── age.ts               # Posting age filter
│   │
│   ├── commands/
│   │   ├── scan.ts              # scan command
│   │   ├── dashboard.ts         # dashboard command (HTML output)
│   │   ├── pipeline.ts          # pipeline command
│   │   ├── evaluate.ts          # evaluate command (AI scoring)
│   │   ├── tracker.ts           # tracker commands
│   │   └── config.ts            # config commands
│   │
│   ├── ai/
│   │   ├── evaluate.ts          # AI evaluation (LLM-agnostic interface)
│   │   ├── tailor.ts            # CV tailoring
│   │   └── providers/
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       ├── ollama.ts
│   │       └── gemini.ts
│   │
│   ├── cv/
│   │   ├── generator.ts         # HTML/PDF generator
│   │   ├── templates/
│   │   │   ├── cv.html
│   │   │   └── cv.tex
│   │   └── parser.ts            # CV parser (markdown → structured)
│   │
│   └── web/                     # Optional: simple Express dashboard
│       ├── server.ts
│       └── static/
│
├── config/
│   ├── default.yml              # Built-in defaults (companies, filters)
│   ├── user.yml.example         # User config template
│   └── schema.ts                # Zod schema for validation
│
├── data/                        # Git-ignored, created at runtime
│   ├── jobs.db                  # SQLite database
│   ├── pipeline.md              # User's manual entries
│   └── cv.md                    # User's CV
│
├── tests/
│   ├── unit/
│   │   ├── filters.test.ts
│   │   ├── providers.test.ts
│   │   └── database.test.ts
│   ├── integration/
│   │   └── scan.test.ts
│   └── fixtures/
│
├── scripts/
│   ├── setup.ts                 # One-shot setup (replaces setup.sh/ps1)
│   └── migrate.ts               # Data migration from old format
│
├── .github/
│   └── workflows/
│       ├── ci.yml               # Lint, typecheck, test
│       ├── release.yml          # Semantic release
│       └── scheduled-scan.yml   # Optional: daily scan via GitHub Actions
│
└── docs/
    ├── CONFIGURATION.md
    ├── PROVIDERS.md
    ├── AI_EVALUATION.md
    └── EXAMPLES.md
```

---

## Key Simplifications

| Current | Simplified | Rationale |
|---------|------------|-----------|
| 160 provider .mjs files | ~20 core provider TS files | 80% of jobs from top 20 ATS; long tail via generic RSS/HTML |
| TSV/MD files for state | SQLite (better-sqlite3) | ACID, indexes, incremental scans, easy queries |
| 20+ hidden agent dirs | **Zero** in core | AI agent integration via **separate plugin package** |
| 20 language mode dirs | **Config-driven** i18n | YAML-based market config, not duplicate code |
| 50+ root .mjs scripts | 8 CLI commands | commander.js subcommands |
| Custom path resolver | Standard `config` pkg | `~/.config/career-ops` + `CAREER_OPS_DATA_DIR` |
| Manual HTML generation | Template engine (eta/nunjucks) | Maintainable, testable |
| dotenv in 50 files | Single config loader | Centralized, validated, typed |

---

## Dependency Reduction

### Current (package.json)
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "dotenv": "^18.0.4",
    "js-yaml": "^5.3.0",
    "playwright": "1.64.1",
    "undici": "^7.30.1"
  }
}
```

### Proposed
```json
{
  "dependencies": {
    "commander": "^12.0.0",        # CLI framework
    "js-yaml": "^4.1.0",           # Config parsing
    "better-sqlite3": "^9.4.0",    # Local database
    "undici": "^6.0.0",            # HTTP client (stdlib-compatible)
    "zod": "^3.22.0",              # Config validation
    "eta": "^3.0.0",               # Template engine (tiny, fast)
    "date-fns": "^3.0.0",          # Date handling
    "chalk": "^5.3.0"              # Terminal colors
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "playwright": "^1.42.0"        # Only for headed verification (optional)
  }
}
```

**Removed**: @google/generative-ai (use provider interface), dotenv (Node 20+ has `--env-file`), custom HTTP cache (use undici + SQLite).

---

## Database Schema (SQLite)

```sql
-- Jobs table (dedup key: canonical_url)
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY,
  canonical_url TEXT UNIQUE NOT NULL,
  source_url TEXT,                 -- original URL (may be aggregator)
  provider TEXT NOT NULL,          -- greenhouse, lever, linkedin, manual
  company TEXT NOT NULL,
  company_slug TEXT,
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,                -- full JD
  description_html TEXT,
  posted_date TEXT,                -- ISO 8601
  discovered_date TEXT DEFAULT (datetime('now')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT,
  experience_min INTEGER,          -- years
  experience_max INTEGER,
  remote_type TEXT,                -- remote, hybrid, onsite
  employment_type TEXT,            -- full-time, contract, intern
  tags TEXT,                       -- JSON array of skills/keywords
  status TEXT DEFAULT 'new',       -- new, evaluated, applied, interview, offer, rejected, discarded
  score REAL,                      -- AI fit score 0-5
  report_path TEXT,                -- path to evaluation report
  cv_path TEXT,                    -- tailored CV path
  notes TEXT
);

-- Scan runs (history)
CREATE TABLE scan_runs (
  id INTEGER PRIMARY KEY,
  run_date TEXT DEFAULT (datetime('now')),
  companies_scanned INTEGER,
  jobs_found INTEGER,
  jobs_new INTEGER,
  jobs_filtered INTEGER,
  duration_ms INTEGER,
  errors TEXT                      -- JSON
);

-- Companies config (synced from portals.yml)
CREATE TABLE companies (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  provider TEXT,
  provider_id TEXT,                -- tenant slug
  careers_url TEXT,
  enabled INTEGER DEFAULT 1,
  title_filter_positive TEXT,      -- JSON
  title_filter_negative TEXT,
  location_allow TEXT,
  location_block TEXT,
  experience_max_years INTEGER,
  created_date TEXT DEFAULT (datetime('now')),
  updated_date TEXT DEFAULT (datetime('now'))
);

-- User profile (synced from config/user.yml)
CREATE TABLE user_profile (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Indexes
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_posted ON jobs(posted_date);
CREATE INDEX idx_jobs_provider ON jobs(provider);
```

---

## Configuration (config/user.yml)

```yaml
# career-ops user configuration
# Copy to ~/.config/career-ops/user.yml or set CAREER_OPS_CONFIG

data_dir: "~/.local/share/career-ops"     # SQLite, pipeline, CV
output_dir: "~/.local/share/career-ops/output"

# Profile (used for AI evaluation & filtering)
profile:
  name: "Your Name"
  email: "you@example.com"
  location: "San Francisco, CA"
  timezone: "America/Los_Angeles"
  years_experience: 8
  target_roles:
    - "Senior Software Engineer"
    - "Staff Engineer"
    - "Engineering Lead"
  salary:
    min: 180000
    max: 300000
    currency: "USD"
  skills:
    - "TypeScript"
    - "React"
    - "Node.js"
    - "AWS"
    - "PostgreSQL"
    - "GraphQL"
  deal_breakers:
    - "onsite only"
    - "no equity"

# Scanning
scan:
  concurrency: 10
  max_age_days: 30
  experience_stretch_years: 2
  title_filter:
    positive:
      - "Senior"
      - "Lead"
      - "Staff"
      - "Principal"
      - "Engineer"
      - "Developer"
    negative:
      - "Intern"
      - "Junior"
      - "Entry"
      - "Student"
  location_filter:
    allow:
      - "United States"
      - "Remote"
    block:
      - "India"
      - "China"

# Companies to scan (minimal, extendable)
companies:
  - name: "Stripe"
    provider: "greenhouse"
    provider_id: "stripe"
  - name: "Airbnb"
    provider: "greenhouse"
    provider_id: "airbnb"
  # ... add more

# AI Evaluation (optional)
ai:
  provider: "anthropic"              # openai, anthropic, ollama, gemini
  model: "claude-3-5-sonnet-20241022"
  api_key_env: "ANTHROPIC_API_KEY"   # read from env
  spend_tier: "standard"             # economy, standard, premium

# Output
output:
  html_theme: "light"                # light, dark, auto
  include_skills: true
  include_salary: true
```

---

## CLI Interface

```bash
# Setup (one-time)
npx career-ops setup

# Scan portals
career-ops scan                      # Scan all configured companies
career-ops scan --company Stripe     # Scan single company
career-ops scan --dry-run            # Preview without saving

# Generate dashboard
career-ops dashboard                 # HTML output to output_dir
career-ops dashboard --output ./jobs.html

# Pipeline management
career-ops pipeline                  # Evaluate pending items in pipeline.md
career-ops pipeline add "https://jobs.lever.co/..." --company "Acme" --role "Engineer"

# Tracker
career-ops tracker list              # List all tracked jobs
career-ops tracker status 123 applied --note "Applied via referral"

# AI Evaluation
career-ops evaluate "https://jobs.lever.co/..."  # Score + report
career-ops tailor "https://jobs.lever.co/..."    # Generate tailored CV

# Config
career-ops config show               # Show effective config
career-ops config edit               # Open $EDITOR

# Maintenance
career-ops dedup                     # Find/merge duplicates
career-ops cleanup --older-than 90d  # Archive old entries
```

---

## AI Agent Integration (Separate Package)

Instead of 20+ hidden directories in core repo:

```
career-ops-agent/                    # Separate npm package
├── package.json
├── src/
│   ├── skill.ts                     # Agent skill definition
│   ├── commands/                    # Agent-specific commands
│   └── context/                     # Context providers for AI
└── templates/                       # Agent prompt templates
```

Users install: `npm install -g career-ops career-ops-agent`

---

## Migration Path

1. **Create new `career-ops-v2` branch** with TypeScript structure
2. **Migrate core logic**: scanner, providers, filters, database
3. **Write migration script**: TSV/MD → SQLite
4. **Parallel run**: Old and new CLI coexist during transition
5. **Deprecate**: Old `.mjs` scripts behind `legacy:` namespace
6. **Release v2.0.0** with breaking changes documented

---

## Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Vitest | 90%+ (filters, providers, utils) |
| Integration | Vitest + testcontainers | Scan flow, DB operations |
| E2E | Playwright (headless) | CLI commands, web dashboard |
| Contract | Pact or custom | Provider API responses |

---

## Maintenance Benefits

| Metric | Current | Proposed |
|--------|---------|----------|
| Root files | 200+ | < 10 |
| Provider files | 160+ | ~20 |
| Hidden dirs | 20+ | 0 (in core) |
| Config files | 10+ formats | 1 YAML + schema |
| State files | TSV/MD (fragile) | SQLite (ACID) |
| CI workflows | 20+ | 3 |
| Languages | JS + Python + Go | TypeScript only |
| Onboarding time | 30 min | < 5 min |

---

## Next Steps

1. **Approve this design** → Create implementation plan with milestones
2. **Setup TypeScript project** with vitest, eslint, prettier
3. **Implement database layer** + migrations
4. **Port core providers** (Greenhouse, Lever, Ashby, Workday, iCIMS)
5. **Build filter engine** (title, location, experience, age)
6. **Implement scanner orchestration** with concurrency control
7. **Create CLI** with commander.js
8. **Build dashboard command** (HTML output via Eta templates)
9. **Add AI evaluation** (provider-agnostic interface)
10. **Write migration script** from current format
11. **Document everything** in `/docs`
12. **Release v2.0.0**

---

*This design takes the best patterns from job-forager (simple, stdlib-first, SQLite) and job_search_tool (config-driven, local-first, web dashboard) while keeping career-ops' unique strengths: AI evaluation, CV tailoring, and multi-market support.*