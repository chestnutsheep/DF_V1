"""Spot commodity prices from 生意社(100ppi.com), no 东方财富 dependency.

Key symbols by industry:
  steel: RB(螺纹钢), HC(热卷), SS(不锈钢), I(铁矿)
  chemical: MA(甲醇), TA(PTA), PP, V(PVC), EG
  nonferrous: CU(铜), AL(铝), ZN(锌), NI(镍), SN(锡), PB(铅)
  energy: BU(沥青), FU(燃料油), BZ(苯)
  building: FG(玻璃), SA(纯碱), WR(线材)
  agriculture: C(玉米), M(豆粕), SR(白糖), LH(生猪)
"""
from __future__ import annotations

from datetime import datetime, timedelta

import akshare as ak
import pandas as pd

from ...cache import ak_cache

# 品种 → 中文名对照
SYMBOL_NAMES = {
    "A": "豆一", "AG": "白银", "AL": "铝", "AU": "黄金", "BZ": "苯乙烯",
    "BR": "丁二烯橡胶", "BU": "沥青", "C": "玉米", "CF": "棉花", "CU": "铜",
    "CY": "棉纱", "EB": "苯乙烯", "EG": "乙二醇", "FG": "玻璃", "FU": "燃料油",
    "HC": "热轧卷板", "I": "铁矿石", "J": "焦炭", "JD": "鸡蛋", "JM": "焦煤",
    "L": "聚乙烯", "LC": "碳酸锂", "LH": "生猪", "M": "豆粕", "MA": "甲醇",
    "NI": "镍", "OI": "菜籽油", "P": "棕榈油", "PB": "铅", "PF": "短纤",
    "PG": "液化气", "PL": "花生", "PP": "聚丙烯", "PR": "苯乙烯", "PS": "聚苯乙烯",
    "PX": "对二甲苯", "RB": "螺纹钢", "RM": "菜籽粕", "RU": "天然橡胶",
    "SA": "纯碱", "SF": "硅铁", "SH": "沥青", "SI": "工业硅", "SM": "锰硅",
    "SN": "锡", "SP": "纸浆", "SR": "白糖", "SS": "不锈钢",
    "TA": "PTA", "UR": "尿素", "V": "PVC", "WR": "线材", "Y": "豆油", "ZN": "锌",
}


def list_symbols() -> list[dict]:
    """返回所有品种代码+名称。"""
    return [{"symbol": s, "name": SYMBOL_NAMES.get(s, s)} for s in sorted(SYMBOL_NAMES)]


def get_spot_daily(
    symbol: str | None = None,
    start_day: str | None = None,
    end_day: str | None = None,
    days: int = 30,
) -> pd.DataFrame:
    """获取大宗商品现货价格及基差（生意社）。

    Args:
        symbol: 品种代码，如 "RB"、"CU"。None 返回全部。
        start_day: YYYYMMDD，默认 days 天前
        end_day: YYYYMMDD，默认今天
        days: 回溯天数（当 start_day 未指定时生效）

    Returns:
        DataFrame: [date, symbol, spot_price, near_contract_price,
                     dominant_contract_price, near_basis, dom_basis]
    """
    if not end_day:
        end_day = datetime.now().strftime("%Y%m%d")
    if not start_day:
        start = datetime.now() - timedelta(days=days)
        start_day = start.strftime("%Y%m%d")

    df = ak_cache(
        ak.futures_spot_price_daily,
        start_day=start_day,
        end_day=end_day,
        ttl=3600,
    )
    if df is None or df.empty:
        return pd.DataFrame()

    # 过滤品种
    if symbol:
        df = df[df["symbol"] == symbol.upper()]

    # 添加中文名
    df["name"] = df["symbol"].map(SYMBOL_NAMES)

    return df.reset_index(drop=True)
