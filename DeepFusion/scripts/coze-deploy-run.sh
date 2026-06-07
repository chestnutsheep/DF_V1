#!/bin/bash
# Deploy run script for Deep Fusion (生产模式)

# 启动后端（端口 5173）
cd /workspace/projects/DeepFusion
source .venv/bin/activate
python serve.py &
BACKEND_PID=$!

# 启动前端预览（构建产物）
cd /workspace/projects/DeepFusion/dashboard
pnpm preview --port 5000 &
FRONTEND_PID=$!

# 等待进程
wait
