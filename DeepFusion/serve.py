"""Quick serve script for the dashboard."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Akshare/东方财富数据源通过 proxy:7897
os.environ.setdefault('HTTP_PROXY', 'http://127.0.0.1:7897')
os.environ.setdefault('HTTPS_PROXY', 'http://127.0.0.1:7897')

# 必须先导入全模块，触发 @mcp.tool 装饰器注册所有工具
import deep_fusion

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse
from starlette.routing import Route

from deep_fusion.server import mcp

async def call_tool(request: Request) -> JSONResponse:
    body = await request.json()
    try:
        result = await mcp.call_tool(body['name'], body.get('arguments', {}))
        text = ''.join(c.text for c in result.content if hasattr(c, 'text') and c.text)
        return JSONResponse({'ok': True, 'data': text})
    except Exception as e:
        return JSONResponse({'ok': False, 'error': str(e)}, status_code=500)

async def list_tools(request: Request) -> JSONResponse:
    tools = await mcp.list_tools()
    return JSONResponse({'ok': True, 'tools': [t.name for t in tools]})

app = Starlette(routes=[
    Route('/api/tools/call', call_tool, methods=['POST']),
    Route('/api/tools/list', list_tools, methods=['GET']),
], middleware=[
    Middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*']),
])

import uvicorn
print(f'  ⟡ Deep Fusion API → http://localhost:5173/api')
uvicorn.run(app, host='0.0.0.0', port=5173, log_level='warning')
