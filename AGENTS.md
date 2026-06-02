# Deep Fusion 合并实施记录

> 合并 mcp（aktools_mcp）和 DeepFusion（fin_analysis）两个项目。
> 参照 [tchivs/aktools-pro](https://github.com/tchivs/aktools-pro) 的 MCP 注册与缓存架构。

## 包结构

```
DeepFusion/
├── pyproject.toml
├── deep_fusion/
│   ├── __init__.py          # 入口 + main() + inspect
│   ├── __main__.py          # python -m deep_fusion
│   ├── server.py            # FastMCP 实例 (name="Deep Fusion")
│   ├── cache.py             # 双层级缓存防止东方财富黑名单Gank
│   ├── prompts.py           # 7 个 SOP 分析 prompt
│   ├── resources.py         # 14 个投研资源
│   ├── shared/
│   │   ├── __init__.py
│   │   ├── constants.py     # 环境变量、URL、User-Agent、DB_CONFIG 等常量
│   │   ├── fields.py        # 可复用的 Pydantic Field 定义
│   │   ├── indicators.py    # 技术指标计算（merge：19个指标）
│   │   ├── spectral.py      # 频谱分析（FFT/ACF/小波/EMD）— 康波周期使用
│   │   ├── normalize.py     # DataFrame → CSV 标准化输出
│   │   ├── schema.py        # 输出列名映射 schema
│   │   ├── industry_db.py   # SQLite 行业数据库辅助
│   │   ├── request.py       # HTTP session 复用 + UA 轮换 + exp backoff retry + proxy 支持
│   │   └── utils.py         # ak_cache / ak_cache_async + EM 回退
│   └── tools/
│       ├── __init__.py
│       ├── analysis.py      # 诊断/回测/图表/缓存管理（6个工具）
│       ├── crypto.py        # 加密货币（10个工具）
│       ├── cycles.py        # ★ 经济周期定位（8个工具：基钦/朱格拉/库兹涅茨/康波）
│       ├── forex.py         # 外汇汇率（2个工具）
│       ├── funds.py         # 基金数据（4个工具）
│       ├── futures.py       # 期货数据（4个工具）
│       ├── industry.py      # 行业数据（3个工具）
│       ├── macro.py         # 宏观经济（12个工具）
│       ├── market.py        # 市场整体表现（11个工具）
│       ├── portfolio.py     # 模拟持仓（3个工具）
│       ├── precious_metals.py # 贵金属数据（7个工具）
│       ├── stock_reports.py # 财务/消息/资金（7个工具）
│       └── stocks.py        # 股票基础（5个工具）
```

## 工具注册清单（共87个工具）

### stocks.py — 股票基础（5个）

| 工具 | 来源 | 聚合内容 | 指标 |
|------|------|---------|------|
| `search` | DF | 代码搜索 | 股票代码、名称 |
| `market_overview` | MCP | 各板块实时行情 | 最新价/涨跌幅/成交量/换手率（A/沪/深/京/创业板/科创板/ST/新股） |
| `individual_info` | MCP | 个股档案 | 基本信息、十大股东、管理层变动、分红、业绩快报/预告 |
| `individual_hist` | MCP | K线/分钟/分笔/盘前 | OHLCV、不同周期K线（日/周/月/1/5/15/30/60分钟）、分笔、盘前 |
| `market_prices` | DF | 统一历史价格+技术指标 | OHLCV、MACD/DIF/DEA、KDJ.K/D/J、RSI、BOLL.U/M/L |

### market.py — 市场总貌（11个）

| 工具 | 来源 | 指标 |
|------|------|------|
| `get_current_time` | DF | 系统时间、A股交易日历 |
| `stock_zt_pool_em` | DF | 涨停股列表：价格/涨幅/成交量/换手率 |
| `stock_zt_pool_strong_em` | DF | 强势股池数据 |
| `stock_lhb_ggtj_sina` | DF | 龙虎榜统计（5/10/30/60日） |
| `stock_sector_fund_flow_rank` | DF | 板块资金流排名（今日/5日/10日）、涨跌幅 |
| `northbound_funds` | DF | 北向资金近10日流向 |
| `sector_valuation` | DF | 申万一级行业PE/PB |
| `sector_rotation` | DF | 短期强势行业（资金流+涨幅） |
| `stock_news_global` | DF | 全球财经快讯 |
| `market_anomaly_scan` | DF | 异动扫描：火箭发射/快速反弹/加速下跌/高台跳水/大单等 |
| `margin_balance` | 新加 | 融资融券余额（近30期） |

### macro.py — 宏观经济（12个）

| 工具 | 来源 | 说明 | 指标 |
|------|------|------|------|
| `macro_growth` | MCP | 聚合：GDP季度/年率/工业增加值 | GDP当季值/累计同比、工业增加值同比 |
| `macro_inflation` | MCP | 聚合：CPI/PPI月度/年率 | CPI当月同比/环比、PPI当月同比/环比 |
| `macro_business` | MCP | 聚合：PMI/财新/非制造业 | 制造业PMI、财新制造业/服务业PMI、非制造业PMI |
| `macro_monetary` | MCP | 聚合：M2/社融/LPR/失业率/外汇/进出口 | M2同比、社融规模、LPR、失业率、外汇储备、进出口同比 |
| `macro_gdp` | DF | 单接口GDP | GDP当季值/累计值/同比 |
| `macro_cpi` | DF | 单接口CPI | CPI当月同比/环比 |
| `macro_pmi` | DF | 单接口PMI | 制造业PMI |
| `macro_interest_rate` | DF | 单接口LPR | 1年期LPR、5年期LPR |
| `macro_money_supply` | DF | 单接口M2 | M0/M1/M2当月值/同比 |
| `macro_industrial_value_add` | DF | 工业增加值 | 工业增加值同比增速 |
| `macro_inventory_growth` | DF | 库存增长 | 工业企业产成品库存同比 |
| `macro_fixed_investment` | DF | 固定资产投资 | 固定资产投资累计同比 |

### cycles.py — 经济周期（8个工具，★ 新增）

| 工具 | 类型 | 方法 | 核心数据源 |
|------|------|------|-----------|
| `kitchin_cycle` | 文字报告 | 工业增加值+产成品库存+PMI+M2 加权 → 4阶段判定 | akshare 直取 |
| `juglar_cycle` | 文字报告 | 固投+PPI+PMI → 复苏/繁荣/衰退/萧条 | akshare 直取 |
| `kuznets_cycle` | 文字报告 | 房地产板块价格同比+PMI → 4阶段判定 | akshare 直取 |
| `kondratiev_cycle` | 文字报告 | 人均GDP → 频谱分析(FFT/ACF/小波/EMD) → 长波定位 | akshare 直取 |
| `chart_kitchin_cycle` | 图表 | 2×2子图：需求vs库存/PMI/实际库存vsPPI/M2vs固投 | matplotlib |
| `chart_juglar_cycle` | 图表 | 2×2子图：投资指标/PPIvsPMI/固投细项 | matplotlib |
| `chart_kuznets_cycle` | 图表 | 2×1子图：房地产板块+PMI | matplotlib |
| `chart_kondratiev_cycle` | 图表 | 人均GDP历史序列+主周期标注 | matplotlib |

### industry.py — 行业数据（3个，来源：MCP）

| 工具 | 内容 | 指标 |
|------|------|------|
| `industry_classify` | 申万/证监会/东方财富行业分类 | 行业分类列表 |
| `industry_quotes` | 行业行情+历史K线+估值+财务指标 | 实时行情、PE/PB估值、财务指标（ROE/毛利率等） |
| `industry_capital_flow` | 行业资金流+涨跌排行 | 实时资金流、历史资金流、涨跌排名 |

### stock_reports.py — 财务/消息/资金（7个）

| 工具 | 来源 | 内容 | 指标 |
|------|------|------|------|
| `sentiment_side` | 新聚合 | 个股新闻+高管持股变动+股东人数+十大股东 | 新闻标题/时间、高管变动方向/数量、股东人数增减、十大股东持仓变化 |
| `capital_tracking` | MCP拆分 | 个股资金流+机构调研+机构持仓 | 资金流向（主力/散户）、机构调研时间/机构名、机构持仓明细 |
| `financial_indicators` | MCP | 86项财务指标 | 营收/净利润/毛利/净利、ROE、EPS、毛利率/净利率、资产负债率等 |
| `financial_statements` | MCP | 三大报表 | 资产负债表、利润表、现金流量表 |
| `peer_comparison` | MCP | 同业比较（四维度） | 成长性/估值/杜邦/规模比较 |
| `stock_indicators_hk` | DF | 港股财务摘要 | 港股报告期关键财务指标 |
| `stock_indicators_us` | DF | 美股财务摘要 | 美股单季报关键财务指标 |

### 其他模块（来源：DF）

| 模块 | 工具数 | 内容 | 核心指标 |
|------|--------|------|---------|
| `crypto.py` | 10 | 加密货币价格/情绪/费率/综合诊断 | OHLCV+技术指标、合约多空比/吃单量、资金费率、持仓量、恐惧贪婪指数 |
| `forex.py` | 2 | 实时汇率/历史汇率 | 8大货币对即期汇率、历史收盘价 |
| `futures.py` | 4 | 期货价格/库存/基差/持仓排名 | 主力合约OHLCV、仓单库存、期现基差、机构持仓排名 |
| `funds.py` | 4 | 基金信息/净值/持仓/排行 | 基金规模/类型、单位净值/累计净值/日增长、持仓股票、同类排名 |
| `precious_metals.py` | 7 | 贵金属现货/国际/ETF/库存/基差/综合诊断 | SGE现货OHLCV+技术指标、国际金银价、ETF持仓量、COMEX库存、基差、基准价 |
| `portfolio.py` | 3 | 模拟持仓增/查/图表 | 持仓盈亏（实时市价）、ASCII盈亏柱状图 |
| `analysis.py` | 6 | 综合诊断/图表/回测/建议/缓存管理 | 复合诊断（价格+基本面+消息）、ASCII图表、SMA/RSI/MACD/BOLL/MA_CROSS/KDJ回测、投资建议记录 |

## 缓存配置

| 数据类型 | L1 TTL（内存） | L2 TTL（磁盘） |
|---------|---------------|---------------|
| 实时行情/行业行情 | 300s | 600s |
| K线/资金流 | 3600s | 7200s |
| 个股基本资料/分红/股东 | 43200s | 86400s |
| 财务指标/行业分类 | 86400s | 172800s |
| GDP/CPI/PMI等宏观 | 604800s | 1209600s |
| 汇率 | 86400s | 172800s |

## 合并规则

1. **全集原则**：mcp有DF无的取mcp，DF有mcp无的取DF，两边都有按优先级
2. **版本取高**：fastmcp>=3.2.4, python>=3.14, pandas>=3.0.2
3. **命名统一**：deep_fusion(包名) / Deep Fusion(项目名)
4. **结构优先**：mcp的聚合结构 > DF的内容完整性（stocks/macro）
5. **import路径全部使用相对 import（`from ..server import mcp`）**

## 已修复项

| 问题 | 修复 | 文件 |
|------|------|------|
| `inspect` 崩溃（`_tool_manager._tools` 无访问） | 改调 `await mcp.list_tools()` / `list_resources()` / `list_prompts()` | `deep_fusion/__init__.py` |
| Windows 终端中文字符乱码 | 添加 `sys.stdout` UTF-8 编码重定向 | `deep_fusion/__init__.py` |
| `analysis.py` 变量名错误（`{individual_info}` 应为 `{fundamental}`） | 修正 f-string 引用 | `deep_fusion/tools/analysis.py` |
| `pyproject.toml` 缺 `starlette` | 添加到 `[project.dependencies]` | `pyproject.toml` |
| `industry_perf.db` 路径不存在 | 改用 `os.path.dirname(__file__)` 定位；创建空 db 文件 | `deep_fusion/shared/industry_db.py` |
| server.py 缺 INSTRUCTIONS | 嵌入决策树 SOP（6 场景路径引导） | `deep_fusion/server.py` |

## 已修复项（第2轮 — API 兼容性）

| 问题 | 修复 | 文件 |
|------|------|------|
| `sentiment_side` 不注册（`_prev_quarter_end` 错放在 `@mcp.tool` 下） | 恢复装饰器顺序 | `deep_fusion/tools/stock_reports.py` |
| `stock_gdfx_top_10_em` 缺 `date` 参数 | 添加 `_prev_quarter_end()` 推算 | `deep_fusion/tools/stock_reports.py` |
| `stock_performance_express_em` / `stock_performance_forecast_em` 不存在 | 删除，改由 `profit_ea` 工具提供 | `deep_fusion/tools/stocks.py` |
| `stock_institutional_research_detail_em` / `stock_institutional_holding_em` 不存在 | 替换为 `stock_jgdy_tj_em` + `stock_jgdy_detail_em`（按股票代码过滤） | `deep_fusion/tools/stock_reports.py` |
| `market.py` 硬编码 `requests` 调用 | 改用 `safe_get`/`safe_post`（UA轮换+retry） | `deep_fusion/tools/market.py` / `crypto.py` |
| `futures.py:95` 参数 `symbol=` → `vars_list=` | 改用 `vars_list` + 加 `date` 参数 | `deep_fusion/tools/futures.py` |
| `funds.py:32` `fund_open_fund_daily_em` 不接受 `symbol` | 去掉参数，用 `iloc` 过滤 | `deep_fusion/tools/funds.py` |
| `forex.py:84` `fx_pair_quote` 不接受 `symbol` | 去掉，全量返回后用列名过滤 | `deep_fusion/tools/forex.py` |
| `industry.py` 3个 `_em` 函数缺失 | 替换为 `stock_fund_flow_industry` / `stock_sector_fund_flow_rank` + `_safe_cache` 保护 | `deep_fusion/tools/industry.py` |
| `model.py` 中东方财富 `_em` 接口 `Connection aborted` | 加冷却期 `_last_em_error` 控制调用间隔 | `deep_fusion/shared/utils.py` |
| `stock_market_account_info`/`stock_financial_analysis_indicator` 等东方财富接口被封 | 利用缓存减少调用频率 | `deep_fusion/shared/utils.py` |
| `model.py` 不存在（该文件从来不在项目中） | 删除 AGENTS.md 中过时引用 | `AGENTS.md` |
| `Field("今日")` 默认值被 Pydantic v2 解析为 `FieldInfo` 对象而非字符串 | `_unpack()` 在 `ak_cache`/`ak_cache_async` 入口自动解包 | `deep_fusion/shared/utils.py` |

## 已修复项（第3轮 — 环境配置与反爬增强）

| 问题 | 修复 | 文件 |
|------|------|------|
| `.env.example` / `proxy_setup.md` / `registry_add.bat` 缺失（AGENTS.md 声称存在） | 创建上述文件 | 项目根目录 |
| `DEEP_FUSION_CACHE_DIR` 定义了但 cache.py 不读 | 添加 `os.getenv("DEEP_FUSION_CACHE_DIR")` 优先逻辑 | `deep_fusion/cache.py` |
| `request.py` 不设 proxy（尽管 AGENTS.md 声称有） | 添加 `_get_proxies()` 从 `os.environ` 读取，session.proxies 应用 | `deep_fusion/shared/request.py` |
| 无 `.env` 加载机制 | `load_dotenv()` 在 `__init__.py` 最顶部调用（在所有 import 之前） | `deep_fusion/__init__.py` |
| `_em` 接口通过代理失败后无备选路径 | 添加 `_em_fallback_retry()` 暂存 `HTTP_PROXY` → 移除 → 重试 → 恢复 | `deep_fusion/shared/utils.py` |
| `_em` 失败后无冷却期，导致重复失败日志 | 添加 `_last_em_error` 模块级变量 + `_EM_COOLDOWN=5s` 控制重试间隔 | `deep_fusion/shared/utils.py` |

## 已修复项（第7轮 — 2026-05-25 周期重构）

| 问题 | 修复 | 文件 |
|------|------|------|
| `cycles/` 目录1600+行独立脚本（不遵循 @mcp.tool 模式） | 重构为 `tools/cycles.py`，4个 `_compute_*` + 4个 `@mcp.tool` 文字报告 + 4个 `chart_@mcp.tool` | `deep_fusion/tools/cycles.py`（新建） |
| `cycles/scripts/calc_spectral.py` 孤立在 cycles 目录下 | 迁至 `shared/spectral.py`，纯数学库，注册为共享模块 | `deep_fusion/shared/spectral.py` |
| DB 密码散落在 20+ 文件（硬编码） | 集中到 `.env` → `shared/constants.py` 的 `DB_CONFIG` | `deep_fusion/shared/constants.py` |
| 3 个文件 import 路径指向已删除的 `pipelines.config` | 改为 `from deep_fusion.shared.constants import DB_CONFIG` | `backend/services/db.py`, `DeepFusion/scripts/industry_stats_pipeline.py`, `DeepFusion/scripts/concept_pipeline.py` |
| `industry_stats_pipeline.py` 重复 `import sys`（第2行和第6行） | 删除重复行 | `DeepFusion/scripts/industry_stats_pipeline.py` |
| 图表代码与计算逻辑耦合在旧脚本中 | 图表保留为 `_gen_*_chart()` 私有函数，通过 `chart_*_cycle()` 工具调用 | `deep_fusion/tools/cycles.py` |
| 4 份重复的工具函数（direction/ma/fmt/arr/norm_period/p2date） | 合并为 cycles.py 内的共享函数 | `deep_fusion/tools/cycles.py` |
| 周期工具依赖 PG 数据库 | 改为 akshare 直取（与 `macro.py` 一致） | `deep_fusion/tools/cycles.py` |

## 已补充基础设施

| 文件 | 用途 |
|------|------|
| `deep_fusion/shared/request.py` | HTTP session 复用 + UA 轮换（8种） + exp backoff retry + proxy 支持 |
| `deep_fusion/shared/spectral.py` | 频谱分析（FFT/ACF/小波/EMD）— 从 cycles 迁入 |
| `deep_fusion/tools/cycles.py` | 经济周期定位工具（8个 @mcp.tool） |
| `agents/skills/` (10个skill) | 投研 SOP 技能文件 |
| `references/` (10个文档) | 投研参考词典 |
| `.env.example` | 环境变量模板（代理/API地址/缓存目录/DB_CONFIG） |
| `registry_add.bat` | 智能检测 Clash 端口 → 自动注册到 User 环境变量 |

## 数据获取工具（2026-06-02 新增）

### 全局数据源（MCP 工具，DB-first）

| 工具 | 参数 | 数据源 | 缓存 |
|------|------|--------|------|
| `fred_data(series, limit)` | series="fred_ppiaco" 或任意 FRED series_id (GDPC1/UNRATE/...)，limit=20 | **FRED** (St. Louis Fed)，1913年至今 | `cycle_cache.db`，8h有效期 |
| `fred_list()` | 无 | — | — |
| `wb_data(indicator, country, limit)` | indicator="wb_gdp_growth" 或任意 WB code (NY.GDP.MKTP.CD/...)，country="1W" 全球，"CN"中国，"US"美国 | **World Bank**，1960年至今 | `cycle_cache.db`，8h有效期 |
| `wb_list()` | 无 | — | — |
| `cycle_collect()` | 可选 start_date | 批量拉取全部 NBS(14) + FRED(8) + WB(7) + akshare宏观(2) 共31指标 → 写入缓存 | `cycle_cache.db` |
| `cycle_cache_status()` | 无 | 查看缓存中各指标行数 | — |

### 预注册指标

| 缓存 key | 原始代码 | 说明 |
|----------|----------|------|
| **FRED (8)** | | |
| fred_ppiaco | PPIACO | 生产者价格指数(全商品), 1913~ |
| fred_gs10 | GS10 | 10年期国债收益率, 1953~ |
| fred_cpiaucns | CPIAUCNS | CPI 所有城镇消费者, 1913~ |
| fred_gnpca | GNPCA | 实际 GNP, 1929~ |
| fred_indpro | INDPRO | 工业生产指数, 1919~ |
| fred_unrate | UNRATE | 失业率, 1948~ |
| fred_fedfunds | FEDFUNDS | 联邦基金利率, 1954~ |
| fred_t5yiep | T5YIE | 5年期盈亏平衡通胀率, 2003~ |
| **World Bank (7)** | | |
| wb_gdp_growth | NY.GDP.MKTP.KD.ZG | 全球GDP增长率 |
| wb_gdp_per_capita | NY.GDP.PCAP.KD | 全球人均GDP |
| wb_trade_pct | NE.TRD.GNFS.ZS | 贸易占GDP比重 |
| wb_population | SP.POP.TOTL | 总人口 |
| wb_inflation | FP.CPI.TOTL.ZG | CPI通胀率 |
| wb_patent | IP.PAT.RESD | 居民专利申请量 |
| wb_electricity | EG.USE.ELEC.KH.PC | 人均用电量 |

### 数据源文件

| 文件 | 用途 |
|------|------|
| `data/sources/fred.py` | FRED 数据源（8系列注册 + 任意 series_id 查询） |
| `data/sources/world_bank.py` | World Bank 数据源（7指标注册 + 任意 indicator 查询） |
| `data/sources/wb_fred_adapter.py` | FRED/WB 原始 HTTP 适配器（底层请求） |
| `shared/cycle_db.py` | 周期指标缓存层（SQLite + DB-first + 8h失效） |

### 数据流

```
fred_data("GDPC1")
  → cycle_db.get("fred_ppiaco")            有 → 返回
  → fetch_fred("GDPC1") → cycle_db.set()  无 → 拉取 → 缓存 → 返回

wb_data("NY.GDP.MKTP.CD", "CN")
  → cycle_db.get("NY.GDP.MKTP.CD_CN")      有 → 返回
  → fetch_wb("NY.GDP.MKTP.CD", "CN")       无 → 拉取 → 返回（不缓存第三方）
```

## 当前状态（2026-05-25，第7轮验证）

| 维度 | 值 |
|------|-----|
| Python 文件 | 30 个，全部通过 SyntaxError 检查 |
| 注册工具 | **81 个**（+8 周期工具：kitchin/juglar/kuznets/kondratiev + 4 chart） |
| Prompts | 7 个 |
| Resources | 14 个 |
| 数据获取工具 | fred_data / fred_list / wb_data / wb_list / cycle_collect / cycle_cache_status |
| 核心数据源 | akshare (东方财富/雪球/新浪/同花顺/申万) + OKX/Binance API + FRED + World Bank + NBS |
| 反爬策略 | UA 轮换 + exp backoff retry + session 复用 + 限流信号量(3) + _em 冷却期(5s) + _em 无代理回退 + proxy 支持 |
| 第7轮新增 | `cycles.py`（8 工具）、`spectral.py`（共享库）、`DB_CONFIG` 集中管理、`cycles/` 和 `pipelines/` 目录删除 |
| 第7轮验证 | 全部 81 工具注册确认；`spectral` import OK；`DB_CONFIG` import OK；`backend` import OK；cycles.py syntax OK |

## 已补充部署配置

| 文件 | 用途 |
|------|------|
| `Dockerfile` | 基于 python:3.14-slim + uv 的容器构建 |
| `docker-compose.yml` | 本地一键编排 |
| `server.json` | MCP 客户端配置模板 |
| `smithery.yaml` | Smithery 部署描述 |
| `.github/workflows/test.yaml` | CI：push/PR 自动 pytest + coverage |
| `.github/workflows/publish.yaml` | CD：release 时自动 build 并发版到 PyPI |
| `.env.example` | 环境变量模板 |
| `registry_add.bat` | 智能检测 Clash 端口 → 自动注册到 User 环境变量 |
