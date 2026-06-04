#!/usr/bin/env bash
# 清除代理环境变量后启动 serve.py
for v in http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy SOCKS_PROXY socks_proxy; do
  unset "$v"
done
exec "/home/AI/workspace/Mcp Server/DeepFusion/.venv/bin/python" \
  "/home/AI/workspace/Mcp Server/DeepFusion/serve.py"
