import asyncio
import json
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from functools import partial
from typing import Any

import akshare as ak
import numpy as np
import pandas as pd
import requests
from pydantic.fields import FieldInfo

from ..cache import CacheKey
from ..data.sources.wb_fred_adapter import fetch_wb, fetch_fred, _fred_to_annual
from .constants import PORTFOLIO_FILE

_LOGGER = logging.getLogger(__name__)

from ..cache import ak_cache, ak_cache_async  # noqa: F401


def recent_trade_date():
    now = datetime.now().date()
    dfs = ak_cache(ak.tool_trade_date_hist_sina, ttl=43200)
    if dfs is None:
        return now
    dfs.sort_values("trade_date", ascending=False, inplace=True)
    for d in dfs["trade_date"]:
        if d <= now:
            return d
    return now

def _prev_quarter_end() -> str:
    dt = datetime.now()
    q = (dt.month - 1) // 3
    if q == 0:
        return f"{dt.year - 1}1231"
    if q == 1:
        return f"{dt.year}0331"
    if q == 2:
        return f"{dt.year}0630"
    return f"{dt.year}0930"

def load_portfolio():
    if not os.path.exists(PORTFOLIO_FILE):
        os.makedirs(os.path.dirname(PORTFOLIO_FILE), exist_ok=True)
        return {}
    with open(PORTFOLIO_FILE, "r") as f:
        return json.load(f)


def save_portfolio(data):
    os.makedirs(os.path.dirname(PORTFOLIO_FILE), exist_ok=True)
    with open(PORTFOLIO_FILE, "w") as f:
        json.dump(data, f, indent=2)


def ak_search(symbol: str | None = None, keyword: str | None = None, market: str | None = None):
    markets = [
        ["sh", ak.stock_info_a_code_name, "code", "name"],
        ["sh", ak.stock_info_sh_name_code, "证券代码", "证券简称"],
        ["sz", ak.stock_info_sz_name_code, "A股代码", "A股简称"],
        ["hk", ak.stock_hk_spot, "代码", "中文名称"],
        ["hk", ak.stock_hk_spot_em, "代码", "名称"],
        ["us", ak.get_us_stock_name, "symbol", "cname"],
        ["us", ak.get_us_stock_name, "symbol", "name"],
        ["sh", ak.fund_etf_spot_ths, "基金代码", "基金名称"],
        ["sz", ak.fund_etf_spot_ths, "基金代码", "基金名称"],
        ["sh", ak.fund_info_index_em, "基金代码", "基金名称"],
        ["sz", ak.fund_info_index_em, "基金代码", "基金名称"],
        ["sh", ak.fund_etf_spot_em, "代码", "名称"],
        ["sz", ak.fund_etf_spot_em, "代码", "名称"],
    ]
    for m in markets:
        if market and market != m[0]:
            continue
        all_df = ak_cache(m[1], ttl=86400, ttl2=86400 * 7)
        if all_df is None or all_df.empty:
            continue
        for _, v in all_df.iterrows():
            code, name = str(v[m[2]]).upper(), str(v[m[3]]).upper()
            if symbol and symbol.upper() == code:
                return v
            if keyword and keyword.upper() in [code, name]:
                return v
        if keyword:
            for _, v in all_df.iterrows():
                name = str(v[m[3]])
                if len(keyword) >= 4 and keyword in name:
                    return v
                if name.startswith(keyword):
                    return v
    return None


async def ak_search_async(symbol: str | None = None, keyword: str | None = None, market: str | None = None):
    markets = [
        ["sh", ak.stock_info_a_code_name, "code", "name"],
        ["sh", ak.stock_info_sh_name_code, "证券代码", "证券简称"],
        ["sz", ak.stock_info_sz_name_code, "A股代码", "A股简称"],
        ["hk", ak.stock_hk_spot, "代码", "中文名称"],
        ["hk", ak.stock_hk_spot_em, "代码", "名称"],
        ["us", ak.get_us_stock_name, "symbol", "cname"],
        ["us", ak.get_us_stock_name, "symbol", "name"],
        ["sh", ak.fund_etf_spot_ths, "基金代码", "基金名称"],
        ["sz", ak.fund_etf_spot_ths, "基金代码", "基金名称"],
        ["sh", ak.fund_info_index_em, "基金代码", "基金名称"],
        ["sz", ak.fund_info_index_em, "基金代码", "基金名称"],
        ["sh", ak.fund_etf_spot_em, "代码", "名称"],
        ["sz", ak.fund_etf_spot_em, "代码", "名称"],
    ]

    filtered_markets = [m for m in markets if not market or market == m[0]]
    if not filtered_markets:
        return None

    tasks = [ak_cache_async(m[1], ttl=86400, ttl2=86400 * 7) for m in filtered_markets]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for m, all_df in zip(filtered_markets, results):
        if isinstance(all_df, Exception) or all_df is None or all_df.empty:
            continue
        for _, v in all_df.iterrows():
            code, name = str(v[m[2]]).upper(), str(v[m[3]]).upper()
            if symbol and symbol.upper() == code:
                return v
            if keyword and keyword.upper() in [code, name]:
                return v
        if keyword:
            for _, v in all_df.iterrows():
                name = str(v[m[3]])
                if len(keyword) >= 4 and keyword in name:
                    return v
                if name.startswith(keyword):
                    return v
    return None


def compute_kondratiev() -> dict[str, Any]:
    """机构标准康波计算: FRED(PPIACO+GS10) + 世界银行(全球GDP) → PCA → CF(40-70yr) → sign&level

    替代旧版中国5指标PCA: PPIACO 1913~ 提供~112年数据(够2轮康波),
    GS10 1953~, 全球GDP 1961~.
    """
    import numpy as np
    from .spectral import cf_bandpass

    # 1. 获取全球数据
    ppiaco = fetch_fred("PPIACO")  # PPI All Commodities, 1913~
    gs10 = fetch_fred("GS10")      # 10-Year Treasury, 1953~
    wbgdp = fetch_wb("NY.GDP.MKTP.KD.ZG", "1W")  # World GDP growth, 1961~

    # 2. 转年度, 对齐年份
    raw: dict[str, list[tuple[int, float]]] = {}
    if len(ppiaco) > 20:
        raw["ppiaco"] = _fred_to_annual(ppiaco)
    if len(gs10) > 20:
        raw["gs10"] = _fred_to_annual(gs10)
    if len(wbgdp) > 10:
        raw["wbgdp"] = wbgdp

    if len(raw) < 2:
        return {"dominant_period": None, "phase": 0, "confidence": 0.0,
                "method_used": "insufficient_global_data"}

    # 3. 对齐年份
    all_years: set[int] = set()
    for vals in raw.values():
        for y, _ in vals:
            all_years.add(y)
    years = sorted(all_years)
    n = len(years)
    if n < 20:
        return {"dominant_period": None, "phase": 0, "confidence": 0.0,
                "method_used": f"too_few_years({n})"}

    # 4. 构建矩阵
    matrix_list = []
    keys_ordered = ["ppiaco", "gs10", "wbgdp"]
    available = []
    for key in keys_ordered:
        if key not in raw:
            continue
        d = {y: v for y, v in raw[key]}
        arr = np.full(n, np.nan, dtype=float)
        for i, y in enumerate(years):
            arr[i] = d.get(y, np.nan)
        valid = ~np.isnan(arr)
        if valid.sum() < 10:
            continue
        arr = np.interp(np.arange(n), np.where(valid)[0], arr[valid])

        # 对数化处理价格/利率
        if key in ("ppiaco",):
            arr = np.log(np.maximum(arr, 1e-6))
        # 标准化
        arr = (arr - np.mean(arr)) / max(np.std(arr), 1e-12)
        matrix_list.append(arr)
        available.append(key)

    if len(available) < 2:
        return {"dominant_period": None, "phase": 0, "confidence": 0.0,
                "method_used": "insufficient_indicators"}

    # 5. PCA
    matrix = np.column_stack(matrix_list)
    matrix_c = matrix - matrix.mean(axis=0)
    U, S, Vt = np.linalg.svd(matrix_c, full_matrices=False)
    pca1 = U[:, 0]
    pca_var = float(S[0]**2 / (S**2).sum())

    # 6. CF 带通 (40-70yr) → 符合机构标准
    bp = cf_bandpass(pca1.tolist(), low_yr=40, high_yr=70, ma_yr=9, fs=1.0)
    zs = bp["zscore"]

    # 7. 相位: sign+level 机构标准
    z_latest = zs[-1] if zs else 0.0
    z_prev = zs[-3] if len(zs) >= 3 else z_latest
    grad = z_latest - z_prev  # 梯度

    eps = 0.005
    if abs(grad) < eps:
        phase = 2 if z_latest > 0 else 4
        confidence = min(1.0, abs(z_latest) / 2.0 + 0.3)
    elif grad > 0 and z_latest < 0:   # 低于均值+上升 → 回升
        phase = 1
        confidence = min(1.0, 0.5 + 0.5 * abs(z_latest))
    elif grad > 0 and z_latest >= 0:  # 高于均值+上升 → 繁荣
        phase = 2
        confidence = min(1.0, 0.5 + 0.5 * abs(z_latest))
    elif grad < 0 and z_latest >= 0:  # 高于均值+下降 → 衰退
        phase = 3
        confidence = min(1.0, 0.5 + 0.5 * abs(z_latest))
    else:                              # 低于均值+下降 → 萧条
        phase = 4
        confidence = min(1.0, 0.5 + 0.5 * abs(z_latest))

    turning_p = min(0.7, abs(grad) / (np.std(np.diff(zs)) + 1e-12) * 0.3) if len(zs) > 3 else 0.0

    return {
        "dominant_period": round(70 / 1.5, 2) if n > 50 else None,  # CF带通中心周期
        "phase": phase,
        "confidence": round(confidence, 4),
        "method_used": "fred_global_cf_40_70",
        "year_range": f"{years[0]}~{years[-1]}" if years else "?",
        "pca_variance_ratio": round(pca_var, 4),
        "indicators_used": available,
        "pca1": pca1.tolist(),
        "years": years,
        "phase_confidence": round(confidence, 4),
        "turning_probability": round(turning_p, 4),
        "all_results": {},
        "zscore": zs,
        "cf_cycle": bp["cycle"],
    }


