"""Cycle indicator cache layer — SQLite-backed, DB-first, live fallback.

Stores raw indicator time series (dates, values) so cycles don't re-fetch every call.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

DB_PATH = Path.home() / "output" / "data" / "cycle_cache.db"
FRESH_HOURS = 8  # 数据可复用窗口


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
    """从 DB 读缓存，过期返回 None。"""
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
    """写入缓存。"""
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
    """拉取全部 NBS 指标并缓存到 DB。"""
    from ..data.sources.nbs_client import (
        _fetch_nbs_inventory_yoy, _fetch_nbs_ind_yoy, _fetch_nbs_fix_inv_monthly,
        _fetch_nbs_re_dev_yoy, _fetch_nbs_cpi_yoy, _fetch_nbs_ppi_yoy,
        _fetch_nbs_gdp_quarterly, _fetch_nbs_unemployment,
        _fetch_nbs_equip_invest, _fetch_nbs_manufacturing_invest,
        _fetch_nbs_re_sales_area, _fetch_nbs_re_new_start,
        _fetch_nbs_capacity_util, _fetch_house_price_yoy,
    )
    from ..cache import ak_cache
    import akshare as ak

    # NBS 指标 — (name, fetch_fn)
    nbs_fetchers = [
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
    ]
    results = {}
    for name, fn in nbs_fetchers:
        try:
            dates, vals = fn()
            if dates:
                set(name, dates, vals)
                results[name] = len(dates)
        except Exception as e:
            results[name] = f"❌ {e}"

    # akshare 宏观指标
    ak_indicators = [
        ("pmi_macro", ak.macro_china_pmi, "制造业采购经理人指数"),
        ("m2_yearly", ak.macro_china_m2_yearly, "货币供应量同比增速"),
    ]
    for name, fn, col in ak_indicators:
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
    """返回每个指标的缓存行数。"""
    conn = _connect()
    rows = conn.execute(
        "SELECT indicator, COUNT(*) as cnt FROM cycle_data GROUP BY indicator"
    ).fetchall()
    conn.close()
    return {r["indicator"]: r["cnt"] for r in rows}


def clear(indicator: str | None = None):
    """清空缓存。"""
    conn = _connect()
    if indicator:
        conn.execute("DELETE FROM cycle_data WHERE indicator=?", (indicator,))
        conn.execute("DELETE FROM cycle_cache WHERE indicator=?", (indicator,))
    else:
        conn.execute("DELETE FROM cycle_data")
        conn.execute("DELETE FROM cycle_cache")
    conn.commit()
    conn.close()
