# Career-Ops v2

**Unified local-first job search platform for India** — scans company ATS platforms directly, filters by your skills/experience, generates a clean HTML dashboard.

> **No aggregators. No cloud. No tracking.** Runs 100% on your machine.

---

## Quick Start

```bash
# 1. Install (Node.js 20+ required)
npx career-ops setup

# 2. Parse your resume to auto-configure skills
npx career-ops resume parse resume.txt

# 3. Scan job markets
npx career-ops scan

# 4. View dashboard
npx career-ops dashboard
```

---

## Requirements

| Requirement | Version |
|-------------|---------|
| **Node.js** | 20.0.0 or higher |
| **OS** | Windows 10+, macOS 12+, Linux (glibc 2.28+) |
| **RAM** | 512 MB minimum |
| **Disk** | 100 MB for data + cache |

> **No Python, no Docker, no native modules.** Pure JavaScript.

---

## Installation

### Option 1: NPX (recommended — always latest)
```bash
npx career-ops setup
npx career-ops scan
npx career-ops dashboard
```

### Option 2: Global install
```bash
npm install -g career-ops
career-ops setup
career-ops scan
career-ops dashboard
```

### Option 3: Clone & run (for contributors)
```bash
git clone https://github.com/Franky45/job-search.git
cd job-search
npm install
node career-ops.mjs setup
node career-ops.mjs scan
node career-ops.mjs dashboard
```

---

## Platform-Specific Instructions

### Windows (PowerShell)
```powershell
# Run setup script
.\setup.ps1

# Or manual
npx career-ops setup
npx career-ops resume parse resume.txt
npx career-ops scan
npx career-ops dashboard
```
> If scripts are blocked: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### macOS / Linux (Bash/Zsh)
```bash
# Run setup script
./setup.sh

# Or manual
npx career-ops setup
npx career-ops resume parse resume.txt
npx career-ops scan
npx career-ops dashboard
```
> Make executable: `chmod +x setup.sh`

---

## Configuration

After `setup`, edit your config:
```bash
# Location
~/.config/career-ops/user.yml

# Windows: %USERPROFILE%\.config\career-ops\user.yml
```

### Key settings
```yaml
scan:
  max_age_days: 14           # Only show jobs posted within 14 days
  experience_filter:
    min: 0                   # Fresher-friendly: 0 years
    max: 15                  # Up to 15 years
resume:
  primary_skills:            # Set via: career-ops resume parse resume.txt
    - java
    - typescript
  require_primary_match: true
  min_match_score: 25
companies:
  - name: "Tata Consultancy Services"
    provider: "darwinbox"
    provider_id: "tcs"
```

---

## Usage

### 1. Parse Resume (one-time)
```bash
# Creates skills from your resume
npx career-ops resume parse resume.txt

# Or manually set skills
npx career-ops resume skills "Java, Spring Boot, React, AWS"
```

### 2. Scan for Jobs
```bash
npx career-ops scan              # Scan all configured companies
npx career-ops scan --dry-run    # Preview without saving
```

### 3. Generate Dashboard
```bash
npx career-ops dashboard                    # Default output
npx career-ops dashboard --output jobs.html # Custom path
```

### 4. Manage Companies
```bash
npx career-ops companies list
npx career-ops companies add "New Company" --provider darwinbox --provider-id newco
npx career-ops companies disable "Company Name"
```

### 5. Pipeline (Manual Entries)
```bash
npx career-ops pipeline add "https://jobs.lever.co/..." --company "Acme" --title "Engineer"
npx career-ops pipeline list
```

---

## How It Works

| Step | Description |
|------|-------------|
| **1. Sources** | Hits 15 ATS APIs directly (Darwinbox, Greenhouse, Lever, Workday, Keka, Zoho, Freshteam, PeopleStrong, SumHR, iCIMS, BambooHR, Jobvite, SuccessFactors, Oracle, ADP) |
| **2. Filter** | Title keywords, location, experience (0-15 yrs), posting age (14 days) |
| **3. Skill Match** | Requires ≥1 primary skill match + minimum 25% skill overlap |
| **4. Dedupe** | Canonical URL + content fingerprinting |
| **5. Output** | HTML dashboard with match scores, highlighted skills, direct links |

---

## Supported ATS Platforms

| Platform | Type | Companies |
|----------|------|-----------|
| **Darwinbox** | HRMS/ATS | TCS, Infosys, TechM, Mahindra, Aditya Birla |
| **Keka** | HR/ATS | 10,000+ Indian SMEs |
| **Zoho Recruit** | ATS | Zoho ecosystem, 50k+ orgs |
| **Freshteam** | ATS | Freshworks portfolio |
| **PeopleStrong** | HRMS | Large Indian enterprises |
| **SumHR** | HRMS | Indian SMEs |
| **Greenhouse** | ATS | Global tech companies |
| **Lever** | ATS | Tech startups |
| **Workday** | ATS | Large enterprises |
| **iCIMS / BambooHR / Jobvite / SuccessFactors / Oracle / ADP** | ATS | Global enterprises |

> **No Naukri, LinkedIn, Indeed, Glassdoor.** These are aggregators with anti-scraping. This tool hits the **primary source** — the ATS where companies actually post.

---

## Output

**HTML Dashboard** (`~/.local/share/career-ops/output/jobs-YYYY-MM-DD.html`):

| Column | Description |
|--------|-------------|
| Company | Employer name |
| Position | Job title |
| Exp | Required experience (parsed from JD) |
| Matched Skills | Your skills found in JD (primary skills highlighted) |
| Match | 100% → 25% color-coded score |
| Posted | Posting date |
| Source | Direct link to job posting |

---

## File Structure

```
job-search/
├── career-ops.mjs        # Main CLI (single file)
├── package.json          # npm config
├── setup.sh              # Unix setup
├── setup.ps1             # Windows setup
├── scan-concise.mjs      # Legacy dashboard
├── providers/            # 15 ATS providers
└── README.md
```

**Data (gitignored):**
```
~/.local/share/career-ops/
├── jobs.json              # Scanned jobs + match scores
├── config.yml             # User config (synced from ~/.config)
├── output/                # HTML dashboards
└── cache/                 # HTTP cache
```

---

## Release

**Current:** `v2.0.0` — Complete rewrite, single-file, zero-build

```bash
# View version
npx career-ops --version

# Check for updates
npm outdated career-ops
```

---

## License

MIT — Free for personal and commercial use.

---

## Contributing

Issues and PRs welcome. This is a personal project — keep it simple.

```bash
# Run tests
npm test

# Lint
npm run lint
```