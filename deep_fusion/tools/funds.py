"""基金数据工具模块"""

from datetime import datetime

import akshare as ak
from pydantic import Field

from ..server import mcp
from ..shared.schema import format_error_csv
from ..shared.utils import ak_cache


@mcp.tool(
    title="获取基金基本信息",
    description="获取基金的基本信息，包括基金名称、类型、规模、管理人等详细信息",
)
def fund_info(
    code: str = Field("000001", description="基金代码，例如: 000001(华夏成长)"),
):
    # 雪球（第一顺位）—— 返回基金基本信息
    try:
        df = ak_cache(ak.fund_individual_basic_info_xq, symbol=code)
        if df is not None and not df.empty:
            lines = [f"{row['item']}: {row['value']}" for _, row in df.iterrows()]
            return "\n".join(lines)
    except Exception:
        pass
    # 东方财富ETF（第二顺位）
    try:
        df = ak_cache(ak.fund_etf_fund_info_em, symbol=code)
        if df is not None and not df.empty:
            return df.to_csv(index=False, float_format="%.4f")
    except Exception:
        pass
    # 东方财富普通（回退）
    df = ak_cache(ak.fund_open_fund_info_em, symbol=code)
    if df is None or df.empty:
        return format_error_csv("empty dictionary", "akshare", fallback=code)
    return df.to_csv(index=False, float_format="%.4f")


@mcp.tool(
    title="获取基金净值历史",
    description="获取基金的历史净值数据，包括单位净值、累计净值、日增长率等，用于分析基金业绩表现",
)
def fund_nav(
    code: str = Field("000001", description="基金代码，例如: 000001(华夏成长)"),
    limit: int = Field(30, description="返回数量(int)，建议30-252", strict=False),
):
    df = ak_cache(ak.fund_open_fund_daily_em)
    if df is None or df.empty:
        return format_error_csv("empty dictionary", "akshare", fallback=code)
    df = df.loc[df.iloc[:, 0] == code].tail(limit).copy() if len(df) > 0 else df.tail(limit).copy()
    return df.to_csv(index=False, float_format="%.4f")


@mcp.tool(
    title="获取基金持仓明细",
    description="获取基金的股票持仓明细，包括持仓股票代码、名称、持仓比例等，用于分析基金投资组合",
)
def fund_holdings(
    code: str = Field("000001", description="基金代码，例如: 000001(华夏成长)"),
):
    df = ak_cache(ak.fund_portfolio_hold_em, symbol=code, date=str(datetime.now().year))
    if df is None or df.empty:
        return format_error_csv("empty dictionary", "akshare", fallback=code)
    return df.to_csv(index=False, float_format="%.2f")


@mcp.tool(
    title="获取基金排行榜",
    description="获取不同类型基金的排行榜数据，包括收益率、规模等指标，支持按时间周期和基金类型筛选",
)
def fund_ranking(
    fund_type: str = Field(
        "全部",
        description="基金类型，支持: 全部, 股票型, 混合型, 债券型, 指数型, QDII, ETF, LOF",
    ),
):
    df = ak_cache(ak.fund_open_fund_rank_em, symbol=fund_type)
    if df is None or df.empty:
        return format_error_csv("empty dictionary", "akshare", fallback=fund_type)
    df = df.head(100).copy()
    return df.to_csv(index=False, float_format="%.2f")
