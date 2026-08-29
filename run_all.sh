#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH=$PATH:/opt/homebrew/bin

echo "=========================================="
echo " Starting Aman Copilot Local & Mobile Tunnels"
echo "=========================================="

# 0. Clean up stale server processes on ports 8766 and 43123
lsof -ti:8766 | xargs kill -9 2>/dev/null || true
lsof -ti:43123 | xargs kill -9 2>/dev/null || true

# 1. Start Backend FastAPI
echo "--> Starting Backend FastAPI server on port 8766..."
cd "$ROOT/backend"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -q -r requirements.txt
else
  source .venv/bin/activate
fi
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8766 &
BACKEND_PID=$!

# 2. Start Frontend Vite Dev Server
echo "--> Starting Frontend Vite server on port 43123..."
cd "$ROOT/frontend"
npm run dev -- --host 0.0.0.0 --port 43123 &
FRONTEND_PID=$!

# 3. Start Public Tunnel for Mobile 5G/LTE Access
echo "--> Starting Public Tunnel for 5G/LTE Phone Access..."
npx --yes localtunnel --port 43123 --subdomain aman-copilot-yangon &
TUNNEL_PID=$!

echo ""
echo "========================================================"
echo " 🚀 Aman Copilot is RUNNING!"
echo "========================================================"
echo " 💻 Local Mac URL:      http://localhost:43123"
echo " 📶 Same Wi-Fi Phone:   http://192.168.181.132:43123"
echo " 📱 Mobile 5G/LTE URL:  https://aman-copilot-yangon.loca.lt"
echo "========================================================"
echo " Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID $TUNNEL_PID 2>/dev/null || true" EXIT
wait
