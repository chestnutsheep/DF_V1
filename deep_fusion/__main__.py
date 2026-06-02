#!/usr/bin/env python3
"""Entry point: python -m deep_fusion [serve]"""

import os
import sys

# 清除代理环境变量 — 后端服务直连，不走 Clash
for k in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy",
          "ALL_PROXY", "all_proxy", "SOCKS_PROXY", "socks_proxy"]:
    os.environ.pop(k, None)

if len(sys.argv) > 1 and sys.argv[1] == "serve":
    import uvicorn
    from .server import mcp
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    print(f"  ⟡ Deep Fusion SSE 服务器 → http://localhost:{port}")
    mcp.run(transport="sse", port=port)
else:
    from . import main
    main()
