"""Shenwan industry data source + DB storage + tree tool."""
from __future__ import annotations

import akshare as ak
import pandas as pd

from ...cache import ak_cache
from ...shared import industry_db as db

_LABEL = {1: "申万一级", 2: "申万二级", 3: "申万三级"}


def _fetch_and_rename(fn, level: int) -> pd.DataFrame:
    df = ak_cache(fn, ttl=86400)
    if df is None or df.empty:
        return pd.DataFrame()
    rename = {
        "行业代码": "industry_code",
        "行业名称": "industry_name",
        "上级行业": "parent_name",
        "成份个数": "constituent_count",
        "静态市盈率": "pe_static",
        "TTM(滚动)市盈率": "pe_ttm",
        "市净率": "pb",
        "静态股息率": "dividend_yield",
    }
    df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})
    df["level"] = level
    df["source"] = "sw"
    if "parent_name" not in df.columns:
        df["parent_name"] = ""
    return df


def get_sw_all() -> dict[int, pd.DataFrame]:
    """获取申万三级分类全部数据。"""
    return {
        1: _fetch_and_rename(ak.sw_index_first_info, 1),
        2: _fetch_and_rename(ak.sw_index_second_info, 2),
        3: _fetch_and_rename(ak.sw_index_third_info, 3),
    }


def save_to_db():
    """将申万三级分类写入 SQLite。"""
    all_levels = get_sw_all()
    conn = db._connect()

    # 清空重建
    conn.execute("DROP TABLE IF EXISTS meso_sw_classify")
    conn.execute("""
        CREATE TABLE meso_sw_classify (
            industry_code TEXT PRIMARY KEY,
            industry_name TEXT,
            parent_name TEXT,
            level INTEGER,
            source TEXT,
            constituent_count INTEGER,
            pe_static REAL,
            pe_ttm REAL,
            pb REAL,
            dividend_yield REAL
        )
    """)

    total = 0
    for level, df in all_levels.items():
        if df.empty:
            continue
        for _, r in df.iterrows():
            conn.execute(
                """INSERT OR REPLACE INTO meso_sw_classify
                   (industry_code, industry_name, parent_name, level, source,
                    constituent_count, pe_static, pe_ttm, pb, dividend_yield)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    r.get("industry_code", ""),
                    r.get("industry_name", ""),
                    r.get("parent_name", ""),
                    level,
                    "sw",
                    r.get("constituent_count"),
                    r.get("pe_static"),
                    r.get("pe_ttm"),
                    r.get("pb"),
                    r.get("dividend_yield"),
                ),
            )
            total += 1
    conn.commit()
    db._log_collection("meso_sw_classify", total)
    conn.close()
    return total


def get_tree() -> list[dict]:
    """从 SQLite 读取三级树结构。"""
    conn = db._connect()
    rows = conn.execute(
        "SELECT * FROM meso_sw_classify ORDER BY level, industry_code"
    ).fetchall()
    conn.close()

    by_level = {1: [], 2: [], 3: []}
    for r in rows:
        by_level[r["level"]].append({
            "code": r["industry_code"],
            "name": r["industry_name"],
            "parent": r["parent_name"] or "",
            "count": r["constituent_count"] or 0,
            "pe_ttm": r["pe_ttm"],
            "pb": r["pb"],
            "children": [],
        })

    # 三级挂二级
    third_map = {t["name"]: t for t in by_level[3]}
    for t3 in by_level[3]:
        parent = t3["parent"]
        if parent in third_map:
            third_map[parent]["children"].append(t3)

    # 二级挂一级
    second_map = {s["name"]: s for s in by_level[2]}
    for s2 in by_level[2]:
        parent = s2["parent"]
        if parent in second_map:
            second_map[parent]["children"].append(s2)
        elif parent:  # 挂到一级
            for f in by_level[1]:
                if f["name"] == parent:
                    f["children"].append(s2)

    return by_level[1]


def tree_to_text(tree: list[dict], max_depth: int = 3) -> str:
    """树转文本，最多三级。"""
    lines = []

    def walk(nodes, depth, prefix):
        for i, n in enumerate(nodes):
            last = i == len(nodes) - 1
            conn = "└── " if last else "├── "
            child_p = "    " if last else "│   "
            pe = f" PE={n.get('pe_ttm', '-')}" if n.get("pe_ttm") else ""
            cnt = f" ({n['count']}只)" if n.get("count") else ""
            lines.append(f"{prefix}{conn}{n['name']}{cnt}{pe}")
            if depth < max_depth - 1 and n.get("children"):
                walk(n["children"], depth + 1, prefix + child_p)

    walk(tree, 0, "")
    return "\n".join(lines)
