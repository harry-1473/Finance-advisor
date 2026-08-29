#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH=$PATH:/opt/homebrew/bin

echo "=========================================="
echo " Starting Aman Copilot Local & Mobile Tunnels"
echo "=========================================="

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

# 3. Start Cloudflare Tunnel for Mobile Access
echo "--> Starting Public Cloudflare Tunnel for Phone Access..."
cloudflared tunnel --url http://localhost:43123 &
TUNNEL_PID=$!

echo ""
echo "========================================================"
echo " 🚀 Aman Copilot is RUNNING!"
echo "========================================================"
echo " 💻 Local Mac URL:      http://localhost:43123"
echo " 📱 Same Wi-Fi Phone:   http://192.168.181.132:43123"
echo " 🌍 Mobile 5G/LTE URL:  Check cloudflared output above"
echo "========================================================"
echo " Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID $TUNNEL_PID 2>/dev/null || true" EXIT
wait
