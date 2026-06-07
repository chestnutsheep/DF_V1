# Project Instructions

This file provides context for AI assistants working on this project.

## Project Type: Python

### Commands
- Install: `pip install -e .`
- Test: `pytest`
- Format: `black .`
- Lint: `ruff check .`

### Documentation
See README.md for project overview.

### Version Control
This project uses Git. See .gitignore for excluded files.

## Guidelines

- Follow existing code style and patterns
- Write tests for new functionality
- Keep changes focused and atomic
- Document public APIs

### 🔴 红线禁令：代码计算定义不可侵犯

这是一条硬性约束，违反等同于破坏项目核心逻辑：

1. **禁止在代码重组/重构中修改、删除、扭曲任何已有的计算定义**，包括但不限于：周期相位判定逻辑、信号计算公式、阶段映射规则、阈值设定、数据源配置、置信度计算。

2. **认为某段计算逻辑"过时""不合理""可简化"时**，必须先找到项目文档或 Obsidian vault 中的原始设计说明，理解原始意图后再做判断。

3. **唯一合法的删除条件**：用户明确说出 "这垃圾部分不要了快点删掉" 或等效明确指令。任何模糊描述（"优化""清理""重构"）都不构成删除计算定义的许可。

4. **新代码必须保留旧计算的输入/输出接口**，确保前后端对接不受影响。如需变更接口，必须先改消费方代码，再改提供方。

5. **周期相关的核心计算**（频谱分析、相位分类、阶段映射、置信度评分）享有最高保护优先级。任何触及这些逻辑的修改，执行前必须列出旧逻辑和新逻辑的对比差异。

## Important Notes

### 康波周期：缓存版本锁定 (2026-06-06)

当前康波计算已稳定（双线PCA + level-momentum相位判定）。Cycle cache 键名含版本号：

```python
KONDRATIEV_VER = "2"  # 算法变更时 +1 使旧缓存失效
_ck = CacheKey.init(f"cycles_data_kondratiev_{method}_v{KONDRATIEV_VER}", ...)
```

**不要直接改这个缓存键**。以后如果改 `compute_kondratiev()` 的算法逻辑，记得在 `cycles.py` 里把 `KONDRATIEV_VER` +1，否则前端会一直看到旧数据。

### 其它周期
基钦/朱格拉/库兹涅茨沿用各自的缓存策略，暂无需版本锁定。如有重大算法调整，参照康波的做法加版本号。

## 前端项目 (dashboard)

### 环境要求
- Node.js 18+
- pnpm 包管理器

### 启动命令
```bash
cd dashboard
pnpm install   # 安装依赖
pnpm dev        # 开发模式（端口 8080）
pnpm build      # 生产构建
```

### 架构说明
- 前端 Vite 开发服务器监听 8080 端口
- API 代理 `/api/*` 到后端 5173 端口
- 后端 `serve.py` 运行在端口 5173

### 注意事项
- 常量定义必须放在使用它的组件/函数之前（JavaScript `const` 不提升）
- 需要网络访问的 API（如 NBS 数据）依赖外部网络或代理
