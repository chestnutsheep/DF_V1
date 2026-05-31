#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/../frontend"

echo "=== Starting DeepFusion MCP HTTP Server (port 8000) ==="
cd "$PROJECT_DIR"
.venv/bin/python -m deep_fusion --http --port 8000 &
DEEP_PID=$!
echo "DeepFusion PID: $DEEP_PID"

echo "=== Starting Frontend (port 5174) ==="
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo "=== DeepFusion ready: http://localhost:8000/mcp ==="
echo "=== Frontend ready:   http://localhost:5174   ==="
echo "Press Ctrl+C to stop all services."

trap "kill $DEEP_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
