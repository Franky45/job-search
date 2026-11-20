# setup.ps1 — one-shot install for career-ops on a fresh Windows machine.
# Usage:  powershell -ExecutionPolicy Bypass -File setup.ps1
#
# What it does:
#   1. Clones the repo if you are not already inside it
#   2. Installs Node.js (via winget or nvm) if missing
#   3. npm install + Playwright Chromium (for PDFs and live URL checks)
#   4. Runs `node doctor.mjs --json --init-templates` to create the user profile
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
npm ci 2>/dev/null || npm install

# --- 4. Onboarding ---------------------------------------------------------
Write-Host "==> Creating user profile (cv.md, profile.yml, modes/_profile.md)"
node doctor.mjs --json --init-templates

Write-Host ""
Write-Host "✅ Setup complete."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Edit the generated files to add your own details:"
Write-Host "       $TargetDir\cv.md"
Write-Host "       $TargetDir\config\profile.yml"
Write-Host "       $TargetDir\_profile.md"
Write-Host "  2. Run a health check:"
Write-Host "       cd $TargetDir; node doctor.mjs"
Write-Host "  3. Scan job portals:"
Write-Host "       cd $TargetDir; node scan.mjs"
Write-Host "  4. Evaluate a job URL:"
Write-Host "       cd $TargetDir; node auto-pipeline.mjs <url>"