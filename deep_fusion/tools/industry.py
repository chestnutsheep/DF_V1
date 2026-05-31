import akshare as ak
from pydantic import Field

from .. import data_lake
from ..server import mcp
from ..shared import industry_db
from ..shared.utils import ak_cache


def _safe_cache(func_name: str, *args, **kwargs):
    fun = getattr(ak, func_name, None)
    if fun is None:
        return None
    return ak_cache(fun, *args, **kwargs)


@mcp.tool(
    title="行业分类查询",
    description="获取申万行业分类、证监会行业分类、东方财富行业分类等标准行业分类信息",
)
def industry_classify(
    分类标准: str = Field("申万", description="分类标准: 申万, 证监会, 东方财富"),
) -> str:
    if 分类标准 == "东方财富":
        分类标准 = "申万"
    if 分类标准 == "申万":
        db_df = industry_db.get_industry_classify("ths")
        if db_df is not None and not db_df.empty:
            return db_df.to_csv(index=False)
    classify_map = {
        "申万": ak.stock_board_industry_name_ths,
        "证监会": ak.stock_industry_category_cninfo,
        "东方财富": ak.stock_board_industry_name_ths,
    }
    func = classify_map.get(分类标准, ak.stock_board_industry_name_ths)
    df = ak_cache(func, ttl=86400, ttl2=172800)
    if df is None or df.empty:
        return ""
    return df.to_csv(index=False)


@mcp.tool(
    title="行业行情与估值",
    description="获取行业实时行情、历史K线、估值水平等综合行业市场数据",
)
def industry_quotes(
    industry: str = Field("", description="行业名称，如 银行、新能源。留空则返回全行业实时行情"),
    period: str = Field("daily", description="K线周期: daily=日线, weekly=周线, monthly=月线"),
    limit: int = 30,
) -> str:
    results = {}
    spot = _safe_cache("stock_board_industry_spot_em", ttl=300, ttl2=600)
    if spot is not None and not spot.empty:
        results["行业实时行情(东方财富)"] = spot.head(limit).to_csv(index=False, float_format="%.2f")
    else:
        spot2 = _safe_cache("stock_board_industry_summary_ths", ttl=300, ttl2=600)
        if spot2 is not None and not spot2.empty:
            results["行业实时行情(同花顺)"] = spot2.head(limit).to_csv(index=False, float_format="%.2f")
    if industry and hasattr(ak, 'stock_board_industry_hist_em'):
        hist = _safe_cache("stock_board_industry_hist_em", symbol=industry, period=period, ttl=3600, ttl2=7200)
        if hist is not None and not hist.empty:
            results[f"{industry}行业历史K线"] = hist.tail(limit).to_csv(index=False, float_format="%.2f")

    val_df = industry_db.get_industry_valuation()
    if val_df is not None and not val_df.empty:
        results["行业估值水平(本地缓存)"] = val_df.to_csv(index=False, float_format="%.2f")
    else:
        valuation = _safe_cache("stock_industry_valuation_em", ttl=86400, ttl2=172800)
        if valuation is not None and not valuation.empty:
            results["行业估值水平"] = valuation.to_csv(index=False, float_format="%.2f")
    financial = _safe_cache("stock_industry_financial_em", ttl=86400, ttl2=172800)
    if financial is not None and not financial.empty:
        results["行业财务指标"] = financial.head(limit).to_csv(index=False, float_format="%.2f")
    output = []
    for title, data in results.items():
        output.append(f"=== {title} ===")
        output.append(data)
        output.append("")
    return "\n".join(output) if output else "未获取到行业行情数据"


@mcp.tool(
    title="行业资金流向",
    description="获取行业实时资金流和行业历史资金流（主力/散户/超大单）、行业板块涨跌幅排行",
)
def industry_capital_flow(
    industry: str = Field("", description="行业名称，如 银行。留空则返回全行业实时资金流排行"),
    limit: int = 20,
) -> str:
    results = {}
    flow = _safe_cache("stock_fund_flow_industry", ttl=300, ttl2=600)
    if flow is not None and not flow.empty:
        results["全行业实时资金流"] = flow.head(limit).to_csv(index=False, float_format="%.2f")
    if industry:
        db_fund = industry_db.get_industry_by_name(industry)
        if db_fund is not None and not db_fund.empty:
            results[f"{industry}行业信息(本地缓存)"] = db_fund.to_csv(index=False)
        else:
            results[f"{industry}历史资金流"] = "施工中: 原 stock_industry_hist_fund_flow_em 接口已下线"
    rank = _safe_cache("stock_sector_fund_flow_rank", indicator="今日", ttl=300, ttl2=600)
    if rank is not None and not rank.empty:
        results["行业板块资金流排行"] = rank.head(limit).to_csv(index=False, float_format="%.2f")
    output = []
    for title, data in results.items():
        output.append(f"=== {title} ===")
        output.append(data)
        output.append("")
    return "\n".join(output) if output else "未获取到行业资金流数据"
