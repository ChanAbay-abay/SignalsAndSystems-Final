#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Backend ────────────────────────────────────────────────────────────────
echo "Setting up Python virtual environment..."
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

echo "Starting Flask backend on http://localhost:5001 ..."
python run.py &
BACKEND_PID=$!

# ── Frontend ───────────────────────────────────────────────────────────────
echo "Starting Vite frontend on http://localhost:3000 ..."
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  npm install
fi

npm run dev &
FRONTEND_PID=$!

# ── Open browser after a short delay ──────────────────────────────────────
sleep 3
if command -v open &>/dev/null; then
  open http://localhost:3000
elif command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:3000
fi

echo ""
echo "  Frontend → http://localhost:3000"
echo "  Backend  → http://localhost:5001"
echo "  Press Ctrl+C to stop both servers."
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
