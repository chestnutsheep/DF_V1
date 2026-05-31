#!/bin/bash
# 全栈 AI 环境一键启动脚本
# 路径: /home/AI/scripts/start_all.sh
# 最后更新: 2026-05-24
set -e

echo "========================================="
echo "  DeepFusion FinAgent 全栈启动"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 1. PostgreSQL
echo ""
echo "=== [1/5] PostgreSQL ==="
docker start postgres-finagent 2>/dev/null || \
docker run -d --name postgres-finagent \
  -p 5432:5432 \
  -v /home/AI/data/postgresql:/var/lib/postgresql/data \
  -e POSTGRES_DB=finagent \
  -e POSTGRES_USER=finagent \
  -e POSTGRES_PASSWORD=chd2aVA8FFjjUcVS4KUEww== \
  postgres:16
echo "  OK (port 5432)"

# 2. DeepFusion 后端 (FastAPI)
echo ""
echo "=== [2/5] DeepFusion Backend ==="
VENV=/home/AI/workspace/Mcp\ Server/backend/venv
if [ -f "$VENV/bin/uvicorn" ]; then
  # 先停旧进程
  pkill -f "uvicorn main:app.*8000" 2>/dev/null || true
  sleep 1
  nohup "$VENV/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 --reload \
    > /home/AI/data/deepfusion-api.log 2>&1 &
  echo "  OK (http://localhost:8000/docs)"
else
  echo "  venv 未就绪，尝试系统 Python"
  cd /home/AI/workspace/Mcp\ Server/backend
  nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload \
    > /home/AI/data/deepfusion-api.log 2>&1 &
  echo "  OK (http://localhost:8000/docs)"
fi

# 3. DeepFusion 前端 (Vite)
echo ""
echo "=== [3/5] DeepFusion Frontend ==="
cd /home/AI/workspace/Mcp\ Server/frontend
if [ -f node_modules/.package-lock.json ]; then
  nohup npx vite --host 0.0.0.0 --port 5174 \
    > /home/AI/data/deepfusion-frontend.log 2>&1 &
  echo "  OK (http://localhost:5174)"
else
  echo "  node_modules 未就绪，运行 npm install"
  npm install
  nohup npx vite --host 0.0.0.0 --port 5174 \
    > /home/AI/data/deepfusion-frontend.log 2>&1 &
  echo "  OK (http://localhost:5174)"
fi

# 4. Goose ACP server (background)
echo ""
echo "=== [4/5] Goose ACP ==="
if command -v goose &> /dev/null; then
  nohup goose serve --host 127.0.0.1 --port 3284 > /home/AI/data/goose-server.log 2>&1 &
  echo "  OK (127.0.0.1:3284)"
else
  echo "  (goose 未安装, 跳过)"
fi

# 5. Hermes dashboard (background)
echo ""
echo "=== [5/5] Hermes Dashboard ==="
if command -v hermes &> /dev/null; then
  nohup hermes dashboard > /home/AI/data/hermes-dashboard.log 2>&1 &
  echo "  OK (http://localhost:9119)"
else
  echo "  (hermes 未安装, 跳过)"
fi

echo ""
echo "========================================="
echo "  启动完成"
echo "  DeepFusion API:  http://localhost:8000/docs"
echo "  DeepFusion 前端:  http://localhost:5174"
echo "  PostgreSQL:       localhost:5432"
echo "  Goose ACP:       127.0.0.1:3284"
echo "  Hermes Dash:     http://localhost:9119"
echo "========================================="
