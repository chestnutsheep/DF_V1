"""行业 MCP 工具 — 数据优先从本地 SQLite 读取，缓存过期再走 akshare。"""
from io import StringIO

import pandas as pd
from pydantic import Field

from ..server import mcp
from ..shared import industry_db as db
from ..shared.utils import ak_cache
from ..cache import ak_cache as _ak_cache
import akshare as ak


def _try_cache(fn, *args, ttl=86400, **kwargs):
    """带缓存的 akshare 调用，成功时写入本地 DB。"""
    result = ak_cache(fn, *args, ttl=ttl, **kwargs)
    if result is not None and not result.empty:
        return result
    return None


@mcp.tool(
    title="行业分类查询",
    description="获取申万/东方财富等标准行业分类信息，优先从本地缓存读取",
)
def industry_classify(
    分类标准: str = Field("申万", description="分类标准: 申万, 证监会, 东方财富"),
) -> str:
    source_map = {"申万": "ths", "东方财富": "ths", "证监会": "cninfo"}
    source = source_map.get(分类标准, "ths")

    # 优先本地
    cached = db.get_classify(source)
    if cached is not None and not cached.empty:
        return cached.to_csv(index=False)

    # 本地没有，走 akshare
    fn = {"ths": ak.stock_board_industry_name_ths, "cninfo": ak.stock_industry_category_cninfo}.get(
        source, ak.stock_board_industry_name_ths
    )
    df = _try_cache(fn, ttl=86400)
    if df is not None and not df.empty:
        # 转成标准列名后存库
        rename = {}
        for c in df.columns:
            if "名称" in c or "板块" in c:
                rename[c] = "industry_name"
            elif "代码" in c:
                rename[c] = "industry_code"
        if "industry_name" in rename:
            df_out = df.rename(columns=rename)
            if "industry_name" in df_out.columns and "industry_code" in df_out.columns:
                try:
                    db.save_classify(df_out, source)
                except Exception:
                    pass
            return df.to_csv(index=False)
        return df.to_csv(index=False)
    return "暂无行业分类数据"


@mcp.tool(
    title="行业行情与估值",
    description="获取行业实时行情、历史K线、估值水平等综合行业市场数据，优先本地缓存",
)
def industry_quotes(
    industry: str = Field("", description="行业名称，如 银行。留空返回全行业实时行情"),
    period: str = Field("daily", description="K线周期: daily/weekly/monthly"),
    limit: int = 30,
) -> str:
    results = {}

    # 估值（本地）
    val = db.get_valuation()
    if val is not None and not val.empty:
        if industry:
            val = val[val["industry_name"].str.contains(industry, na=False)]
        results["行业估值水平(本地)"] = val.head(limit).to_csv(index=False, float_format="%.2f")

    # 历史行情（本地）
    if industry:
        daily = db.get_daily(limit=limit)
        if daily is not None and not daily.empty:
            results[f"{industry}历史行情(本地)"] = daily.tail(limit).to_csv(index=False, float_format="%.2f")

    # 资金流（本地）
    flow = db.get_fund_flow(limit)
    if flow is not None and not flow.empty:
        results["行业资金流排行(本地)"] = flow.head(limit).to_csv(index=False, float_format="%.2f")

    if results:
        out = []
        for title, data in results.items():
            out.append(f"=== {title} ===")
            out.append(data)
            out.append("")
        return "\n".join(out)

    return "本地无缓存数据，请等代理恢复后采集"


@mcp.tool(
    title="行业资金流向",
    description="获取行业实时资金流排行（优先本地缓存）",
)
def industry_capital_flow(
    industry: str = Field("", description="行业名称，留空返回全行业排行"),
    limit: int = 20,
) -> str:
    flow = db.get_fund_flow(limit)
    if flow is not None and not flow.empty:
        if industry:
            flow = flow[flow["industry_name"].str.contains(industry, na=False)]
        return flow.head(limit).to_csv(index=False, float_format="%.2f")
    return "本地无缓存数据"


@mcp.tool(
    title="行业数据采集",
    description="手动触发行业数据采集：分类、估值、资金流写入本地 SQLite",
)
def industry_collect() -> str:
    """从 akshare 采集行业数据并写入本地数据库。"""
    results = []
    errors = []

    # 1. 分类
    try:
        df = _try_cache(ak.stock_board_industry_name_ths, ttl=86400)
        if df is not None and not df.empty:
            rename = {}
            for c in df.columns:
                if "名称" in c or "板块" in c:
                    rename[c] = "industry_name"
                elif "代码" in c:
                    rename[c] = "industry_code"
            df_out = df.rename(columns=rename) if rename else df
            if "industry_name" in df_out.columns and "industry_code" in df_out.columns:
                db.save_classify(df_out, "ths")
                results.append(f"分类: {len(df_out)} 条")
    except Exception as e:
        errors.append(f"分类采集失败: {e}")

    # 2. 估值
    try:
        df = _try_cache(ak.stock_industry_valuation_em, ttl=86400)
        if df is not None and not df.empty:
            db.save_valuation(df)
            results.append(f"估值: {len(df)} 条")
    except Exception as e:
        errors.append(f"估值采集失败: {e}")

    # 3. 资金流
    try:
        df = _try_cache(ak.stock_fund_flow_industry, ttl=300)
        if df is not None and not df.empty:
            db.save_fund_flow(df)
            results.append(f"资金流: {len(df)} 条")
    except Exception as e:
        errors.append(f"资金流采集失败: {e}")

    stats = db.get_cache_stats()
    lines = ["=== 行业数据采集报告 ==="]
    if results:
        lines.extend([f"✅ {r}" for r in results])
    if errors:
        lines.extend([f"❌ {e}" for e in errors])
    lines.append("")
    lines.append("当前数据库状态:")
    for name, cnt in stats.items():
        lines.append(f"  {name}: {cnt} 行")
    return "\n".join(lines)


@mcp.tool(
    title="行业数据库状态",
    description="查看行业数据库各表的行数和缓存新鲜度",
)
def industry_db_status() -> str:
    stats = db.get_cache_stats()
    lines = ["=== 行业数据库状态 ==="]
    for name, cnt in stats.items():
        fresh = db.has_recent_data(name, 24)
        status = "✅ 今日已更新" if fresh else "⚠️ 需更新"
        lines.append(f"  {name:30s} {cnt:>6} 行  {status}")
    lines.append(f"  数据库路径: {db.DB_PATH}")
    return "\n".join(lines)
