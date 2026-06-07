#!/bin/bash
# Preview run script for Deep Fusion (前后端双服务)

# 启动后端（端口 5173）
cd /workspace/projects/DeepFusion
source .venv/bin/activate
python serve.py &
BACKEND_PID=$!

# 启动前端（端口 8080）
cd /workspace/projects/DeepFusion/dashboard
pnpm dev &
FRONTEND_PID=$!

# 等待进程
wait
