# Career-Ops v2: Unified Local-First Job Search Platform for India

## Vision
A **single, clean, local-first CLI tool** that discovers real job openings from the ATS platforms Indian recruiters actually use — not Naukri/Indeed — and presents them in a clean, actionable dashboard. No web app, no cloud, no data leaves your machine.

---

## Target ATS Platforms for India

| Platform | Type | Companies Using It | Priority |
|----------|------|-------------------|----------|
| **Darwinbox** | HRMS/ATS | Tata, Mahindra, Aditya Birla, Godrej, 800+ | 🔴 Critical |
| **Keka** | HR/ATS | 10,000+ SMEs, startups | 🔴 Critical |
| **Zoho Recruit** | ATS | Zoho ecosystem, 50,000+ orgs | 🔴 Critical |
| **Freshteam** | ATS | Freshworks portfolio, 5,000+ | 🔴 Critical |
| **Greenhouse** | ATS | MNCs, tech companies | 🟡 High |
| **Lever** | ATS | Tech companies, startups | 🟡 High |
| **Workday** | ATS | Large enterprises | 🟡 High |
| **iCIMS** | ATS | Enterprise | 🟢 Medium |
| **BambooHR** | ATS | SMEs | 🟢 Medium |
| **Jobvite** | ATS | Enterprise | 🟢 Medium |
| **SuccessFactors** | ATS | SAP ecosystem | 🟢 Medium |
| **Oracle Taleo** | ATS | Enterprise | 🟢 Medium |
| **ADP** | ATS | Enterprise payroll | 🟢 Medium |
| **PeopleStrong** | HRMS | Indian enterprises | 🔴 Critical |
| **SumHR** | HRMS | Indian SMEs | 🟡 High |

**Key Insight**: Most Indian job seekers only know Naukri/Indeed/LinkedIn. Recruiters post on **Darwinbox, Keka, Zoho, Freshteam** — these have public career pages with JSON APIs that nobody scrapes.

---

## Requirements (MoSCoW)

### Must Have
- [ ] Scan 15+ Indian ATS platforms + global majors
- [ ] Clean HTML dashboard: Company | Role | Experience | Skills | Posted | Applicants | URL
- [ ] Local SQLite storage (no cloud, no accounts)
- [ ] YAML config for companies/filters
- [ ] Title/Location/Experience/Age filters
- [ ] Deduplication (canonical URL + fingerprint)
- [ ] Pipeline file for manual entries
- [ ] Single binary/NPX install
- [ ] Cross-platform (Windows/macOS/Linux)

### Should Have
- [ ] Frequency detection (reposted roles)
- [ ] Company health scoring (response rate, ghost rate)
- [ ] Export CSV/JSON for spreadsheet workflows
- [ ] Scheduled scans via OS scheduler (cron/Task Scheduler)
- [ ] Config validation with helpful errors

### Could Have
- [ ] Simple TUI (terminal UI) for interactive browsing
- [ ] Salary estimation from market data
- [ ] Skill gap analysis from JD keywords

### Won't Have (v2)
- ❌ Web server / dashboard server
- ❌ User accounts / cloud sync
- ❌ Interview prep / offer negotiation
- ❌ CV generation / tailoring
- ❌ AI evaluation (can add later as plugin)
- ❌ Multi-language modes
- ❌ Application tracking (just discovery)

---

## Architecture

```
career-ops/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── .gitignore
├── 
├── src/
│   ├── main.ts                    # CLI entry (commander)
│   ├── core/
│   │   ├── config.ts              # YAML + env + validation (Zod)
│   │   ├── database.ts            # SQLite (better-sqlite3)
│   │   ├── scanner.ts             # Orchestrator
│   │   ├── models.ts              # Types
│   │   └── utils.ts
│   │
│   ├── providers/
│   │   ├── index.ts               # Auto-load & registry
│   │   ├── base.ts                # BaseProvider abstract
│   │   ├── registry.ts
│   │   ├── http.ts                # Shared HTTP + cache + rate-limit
│   │   │
│   │   ├── darwinbox.ts           # 🔴 India critical
│   │   ├── keka.ts                # 🔴 India critical
│   │   ├── zoho.ts                # 🔴 India critical
│   │   ├── freshteam.ts           # 🔴 India critical
│   │   ├── peoplestrong.ts        # 🔴 India critical
│   │   ├── sumhr.ts               # 🟡 India high
│   │   ├── greenhouse.ts
│   │   ├── lever.ts
│   │   ├── workday.ts
│   │   ├── icims.ts
│   │   ├── bamboo.ts
│   │   ├── jobvite.ts
│   │   ├── successfactors.ts
│   │   ├── oracle.ts
│   │   ├── adp.ts
│   │   └── generic.ts             # RSS/HTML fallback
│   │
│   ├── filters/
│   │   ├── title.ts
│   │   ├── location.ts
│   │   ├── experience.ts
│   │   └── age.ts
│   │
│   ├── commands/
│   │   ├── scan.ts
│   │   ├── dashboard.ts
│   │   ├── pipeline.ts
│   │   ├── companies.ts
│   │   └── config.ts
│   │
│   └── output/
│       ├── html.ts                # Dashboard generator (Eta)
│       ├── csv.ts
│       └── json.ts
│
├── config/
│   ├── default.yml                # Built-in Indian ATS configs
│   ├── user.yml.example
│   └── schema.ts
│
├── data/                          # Git-ignored, runtime
│   ├── jobs.db
│   ├── pipeline.md
│   └── cache/
│
├── tests/
│   ├── unit/
│   │   ├── filters.test.ts
│   │   ├── providers.test.ts
│   │   ├── database.test.ts
│   │   └── scanner.test.ts
│   ├── integration/
│   │   └── scan.test.ts
│   ├── fixtures/
│   └── e2e/
│       └── cli.test.ts
│
├── scripts/
│   ├── setup.ts                   # One-shot setup
│   ├── install-scheduler.ts       # OS scheduler integration
│   └── migrate.ts                 # v1 → v2 migration
│
├── .github/workflows/
│   ├── ci.yml                     # Lint, typecheck, test
│   ├── release.yml
│   └── scheduled-test.yml         # Weekly provider health check
│
└── docs/
    ├── CONFIGURATION.md
    ├── PROVIDERS.md
    ├── SCHEDULING.md
    └── EXAMPLES.md
```

---

## Dependencies (Minimal, Audited)

### Production
```json
{
  "commander": "^12.0.0",          // CLI framework
  "js-yaml": "^4.1.0",             // Config parsing
  "better-sqlite3": "^9.4.0",      // Local DB
  "undici": "^6.0.0",              // HTTP client (stdlib-like)
  "zod": "^3.22.0",                // Config validation
  "eta": "^3.0.0",                 // Tiny template engine
  "date-fns": "^3.0.0",            // Date handling
  "chalk": "^5.3.0",               // Terminal colors
  "ora": "^8.0.0"                  // Spinners
}
```

### Development
```json
{
  "typescript": "^5.4.0",
  "vitest": "^1.0.0",
  "@types/node": "^20.0.0",
  "@types/better-sqlite3": "^7.6.0",
  "@types/js-yaml": "^4.0.0",
  "eslint": "^8.50.0",
  "@typescript-eslint/eslint-plugin": "^7.0.0",
  "prettier": "^3.0.0",
  "playwright": "^1.42.0"          // E2E only
}
```

**Total production deps: 8** (vs 117 currently)

---

## Testing Strategy

### Standards (borrowing from C/MISRA → TypeScript)
| C Standard | TypeScript Equivalent |
|------------|----------------------|
| MISRA C | ESLint + TypeScript strict + `@typescript-eslint` |
| gtest | **Vitest** (native ESM, fast, parallel) |
| Static analysis | `tsc --noEmit`, `eslint`, `prettier` |
| Memory leaks | `--expose-gc` + heap snapshots in CI |
| Coverage | `vitest --coverage` (v8 provider) |

### Test Pyramid
```
        ┌─────────────┐
        │   E2E (5%)  │  Playwright: CLI commands, full scan flow
        ├─────────────┤
        │ Integration │  Vitest: DB ops, scanner orchestration, provider mocking
        ├─────────────┤
        │  Unit (85%) │  Vitest: Filters, providers, utils, models (pure functions)
        └─────────────┘
```

### Unit Test Targets (Pure Functions)
- `titleFilter()` — positive/negative/word/stem matching
- `locationFilter()` — allow/block/always_allow/US state logic
- `experienceFilter()` — years parsing, stretch logic
- `ageFilter()` — posting date parsing, max_age
- `canonicalUrl()` — dedup key normalization
- `fingerprint()` — cross-listing detection
- Provider `detect()` and `fetch()` with mocked HTTP

### Integration Test Targets
- Database CRUD + indexes + migrations
- Scanner: fetch → filter → dedup → store
- Config loading: YAML + env + defaults + validation
- HTML/CSV/JSON output generation

### E2E Test Targets
- `career-ops scan --dry-run`
- `career-ops dashboard --output test.html`
- `career-ops pipeline add ...`
- `career-ops companies list`
- Scheduled scan via mock cron

### CI Pipeline
```yaml
# .github/workflows/ci.yml
jobs:
  lint:        # eslint, prettier, tsc --noEmit
  typecheck:   # strict TypeScript
  unit:        # vitest run --coverage (threshold: 80%)
  integration: # vitest run --integration
  e2e:         # playwright test
  security:    # npm audit, dependency review
```

---

## Cleanup Phase (Do First)

### 1. Remove from Repository
```
# Hidden agent directories (20+)
.claude/, .opencode/, .codex-plugin/, .cursor-plugin/, .grok/, .kimi/, .qwen/, .antigravitycli/, .omp/, .agents/

# Agent skill files
.antigravitycli/skills/, .claude/skills/, .codex-plugin/, .cursor-plugin/, .grok/skills/, .kimi/skills/, .opencode/skills/, .qwen/skills/

# Web app
web/, dashboard/, fonts/, examples/

# Language modes (19 dirs)
modes/ar/, modes/de/, modes/es/, modes/fr/, modes/hi/, modes/ja/, modes/ko/, modes/pt/, modes/ru/, modes/zh/, modes/zh-TW/, modes/tr/, modes/vi/, modes/id/, modes/pl/, modes/nl/, modes/da/, modes/nb/, modes/ua/

# Batch processing
batch/, batch-*.mjs

# AI/ML evaluation
*eval*.mjs, *tailor*.mjs, *openai*.mjs, *gemini*.mjs, *ollama*.mjs, *anthropic*.mjs, negotiation-*.mjs, calibrate.mjs, upskill.mjs, analyze-patterns.mjs

# CV/PDF generation
generate-pdf.mjs, generate-latex.mjs, build-cv-*.mjs, cv-*.mjs, verify-cv-*.mjs, verify-ats.mjs

# Interview/Application
interview-*.mjs, application-*.mjs, apply-*.mjs, prepare-application.mjs, outcome.mjs, hired-*.mjs

# Tracker (complex)
tracker*.mjs, merge-tracker.mjs, dedup-tracker.mjs, normalize-statuses.mjs, fix-report-links.mjs, tracker-*.mjs, funnel-*.mjs, company-history.mjs, process-quality.mjs, rejection-latency.mjs

# Multi-language docs
README.*.md (keep only README.md)

# Provider long tail (keep only 15 core)
# Remove 145 provider files, keep core 15

# CI/CD bloat
.github/workflows/ (keep only ci.yml, release.yml, scheduled-test.yml)

# Other
plugins/, plugins-registry/, scaffolder/, seeds/, test-fixtures/, evals/, documents/, writing-samples/, interview-prep/, jds/, data/, output/, reports/
```

### 2. Git History Cleanup
```bash
# Option A: Fresh repo (recommended)
git checkout --orphan v2-fresh
git add -A
git commit -m "chore: v2 fresh start - unified job search platform"
git branch -D main
git branch -m main
git push -f origin main

# Option B: Filter branch (preserves history)
git filter-branch --tree-filter 'rm -rf <paths>' HEAD
```

### 3. Data Migration Script
```typescript
// scripts/migrate.ts
// Reads: data/applications.md, data/scan-history.tsv, data/pipeline.md, jds/
// Writes: data/jobs.db (SQLite)
```

---

## Implementation Milestones

| Milestone | Deliverable | Est. Effort |
|-----------|-------------|-------------|
| **M0: Cleanup** | Fresh repo, only core files remain | 2 hrs |
| **M1: Foundation** | TS setup, SQLite schema, config loader, Zod schema | 4 hrs |
| **M2: Core Providers** | 15 providers (Darwinbox, Keka, Zoho, Freshteam, PeopleStrong, SumHR, Greenhouse, Lever, Workday, iCIMS, Bamboo, Jobvite, SuccessFactors, Oracle, ADP) | 16 hrs |
| **M3: Filter Engine** | Title, Location, Experience, Age filters + tests | 6 hrs |
| **M4: Scanner** | Orchestration, concurrency, rate-limit, dedup, DB persistence | 8 hrs |
| **M5: CLI** | scan, dashboard, pipeline, companies, config commands | 6 hrs |
| **M6: Output** | HTML (Eta), CSV, JSON generators | 4 hrs |
| **M7: Setup/Scheduler** | setup.ts, OS scheduler integration (cron/Task Scheduler) | 4 hrs |
| **M8: Tests** | Unit (85%), Integration, E2E, CI pipeline | 8 hrs |
| **M9: Docs** | CONFIGURATION, PROVIDERS, SCHEDULING, EXAMPLES | 3 hrs |
| **M10: Release** | v2.0.0, npm publish, GitHub release | 2 hrs |

**Total: ~63 hours** (can be done in 2-3 weeks part-time)

---

## Configuration Example (config/user.yml)

```yaml
data_dir: "~/.local/share/career-ops"
output_dir: "~/.local/share/career-ops/output"

scan:
  concurrency: 8
  max_age_days: 30
  experience_stretch_years: 2
  title_filter:
    positive:
      - "Senior"
      - "Lead"
      - "Principal"
      - "Staff"
      - "Engineer"
      - "Developer"
      - "Architect"
      - "Manager"
    negative:
      - "Intern"
      - "Junior"
      - "Entry"
      - "Trainee"
      - "Graduate"
      - "Fresher"
  location_filter:
    allow:
      - "Bangalore"
      - "Bengaluru"
      - "Hyderabad"
      - "Pune"
      - "Chennai"
      - "Mumbai"
      - "Delhi"
      - "Gurgaon"
      - "Noida"
      - "Remote"
    block: []
  experience_max_years: 15

companies:
  # Indian ATS platforms (auto-discovered via provider detection)
  - name: "Tata Consultancy Services"
    provider: "darwinbox"
    provider_id: "tcs"
  - name: "Infosys"
    provider: "darwinbox"
    provider_id: "infosys"
  - name: "Wipro"
    provider: "peoplestrong"
    provider_id: "wipro"
  - name: "HCL Technologies"
    provider: "workday"
    provider_id: "hcl"
  - name: "Tech Mahindra"
    provider: "darwinbox"
    provider_id: "techm"
  # Add your target companies here
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Install size | < 50 MB |
| Scan time (15 companies) | < 30 seconds |
| Memory usage | < 100 MB |
| False positive rate | < 5% |
| Provider uptime detection | > 95% |
| Test coverage | > 80% |
| Zero critical CVEs | Always |
| Cross-platform | Windows/macOS/Linux |

---

## Next Step

**Approve this plan → I'll execute M0 (Cleanup) immediately**, then proceed through milestones.

The cleanup alone will remove ~180 directories/files and reduce repo size by ~90%.