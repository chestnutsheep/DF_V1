"""行业 MCP 工具 — 数据源: 同花顺(ths) + 巨潮(cninfo)，零东方财富依赖。"""
from io import StringIO

import pandas as pd
from pydantic import Field

from ..server import mcp
from ..shared import industry_db as db
from ..data.sources import industry_ths as ths
from ..data.sources import industry_cninfo as cninfo


@mcp.tool(
    name="industry_classify",
    description="获取同花顺/巨潮行业分类列表",
)
def industry_classify(
    分类标准: str = Field("同花顺", description="同花顺 / 巨潮"),
) -> str:
    # 优先本地 SQLite
    cached = db.get_classify("ths")
    if cached is not None and not cached.empty:
        return cached.to_csv(index=False)

    # 拉取同花顺（无需代理）
    df = ths.get_industry_list()
    if df is not None and not df.empty:
        try:
            db.save_classify(df, "ths")
        except Exception:
            pass
        return df.to_csv(index=False)

    return "暂无行业数据"


@mcp.tool(
    name="industry_quotes",
    description="获取行业历史行情（OHLCV）、估值水平、资金流向，优先本地缓存",
)
def industry_quotes(
    industry: str = Field("", description="行业名称，如 银行"),
    period: str = Field("daily", description="K线周期: daily/weekly/monthly"),
    limit: int = 30,
) -> str:
    results = []

    # 行业指数历史行情（同花顺）
    if industry:
        df = ths.get_industry_index(industry, start="20200101")
        if df is not None and not df.empty:
            df_out = df.tail(limit).round(2)
            results.append(f"=== {industry} 行业指数行情(同花顺) ===")
            results.append(df_out.to_csv(index=False))

    # 行业估值（巨潮）
    val = cninfo.get_pe_ratio()
    if val is not None and not val.empty:
        if industry:
            val = val[val["industry_name"].str.contains(industry, na=False)]
        results.append("=== 行业市盈率(巨潮) ===")
        results.append(val.head(limit).to_csv(index=False, float_format="%.2f"))

    # 资金流（同花顺）
    flow = ths.get_fund_flow()
    if flow is not None and not flow.empty:
        if industry:
            flow = flow[flow["industry_name"].str.contains(industry, na=False)]
        results.append("=== 行业资金流(同花顺) ===")
        results.append(flow.head(limit).to_csv(index=False, float_format="%.2f"))

    if not results:
        return "数据暂不可用，请检查网络"
    return "\n\n".join(results)


@mcp.tool(
    name="industry_capital_flow",
    description="行业资金流排行（同花顺）",
)
def industry_capital_flow(
    industry: str = Field("", description="行业名称，留空返回全排行"),
    limit: int = 20,
) -> str:
    flow = ths.get_fund_flow()
    if flow is None or flow.empty:
        return "资金流数据暂不可用"
    if industry:
        flow = flow[flow["industry_name"].str.contains(industry, na=False)]
    return flow.head(limit).to_csv(index=False, float_format="%.2f")


@mcp.tool(
    name="industry_collect",
    description="触发行业数据采集并写入本地 SQLite 数据库（同花顺+巨潮）",
)
def industry_collect() -> str:
    results = []
    errors = []

    # 1. 行业分类
    df = ths.get_industry_list()
    if df is not None and not df.empty:
        db.save_classify(df, "ths")
        results.append(f"分类: {len(df)} 条")

    # 2. 估值
    df2 = cninfo.get_pe_ratio()
    if df2 is not None and not df2.empty:
        db.save_valuation(df2)
        results.append(f"估值: {len(df2)} 条")

    # 3. 资金流
    df3 = ths.get_fund_flow()
    if df3 is not None and not df3.empty:
        db.save_fund_flow(df3)
        results.append(f"资金流: {len(df3)} 条")

    # 4. 行业一览（实时行情快照）
    df4 = ths.get_industry_summary()
    if df4 is not None and not df4.empty:
        results.append(f"行情快照: {len(df4)} 条")

    stats = db.get_cache_stats()
    lines = ["=== 行业数据采集报告 ==="]
    lines.extend([f"✅ {r}" for r in results])
    lines.extend([f"❌ {e}" for e in errors])
    lines.append("")
    lines.append("数据库状态:")
    for name, cnt in stats.items():
        lines.append(f"  {name}: {cnt} 行")
    return "\n".join(lines)


@mcp.tool(
    name="industry_sw_tree",
    description="申万三级行业树（31一级→131二级→336三级），含估值数据",
)
def industry_sw_tree(
    行业: str = "",
    深度: int = 3,
    展开: int = 2,
) -> str:
    from ..data.sources.industry_sw import get_tree, tree_to_text

    tree = get_tree()
    if not tree:
        return "数据为空，请先执行 industry_collect"

    for f in tree:
        f["children"] = sorted(f["children"], key=lambda x: x["name"])
        for s in f["children"]:
            s["children"] = sorted(s["children"], key=lambda x: x["name"])

    if 行业:
        tree = [f for f in tree if 行业 in f["name"]]
        if not tree:
            return f"未找到行业: {行业}"

    out = [f"申万一级 {len(tree)} 个"]
    shown = tree[:展开] if 展开 else tree
    out.append(tree_to_text(shown, max_depth=深度))
    if 展开 < len(tree):
        out.append(f"... 还有 {len(tree) - 展开} 个一级行业")
    return "\n".join(out)


@mcp.tool(
    name="industry_sw_constituents",
    description="查询申万指数成分股（一/二/三级行业通用，差异只在池子大小）",
)
def industry_sw_constituents(
    行业代码: str = Field(..., description="申万指数代码，如 801010(一级) / 801011(二级) / 850111(三级)，不传.si后缀"),
    limit: int = Field(50, description="返回前N只"),
) -> str:
    from ..data.sources.industry_sw import get_constituents
    df = get_constituents(行业代码)
    if df is None or df.empty:
        return f"成分股数据暂不可用 (代码: {行业代码})"
    return df.head(limit).to_csv(index=False, float_format="%.4f")


@mcp.tool(
    name="industry_sw_daily",
    description="申万指数分析日报表：市场表征/一级行业/二级行业/风格指数，含PE/PB/涨跌幅",
)
def industry_sw_daily(
    symbol: str = "一级行业",
    start_date: str = "",
    end_date: str = "",
    limit: int = 50,
) -> str:
    from ..data.sources.industry_sw import get_daily_analysis
    df = get_daily_analysis(symbol, start_date or None, end_date or None)
    if df is None or df.empty:
        return f"日报表数据暂不可用 (symbol={symbol})"
    return df.head(limit).to_csv(index=False, float_format="%.2f")


@mcp.tool(
    name="industry_db_status",
    description="行业数据库各表行数和缓存新鲜度",
)
def industry_db_status() -> str:
    stats = db.get_cache_stats()
    lines = ["=== 行业数据库状态 ==="]
    for name, cnt in stats.items():
        fresh = db.has_recent_data(name, 24)
        lines.append(f"  {name:30s} {cnt:>6}行  {'✅ 今日已更新' if fresh else '⚠️ 需更新'}")
    lines.append(f"  数据库: {db.DB_PATH}")
    return "\n".join(lines)
