#!/usr/bin/env bash
# Pull latest code, rebuild the frontend, and restart the app.
# Usage (from repo root):  bash scripts/update.sh
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing deps + rebuilding"
npm run install:all
npm run build

echo "==> Restarting app"
pm2 restart business-platform --update-env
pm2 save
echo "==> Updated."
