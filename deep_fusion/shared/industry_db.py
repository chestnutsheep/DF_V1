import os
import sqlite3
from datetime import datetime

import pandas as pd

DB_REAL = os.path.join(os.path.dirname(__file__), "..", "..", "data", "industry_data.db")
DB_PATH = os.path.abspath(DB_REAL)


def _connect():
    if not os.path.exists(DB_PATH):
        return None
    return sqlite3.connect(DB_PATH)


def has_recent_data(table: str, max_age_hours: int = 24) -> bool:
    conn = _connect()
    if conn is None:
        return False
    cursor = conn.execute(
        "SELECT MAX(updated_at) FROM ?", (table,)
    )
    row = cursor.fetchone()
    conn.close()
    if row and row[0]:
        try:
            last = datetime.fromisoformat(row[0])
            return (datetime.now() - last).total_seconds() < max_age_hours * 3600
        except Exception:
            pass
    return False


def get_industry_classify(source: str = "ths") -> pd.DataFrame | None:
    conn = _connect()
    if conn is None:
        return None
    df = pd.read_sql_query(
        "SELECT industry_name, industry_code, source FROM meso_industry_classify WHERE source = ? ORDER BY industry_name",
        conn,
        params=(source,),
    )
    conn.close()
    return df if not df.empty else None


def get_industry_valuation() -> pd.DataFrame | None:
    conn = _connect()
    if conn is None:
        return None
    df = pd.read_sql_query(
        "SELECT industry_code, industry_name, constituent_count, pe_static, pe_ttm, pb, dividend_yield FROM meso_industry_valuation ORDER BY industry_name",
        conn,
    )
    conn.close()
    return df if not df.empty else None


def get_industry_fund_flow(limit: int = 20) -> pd.DataFrame | None:
    conn = _connect()
    if conn is None:
        return None
    df = pd.read_sql_query(
        "SELECT industry_name, industry_index, industry_pct_change, inflow, outflow, net_amount, company_count, leader_stock, leader_pct_change, current_price FROM meso_industry_fund_flow ORDER BY net_amount DESC LIMIT ?",
        conn,
        params=(limit,),
    )
    conn.close()
    return df if not df.empty else None


def get_industry_by_name(name: str) -> pd.DataFrame | None:
    conn = _connect()
    if conn is None:
        return None
    df = pd.read_sql_query(
        "SELECT industry_name, industry_code, source FROM meso_industry_classify WHERE industry_name LIKE ?",
        conn,
        params=(f"%{name}%",),
    )
    conn.close()
    return df if not df.empty else None
