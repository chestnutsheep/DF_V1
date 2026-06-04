"""股票技术指标工具 — 从 individual_hist K线数据计算衍生指标。"""
from __future__ import annotations

import json

import akshare as ak
import pandas as pd

from deep_fusion.cache import ak_cache
from deep_fusion.server import mcp
from deep_fusion.shared.indicators import add_technical_indicators


def fetch_kline(symbol: str, period: str = "daily") -> pd.DataFrame | None:
    """从 akshare 获取股票 K 线并统一列名。"""
    try:
        if period == "daily":
            df = ak_cache(ak.stock_zh_a_hist, symbol=symbol, period="daily", ttl=300)
        elif period == "weekly":
            df = ak_cache(ak.stock_zh_a_hist, symbol=symbol, period="weekly", ttl=300)
        else:
            df = ak_cache(ak.stock_zh_a_hist, symbol=symbol, period="daily", ttl=300)
        if df is None or df.empty:
            return None
        df = df.rename(columns={
            "日期": "trade_date", "开盘": "open", "收盘": "close",
            "最高": "high", "最低": "low", "成交量": "volume",
        })
        df = df.sort_values("trade_date")
        return df
    except Exception:
        return None


@mcp.tool(
    name="stock_tech_indicators",
    description="计算 A 股技术指标：MACD/KDJ/RSI/布林带/均线/ADX/CCI/OBV/SAR/WR/ROC/PSY/BIAS/MTM，返回最新一期JSON",
)
def stock_tech_indicators(symbol: str = "600519", period: str = "daily") -> str:
    """获取指定股票的技术指标（最新值）。"""
    df = fetch_kline(symbol, period)
    if df is None or df.empty:
        return json.dumps({"error": f"无法获取 {symbol} 的 K 线数据"})

    add_technical_indicators(
        df, close_col="close", low_col="low",
        high_col="high", volume_col="volume",
    )

    # 只返回最新一期
    latest = df.tail(1)
    if latest.empty:
        return json.dumps({"error": "计算后无数据"})

    # 选主要指标
    cols = [
        "trade_date", "close",
        "MACD", "DIF", "DEA",
        "KDJ.K", "KDJ.D", "KDJ.J",
        "RSI",
        "BOLL.U", "BOLL.M", "BOLL.L",
        "MA.5", "MA.10", "MA.20", "MA.60",
        "EMA.5", "EMA.10", "EMA.20",
        "ATR14", "ADX", "DI+", "DI-",
        "CCI", "WILLIAMS_R", "ROC",
        "OBV", "PSY", "BIAS", "MTM",
        "SAR",
    ]
    result = {}
    for c in cols:
        if c in latest.columns:
            v = latest.iloc[0][c]
            result[c] = round(float(v), 4) if isinstance(v, (int, float)) else str(v)

    result["symbol"] = symbol
    result["period"] = period
    return json.dumps(result, ensure_ascii=False)
