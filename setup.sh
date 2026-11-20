#!/usr/bin/env bash
# setup.sh — one-shot install for career-ops on a fresh machine.
# Usage:   curl -fsSL https://raw.githubusercontent.com/career-ops-hq/career-ops/main/setup.sh | bash
#          OR   ./setup.sh
#
# What it does:
#   1. Clones the repo if you are not already inside it
#   2. Installs Node.js (via nvm) if missing
#   3. npm install + Playwright Chromium (for PDFs and live URL checks)
#   4. Runs `node doctor.mjs --json --init-templates` to create the user profile
#
# Nothing is submitted or sent anywhere. Everything runs locally.

set -euo pipefail

REPO_URL="https://github.com/career-ops-hq/career-ops.git"
TARGET_DIR="${1:-$HOME/career-ops}"

echo "==> career-ops setup"
echo "    Target directory: $TARGET_DIR"

# --- 1. Clone if needed ----------------------------------------------------
if [ ! -d "$TARGET_DIR/.git" ]; then
  echo "==> Cloning $REPO_URL into $TARGET_DIR"
  git clone "$REPO_URL" "$TARGET_DIR"
fi
cd "$TARGET_DIR"

# --- 2. Node.js ------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "==> Node.js not found — installing via nvm"
  export NVM_DIR="$HOME/.nvm"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
else
  echo "==> Node.js: $(node -v) found"
fi

# --- 3. Dependencies -------------------------------------------------------
echo "==> npm install (this downloads Playwright Chromium too, ~2 min)"
npm ci 2>/dev/null || npm install

# --- 4. Onboarding ---------------------------------------------------------
echo "==> Creating user profile (cv.md, profile.yml, modes/_profile.md)"
node doctor.mjs --json --init-templates

echo ""
echo "✅ Setup complete."
echo ""
echo "Next steps:"
echo "  1. Edit the generated files to add your own details:"
echo "       $TARGET_DIR/cv.md"
echo "       $TARGET_DIR/config/profile.yml"
echo "       $TARGET_DIR/modes/_profile.md"
echo "  2. Run a health check:"
echo "       cd $TARGET_DIR && node doctor.mjs"
echo "  3. Scan job portals:"
echo "       cd $TARGET_DIR && node scan.mjs"
echo "  4. Evaluate a job URL:"
echo "       cd $TARGET_DIR && node auto-pipeline.mjs <url>"