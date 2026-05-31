# Deep Fusion 环境配置实施计划

## 阶段 1：环境变量基础设施 (P0)

### 1.1 创建 `.env.example`
创建 `G:\PycharmProjects\DeepFusion\.env.example`，包含全部配置变量说明。

### 1.2 `pyproject.toml` 添加 `python-dotenv`
在 `[project.dependencies]` 中添加 `"python-dotenv>=1.0.0"`。

### 1.3 `__init__.py` 启动时加载 `.env`
在 `sys.stdout` 重定向之后，任何 `import ak` 之前，调用 `load_dotenv()`。

### 1.4 `cache.py` 支持 `DEEP_FUSION_CACHE_DIR`
`get_cache_dir()` 优先读取 `DEEP_FUSION_CACHE_DIR` 环境变量。

### 1.5 `request.py` 添加 proxy
`safe_get`/`safe_post` 读取 `HTTP_PROXY`/`HTTPS_PROXY` 并用 `proxies` 参数传给 `session`。

## 阶段 2：代理配置全覆盖 (P1)

### 2.1 `docker-compose.yml` 添加代理
`HTTP_PROXY=http://host.docker.internal:7890` 等。

### 2.2 `server.json` 添加代理
MCP 客户端配置添加代理变量。

### 2.3 创建 `proxy_setup.md`
代理设置文档。

### 2.4 创建 `registry_add.bat`
自动检测 Clash 端口脚本。

## 阶段 3：东方财富 fallback + 容错 (P1)

### 3.1-3.8 各工具 fallback
关键 `_em` 工具添加替代数据源降级策略。

## 阶段 4：清理对齐 (P2-P3)

### 4.1-4.5 修正文档和冷却期
AGENTS.md 修正、冷却期机制恢复。
