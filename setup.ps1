# setup.ps1 — one-shot install for career-ops on a fresh Windows machine.
# Usage:  powershell -ExecutionPolicy Bypass -File setup.ps1
#
# What it does:
#   1. Clones the repo if you are not already inside it
#   2. Installs Node.js (via nvm-windows) if missing
#   3. npm install + Playwright Chromium (for PDFs and live URL checks)
#   4. Creates the user data directory with pipeline.md and portals.yml
#   5. Runs `node doctor.mjs --json --init-templates` to create the user profile
#
# Nothing is submitted or sent anywhere. Everything runs locally.

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/career-ops-hq/career-ops.git"
$TargetDir = if ($args.Count -gt 0) { $args[0] } else { "$env:USERPROFILE\career-ops" }

Write-Host "==> career-ops setup"
Write-Host "    Target directory: $TargetDir"

# --- 1. Clone if needed ----------------------------------------------------
if (-not (Test-Path "$TargetDir\.git")) {
    Write-Host "==> Cloning $RepoUrl into $TargetDir"
    git clone $RepoUrl $TargetDir
}
Set-Location $TargetDir

# --- 2. Node.js ------------------------------------------------------------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "==> Node.js not found — installing via nvm-windows"
    $NvmInstall = "$env:LOCALAPPDATA\nvm-windows\nvm-install.ps1"
    if (-not (Test-Path $NvmInstall)) {
        iex "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest https://github.com/coreydaley/nvm-windows/releases/download/v1.4.0/nvm-setup.zip -OutFile $env:TEMP\nvm.zip }"
        Expand-Archive "$env:TEMP\nvm.zip" -DestinationPath "$env:TEMP\nvm-extracted"
        & "$env:TEMP\nvm-extracted\nvm-setup.exe" /silent
    }
    . "$env:PROGRAMFILES\Nodejs\nvm.ps1"
    nvm install --lts
    nvm use --lts
} else {
    Write-Host "==> Node.js: $(node -v) found"
}

# --- 3. Dependencies -------------------------------------------------------
Write-Host "==> npm install (this downloads Playwright Chromium too, ~2 min)"
npm ci 2>$null; if ($LASTEXITCODE -ne 0) { npm install }

# --- 4. Data directory -----------------------------------------------------
$DataDir = if ($env:CAREER_OPS_DATA_DIR) { $env:CAREER_OPS_DATA_DIR } else { "$env:USERPROFILE\.career-ops-data" }
Write-Host "==> Creating data directory: $DataDir"
New-Item -ItemType Directory -Force -Path "$DataDir\data"      | Out-Null
New-Item -ItemType Directory -Force -Path "$DataDir\jds"       | Out-Null
New-Item -ItemType Directory -Force -Path "$DataDir\output"    | Out-Null

if (-not (Test-Path "$DataDir\data\pipeline.md")) {
@'
# Pipeline — Pending URLs

Paste job URLs below as `- [ ] {url}` then run `career-ops-dashboard`.

## Pending

- [ ] https://jobs.lever.co/example/role-id | Example Company | Software Engineer | San Francisco, CA
- [ ] local:jds/my-job.md | Another Company | Senior Developer | Remote | note: posting https://example.com/job

## Processed
'@ | Set-Content -Path "$DataDir\data\pipeline.md" -Encoding UTF8
    Write-Host "    created pipeline.md"
} else {
    Write-Host "    pipeline.md already exists"
}

if (-not (Test-Path "$DataDir\portals.yml")) {
@'
# career-ops portals configuration
# Full template: templates/portals.example.yml

job_boards:
  - name: "Greenhouse Companies"
    provider: "greenhouse"
    tenants: ["stripe", "airbnb", "coinbase", "databricks"]

  - name: "Lever Companies"
    provider: "lever"
    tenants: ["netflix", "shopify", "figma", "notion"]

  - name: "Ashby Companies"
    provider: "ashby"
    tenants: ["vercel", "linear", "railway"]

title_filter:
  positive:
    - "Senior"
    - "Lead"
    - "Staff"
    - "Principal"
    - "Engineer"
    - "Developer"
    - "Backend"
    - "Full Stack"
  negative:
    - "Intern"
    - "Junior"
    - "Entry"
    - "Student"
    - "Trainee"
    - "Graduate"

location_filter:
  allow:
    - "United States"
    - "Remote"
'@ | Set-Content -Path "$DataDir\portals.yml" -Encoding UTF8
    Write-Host "    created portals.yml"
} else {
    Write-Host "    portals.yml already exists"
}

# Persist the data root for future sessions
[Environment]::SetEnvironmentVariable("CAREER_OPS_DATA_DIR", $DataDir, "User")
$env:CAREER_OPS_DATA_DIR = $DataDir
Write-Host "    set CAREER_OPS_DATA_DIR=$DataDir (User scope)"

# --- 5. Onboarding ---------------------------------------------------------
Write-Host "==> Creating user profile (cv.md, profile.yml, modes/_profile.md)"
node doctor.mjs --json --init-templates

Write-Host ""
Write-Host "✅ Setup complete."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Edit the generated files to add your own details:"
Write-Host "       $TargetDir\cv.md"
Write-Host "       $TargetDir\config\profile.yml"
Write-Host "       $TargetDir\modes\_profile.md"
Write-Host "  2. Add job URLs you want to track:"
Write-Host "       $DataDir\data\pipeline.md"
Write-Host "  3. Customize which companies to scan:"
Write-Host "       $DataDir\portals.yml"
Write-Host "  4. Run a health check:"
Write-Host "       cd $TargetDir; node doctor.mjs"
Write-Host "  5. Generate the dashboard:"
Write-Host "       cd $TargetDir; node scan-concise.mjs"
Write-Host "     Then open: $DataDir\output\jobs-<today>.html"
Write-Host "  6. Or use the AI agent:"
Write-Host "       /career-ops scan   (inside Claude Code / Codex / etc.)"
