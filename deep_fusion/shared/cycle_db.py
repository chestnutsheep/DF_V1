"""Cycle indicator cache layer — SQLite-backed, DB-first, live fallback.

Stores raw indicator time series (dates, values) so cycles don't re-fetch every call.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

DB_PATH = Path.home() / "output" / "data" / "cycle_cache.db"
FRESH_HOURS = 8  # 数据可复用窗口

# ── FRED / World Bank 指标注册 ─────────────────────────
_FRED_INDICATORS: dict[str, tuple[str, str]] = {
    "fred_ppiaco":   ("PPIACO",            "生产者价格指数(全商品), 1913~"),
    "fred_gs10":     ("GS10",              "10年期国债收益率, 1953~"),
    "fred_cpiaucns": ("CPIAUCNS",          "CPI 所有城镇消费者, 1913~"),
    "fred_gnpca":    ("GNPCA",             "实际 GNP, 1929~"),
    "fred_indpro":   ("INDPRO",            "工业生产指数, 1919~"),
    "fred_unrate":   ("UNRATE",            "失业率, 1948~"),
    "fred_fedfunds": ("FEDFUNDS",          "联邦基金利率, 1954~"),
    "fred_t5yiep":   ("T5YIE",             "5年期盈亏平衡通胀率, 2003~"),
}

_WB_INDICATORS: dict[str, tuple[str, str, str]] = {
    "wb_gdp_growth":     ("NY.GDP.MKTP.KD.ZG", "1W", "全球GDP增长率"),
    "wb_gdp_per_capita": ("NY.GDP.PCAP.KD",    "1W", "全球人均GDP"),
    "wb_trade_pct":      ("NE.TRD.GNFS.ZS",    "1W", "贸易占GDP比重"),
    "wb_population":     ("SP.POP.TOTL",       "1W", "总人口"),
    "wb_inflation":      ("FP.CPI.TOTL.ZG",    "1W", "CPI通胀率"),
    "wb_patent":         ("IP.PAT.RESD",       "1W", "居民专利申请量"),
    "wb_electricity":    ("EG.USE.ELEC.KH.PC", "1W", "人均用电量"),
}


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    _ensure_schema(conn)
    return conn


def _ensure_schema(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cycle_data (
            indicator TEXT NOT NULL,
            date TEXT NOT NULL,
            value REAL,
            PRIMARY KEY (indicator, date)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cycle_cache (
            indicator TEXT PRIMARY KEY,
            cached_at TEXT NOT NULL
        )
    """)
    conn.commit()


def get(indicator: str) -> pd.DataFrame | None:
    conn = _connect()
    row = conn.execute("SELECT cached_at FROM cycle_cache WHERE indicator=?", (indicator,)).fetchone()
    if row:
        cached = datetime.fromisoformat(row["cached_at"])
        if datetime.now() - cached < timedelta(hours=FRESH_HOURS):
            df = pd.read_sql(
                "SELECT date, value FROM cycle_data WHERE indicator=? ORDER BY date",
                conn, params=(indicator,),
            )
            conn.close()
            if not df.empty:
                return df
    conn.close()
    return None


def set(indicator: str, dates: list[str], values: list[float]):
    conn = _connect()
    conn.executemany(
        "INSERT OR REPLACE INTO cycle_data (indicator, date, value) VALUES (?, ?, ?)",
        [(indicator, d, v) for d, v in zip(dates, values) if v is not None],
    )
    conn.execute(
        "INSERT OR REPLACE INTO cycle_cache (indicator, cached_at) VALUES (?, ?)",
        (indicator, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()


def cache_all():
    """拉取全部指标（NBS + FRED + WB + akshare 宏观）并缓存到 DB。"""
    from ..data.sources.nbs_client import (
        _fetch_nbs_inventory_yoy, _fetch_nbs_ind_yoy, _fetch_nbs_fix_inv_monthly,
        _fetch_nbs_re_dev_yoy, _fetch_nbs_cpi_yoy, _fetch_nbs_ppi_yoy,
        _fetch_nbs_gdp_quarterly, _fetch_nbs_unemployment,
        _fetch_nbs_equip_invest, _fetch_nbs_manufacturing_invest,
        _fetch_nbs_re_sales_area, _fetch_nbs_re_new_start,
        _fetch_nbs_capacity_util, _fetch_house_price_yoy,
    )
    from ..data.sources.wb_fred_adapter import fetch_fred, fetch_wb
    from ..cache import ak_cache
    import akshare as ak

    results: dict[str, str | int] = {}

    # ── NBS ──
    for name, fn in [
        ("inventory_yoy", _fetch_nbs_inventory_yoy),
        ("ind_yoy", _fetch_nbs_ind_yoy),
        ("fix_inv_monthly", _fetch_nbs_fix_inv_monthly),
        ("re_dev_yoy", _fetch_nbs_re_dev_yoy),
        ("cpi_yoy", _fetch_nbs_cpi_yoy),
        ("ppi_yoy", _fetch_nbs_ppi_yoy),
        ("gdp_quarterly", _fetch_nbs_gdp_quarterly),
        ("unemployment", _fetch_nbs_unemployment),
        ("equip_invest", _fetch_nbs_equip_invest),
        ("manufacturing_invest", _fetch_nbs_manufacturing_invest),
        ("re_sales_area", _fetch_nbs_re_sales_area),
        ("re_new_start", _fetch_nbs_re_new_start),
        ("capacity_util", _fetch_nbs_capacity_util),
        ("house_price_yoy", _fetch_house_price_yoy),
    ]:
        try:
            dates, vals = fn()
            if dates:
                set(name, dates, vals)
                results[name] = len(dates)
        except Exception as e:
            results[name] = f"❌ {e}"

    # ── FRED ──
    for cache_key, (series_id, desc) in _FRED_INDICATORS.items():
        try:
            raw = fetch_fred(series_id)
            if raw:
                dates = [r[0][:10] for r in raw]
                vals = [r[1] for r in raw]
                set(cache_key, dates, vals)
                results[cache_key] = len(vals)
        except Exception as e:
            results[cache_key] = f"❌ {e}"

    # ── World Bank ──
    for cache_key, (indicator, country, desc) in _WB_INDICATORS.items():
        try:
            raw = fetch_wb(indicator, country)
            if raw:
                dates = [str(r[0]) for r in raw]
                vals = [r[1] for r in raw]
                set(cache_key, dates, vals)
                results[cache_key] = len(vals)
        except Exception as e:
            results[cache_key] = f"❌ {e}"

    # ── akshare 宏观 ──
    for name, fn, col in [
        ("pmi_macro", ak.macro_china_pmi, "制造业采购经理人指数"),
        ("m2_yearly", ak.macro_china_m2_yearly, "货币供应量同比增速"),
    ]:
        try:
            df = ak_cache(fn, ttl=3600)
            if df is not None and not df.empty and col in df.columns:
                dates = df["日期" if "日期" in df.columns else df.columns[0]].tolist()
                vals = df[col].tolist()
                set(name, [str(d)[:10] for d in dates], vals)
                results[name] = len(vals)
        except Exception as e:
            results[name] = f"❌ {e}"

    return results


def stats() -> dict[str, int]:
    conn = _connect()
    rows = conn.execute(
        "SELECT indicator, COUNT(*) as cnt FROM cycle_data GROUP BY indicator"
    ).fetchall()
    conn.close()
    return {r["indicator"]: r["cnt"] for r in rows}


def list_fred() -> list[dict]:
    return [{"key": k, "series_id": v[0], "desc": v[1]} for k, v in _FRED_INDICATORS.items()]


def list_wb() -> list[dict]:
    return [{"key": k, "indicator": v[0], "country": v[1], "desc": v[2]} for k, v in _WB_INDICATORS.items()]


def clear(indicator: str | None = None):
    conn = _connect()
    if indicator:
        conn.execute("DELETE FROM cycle_data WHERE indicator=?", (indicator,))
        conn.execute("DELETE FROM cycle_cache WHERE indicator=?", (indicator,))
    else:
        conn.execute("DELETE FROM cycle_data")
        conn.execute("DELETE FROM cycle_cache")
    conn.commit()
    conn.close()
