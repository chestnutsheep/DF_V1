"""周期定位工具 — 基钦/朱格拉/库兹涅茨/康波
核心思路：一个 CycleEngine + 4 份配置表 → 4 套 @mcp.tool
分析层驻在 deep_fusion/analysis/macro/cycles/，tools/cycles.py 只做注册+胶水。
"""
import json, logging, os, time
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from pydantic import Field

from ..server import mcp
from ..shared.utils import ak_cache
from ..cache import CacheKey

# ── 分析层导入 ────────────────────────────────────────
from ..analysis.macro.cycles.engine import (
    CycleEngine, CycleConfig, IndicatorDef,
    _zscore, _institutional_preprocess, _direction, _ma,
    _to_period, _parse_ak, _fmt, _arr, _p2date, _ak_safe,
)
from ..analysis.macro.cycles.common import _classify_kitchin, _classify_juglar, _classify_kuznets
from ..analysis.macro.cycles.kondratiev import (
    _compute_kondratiev, _calc_kondratiev_wavelet,
    _calc_kondratiev_bandpass, _gen_kondratiev_chart,
)
from ..analysis.macro.cycles.dispatch import _nbs
from ..analysis.macro.cycles import (
    CYCLES, CYCLE_METADATA,
    _compute, _fmt_report, _make_report_fn,
    _make_chart_fn, _chart_dispatch,
)

logger = logging.getLogger(__name__)

# ── NBS fetch 函数导入 ────────────────────────────────
from ..data.sources.nbs_client import (
    _NbsClient, _get_nbs_client, _clean_df, _fetch_by_indicator_name,
    _fetch_nbs_inventory_yoy, _fetch_nbs_ind_yoy, _fetch_nbs_fix_inv_monthly,
    _fetch_nbs_re_dev_yoy, _fetch_nbs_cpi_yoy, _fetch_nbs_ppi_yoy,
    _fetch_nbs_gdp_quarterly, _fetch_nbs_unemployment,
    _fetch_nbs_equip_invest, _fetch_nbs_manufacturing_invest,
    _fetch_nbs_re_sales_area, _fetch_nbs_re_new_start,
    _fetch_nbs_capacity_util, _fetch_house_price_yoy,
)

# ── FN_MAP — _nbs() 延迟解析用 ──────────────────────────
_FN_MAP: dict[str, Any] = {
    "fetch_nbs_inventory_yoy": _fetch_nbs_inventory_yoy,
    "fetch_nbs_ind_yoy": _fetch_nbs_ind_yoy,
    "fetch_nbs_fix_inv_monthly": _fetch_nbs_fix_inv_monthly,
    "fetch_nbs_re_dev_yoy": _fetch_nbs_re_dev_yoy,
    "fetch_nbs_cpi_yoy": _fetch_nbs_cpi_yoy,
    "fetch_nbs_ppi_yoy": _fetch_nbs_ppi_yoy,
    "fetch_nbs_gdp_quarterly": _fetch_nbs_gdp_quarterly,
    "fetch_nbs_unemployment": _fetch_nbs_unemployment,
    "fetch_nbs_equip_invest": _fetch_nbs_equip_invest,
    "fetch_nbs_manufacturing_invest": _fetch_nbs_manufacturing_invest,
    "fetch_nbs_re_sales_area": _fetch_nbs_re_sales_area,
    "fetch_nbs_re_new_start": _fetch_nbs_re_new_start,
    "fetch_nbs_capacity_util": _fetch_nbs_capacity_util,
    "fetch_house_price_yoy": _fetch_house_price_yoy,
    # 别名（短名兼容 original cycles.py 的 FN_MAP 调用）
    "fetch_ind_yoy": _fetch_nbs_ind_yoy,
    "fetch_inventory_yoy": _fetch_nbs_inventory_yoy,
    "fetch_fix_inv_monthly": _fetch_nbs_fix_inv_monthly,
    "fetch_re_dev_yoy": _fetch_nbs_re_dev_yoy,
    "fetch_cpi_yoy": _fetch_nbs_cpi_yoy,
    "fetch_ppi_yoy": _fetch_nbs_ppi_yoy,
    "fetch_gdp_quarterly": _fetch_nbs_gdp_quarterly,
    "fetch_unemployment": _fetch_nbs_unemployment,
    "fetch_equip_invest": _fetch_nbs_equip_invest,
    "fetch_manufacturing_invest": _fetch_nbs_manufacturing_invest,
    "fetch_re_sales_area": _fetch_nbs_re_sales_area,
    "fetch_re_new_start": _fetch_nbs_re_new_start,
    "fetch_capacity_util": _fetch_nbs_capacity_util,
    "fetch_house_price": _fetch_house_price_yoy,
}

# ============================================================
#  工具注册：基钦 / 朱格拉 / 库兹涅茨（循环生成）
# ============================================================
for _cid in ["kitchin", "juglar", "kuznets"]:
    _cfg = CYCLES[_cid]
    _meta = CYCLE_METADATA[_cid]

    # phase/direction/value keys（各周期不同）
    if _cid == "kitchin":
        _phase_key, _dir_key, _val_key = "stage", "demand_dir", "demand_yoy"
    elif _cid == "juglar":
        _phase_key, _dir_key, _val_key = "phase", "fix_dir", "comp_z"
    else:  # kuznets
        _phase_key, _dir_key, _val_key = "phase", "re_dir", "comp_z"

    _fn_report = _make_report_fn(_cid, _phase_key, _dir_key, _val_key, _cfg.name)
    mcp.tool(name=_meta["name"], description=_meta["desc"])(_fn_report)

    _fn_chart = _make_chart_fn(_cid)
    mcp.tool(name=_meta["chart_name"], description=_meta.get("chart_desc", f"生成{_cfg.name}分析图"))(_fn_chart)

# ── data_* 工具（返回 JSON 数据） ──────────────────────────
@mcp.tool(
    name="data_kitchin",
    description="获取基钦周期（库存周期）各阶段定位数据（JSON数组）",
)
def data_kitchin() -> str:
    _ck = CacheKey.init("cycles_data_kitchin", ttl=604800, ttl2=2592000)
    cached = _ck.get()
    if cached is not None and isinstance(cached, str):
        return cached
    _, _, results = _compute("kitchin", limit=0)
    text = json.dumps(results, ensure_ascii=False)
    _ck.set(text)
    return text


@mcp.tool(
    name="data_juglar",
    description="获取朱格拉周期（固定资本投资周期）各阶段定位数据（JSON数组）",
)
def data_juglar() -> str:
    _ck = CacheKey.init("cycles_data_juglar", ttl=604800, ttl2=2592000)
    cached = _ck.get()
    if cached is not None and isinstance(cached, str):
        return cached
    _, _, results = _compute("juglar", limit=0)
    text = json.dumps(results, ensure_ascii=False)
    _ck.set(text)
    return text


@mcp.tool(
    name="data_kuznets",
    description="获取库兹涅茨周期（房地产周期）各阶段定位数据（JSON数组）",
)
def data_kuznets() -> str:
    _ck = CacheKey.init("cycles_data_kuznets", ttl=604800, ttl2=2592000)
    cached = _ck.get()
    if cached is not None and isinstance(cached, str):
        return cached
    _, _, results = _compute("kuznets", limit=0)
    text = json.dumps(results, ensure_ascii=False)
    _ck.set(text)
    return text


# ============================================================
#  周期数据缓存工具
# ============================================================

@mcp.tool(
    name="cycle_collect",
    description="预采集全部周期指标数据到本地 SQLite 缓存，避免每次分析重新拉取",
)
def cycle_collect() -> str:
    from ..shared.cycle_db import cache_all, stats
    results = cache_all()
    st = stats()
    lines = [f"=== 周期数据采集 ===  共 {len(st)} 个指标"]
    for name, cnt in sorted(st.items()):
        lines.append(f"  {name:25s} {cnt:>4} 条")
    for name, err in results.items():
        if isinstance(err, str) and err.startswith("❌"):
            lines.append(f"  {name:25s} {err}")

    # ── 高级缓存器：预热各周期分析计算结果 ──
    lines.append("")
    lines.append("=== 计算结果预热 ===")
    for cid, ckey in [("kitchin", "cycles_data_kitchin"),
                       ("juglar", "cycles_data_juglar"),
                       ("kuznets", "cycles_data_kuznets")]:
        try:
            _ck = CacheKey.init(ckey, ttl=604800, ttl2=2592000)
            if _ck.get() is None:
                _, _, res = _compute(cid, limit=0)
                _ck.set(json.dumps(res, ensure_ascii=False))
                lines.append(f"  {cid:10s} ✅ 计算并缓存 ({len(res)} 期)")
            else:
                lines.append(f"  {cid:10s} ✅ 已有缓存")
        except Exception as e:
            lines.append(f"  {cid:10s} ❌ {e}")

    try:
        _ck_k = CacheKey.init("cycles_report_kondratiev_pca_v2", ttl=604800, ttl2=2592000)
        if _ck_k.get() is None:
            # 走 kondratiev_cycle() 完整路径，它自己写缓存
            text = kondratiev_cycle("pca")
            lines.append(f"  kondratiev ✅ 已计算")
        else:
            lines.append(f"  kondratiev ✅ 已有缓存")
    except Exception as e:
        lines.append(f"  kondratiev ❌ {e}")

    return "\n".join(lines)


@mcp.tool(
    name="fred_data",
    description="FRED 数据查询。传注册名(fred_ppiaco)或任意 series_id(GDPC1/UNRATE/...)",
)
def fred_data(
    series: str = "fred_ppiaco",
    limit: int = 20,
) -> str:
    from ..data.sources.fred import SERIES, get as fred_get
    from ..data.sources.wb_fred_adapter import fetch_fred

    is_registered = series in SERIES
    series_id = SERIES[series][0] if is_registered else series.upper()
    raw = fred_get(series) if is_registered else fetch_fred(series_id)
    if not raw:
        return f"无数据: {series}"
    tag = "" if is_registered else " (未缓存)"
    out = [f"=== {series_id} === [{len(raw)} 条, {raw[0][0]} ~ {raw[-1][0]}]{tag}"]
    out.append("date,value")
    for d, v in raw[-limit:]:
        out.append(f"{d},{v:.2f}")
    return "\n".join(out)


@mcp.tool(
    name="fred_list",
    description="列出所有可采集的 FRED 数据集（共8个）",
)
def fred_list() -> str:
    from ..shared.cycle_db import list_fred
    items = list_fred()
    lines = [f"共 {len(items)} 个 FRED 指标"]
    for i in items:
        lines.append(f"  {i['key']:20s}  {i['series_id']:10s}  {i['desc']}")
    return "\n".join(lines)


@mcp.tool(
    name="wb_data",
    description="世界银行数据查询。传注册名(wb_gdp_growth)或任意 indicator+国家代码",
)
def wb_data(
    indicator: str = "wb_gdp_growth",
    country: str = "1W",
    limit: int = 20,
) -> str:
    from ..data.sources.world_bank import INDICATORS, get as wb_get
    from ..data.sources.wb_fred_adapter import fetch_wb

    is_registered = indicator in INDICATORS
    if is_registered:
        raw = wb_get(indicator)
        label = INDICATORS[indicator][0]
    else:
        raw = fetch_wb(indicator, country)
        label = indicator

    if not raw:
        return f"无数据: {indicator}"
    tag = "" if is_registered else " (未缓存)"
    out = [f"=== {label} === [{len(raw)} 条, {raw[0][0]} ~ {raw[-1][0]}]{tag}"]
    out.append("year,value")
    for y, v in raw[-limit:]:
        out.append(f"{y},{v:.2f}")
    return "\n".join(out)


@mcp.tool(
    name="wb_list",
    description="列出所有可采集的世界银行数据集（共7个）",
)
def wb_list() -> str:
    from ..shared.cycle_db import list_wb
    items = list_wb()
    lines = [f"共 {len(items)} 个世界银行指标"]
    for i in items:
        lines.append(f"  {i['key']:25s}  {i['indicator']:25s}  {i['desc']}")
    return "\n".join(lines)


@mcp.tool(
    name="cycle_cache_status",
    description="查看周期数据缓存状态",
)
def cycle_cache_status() -> str:
    from ..shared.cycle_db import stats
    st = stats()
    lines = [f"周期数据缓存: {len(st)} 个指标"]
    for name, cnt in sorted(st.items()):
        lines.append(f"  {name:25s} {cnt:>4} 条")
    if not st:
        lines.append("  (空，请先用 cycle_collect 采集)")
    return "\n".join(lines)


# ============================================================
#  康波周期（单独注册，参数更多）
# ============================================================
@mcp.tool(
    name="kondratiev_cycle",
    description="判断当前长波周期（康德拉季耶夫周期）阶段。可选方法: pca(默认, 8谱法+相位映射), wavelet(Morlet小波功率谱), bandpass(40-60年带通滤波)",
)
def kondratiev_cycle(
    method: str = Field("pca", description="计算方法: pca/wavelet/bandpass"),
) -> str:
    _ck = CacheKey.init(f"cycles_report_kondratiev_{method}_v2", ttl=604800, ttl2=2592000)
    cached = _ck.get()
    if cached is not None and isinstance(cached, str):
        return cached
    result, vals = _compute_kondratiev(method)
    if not vals:
        return "数据不足（需要至少 20 年序列）"
    dp = result.get("dominant_period")
    ph = result.get("phase", 0)
    conf = result.get("confidence", 0)
    pv = result.get("pca_variance_ratio", 0)
    phase_names = ["未知", "回升期(复苏)", "繁荣期", "衰退期", "萧条期"]
    lines = [
        "═" * 50,
        "  康波周期(长波)定位",
        "═" * 50,
        f"  数据源: 世界银行 (65年长序列, 1960~2024)",
        f"  年份范围: {result.get('year_range', '?')}",
        f"  参与指标: {', '.join(result.get('indicators_used', []))}",
    ]
    pv_pct = f"{pv*100:.0f}%" if pv else "N/A"
    lines.append(f"  PCA第一主成分方差占比: {pv_pct}  {'⚠ 较低(<70%), 合成指数代表性有限' if pv and pv < 0.6 else '✅'}")
    if dp:
        lines.append(f"  主周期长度: {dp:.1f} 年  (置信度: {conf:.2f})")
        lines.append(f"  使用方法: {result.get('method_used', '?')}")
    lines.append(f"  当前相位: {ph} — {result.get('phase_name', phase_names[ph])}")
    if result.get("phase_confidence"):
        lines.append(f"  相位置信度: {result.get('phase_confidence', 0):.2f}")
    lines.append("")
    lines.append("── 康波历史参照 (5轮主流划分) ──")
    lines.append("  第1波 1782-1845 蒸汽/纺织 (谷1782 峰1815)")
    lines.append("  第2波 1845-1892 铁路/钢铁 (谷1845 峰1873)")
    lines.append("  第3波 1892-1948 电力/重工 (谷1892 峰1929)")
    lines.append("  第4波 1948-1991 汽车/石化 (谷1948 峰1973)")
    lines.append("  第5波 1991-至今  信息技术 (谷1991 峰2000)")
    lines.append(f"  → 当前数据覆盖: 第4波后半段~第5波 (1960~2024)")
    if ph == 2:
        lines.append("  机构对比: 中金/中信建投→复苏起点 | 海通/CMF→萧条延续 | 外资→不确定")
        lines.append("  → 本模型提示繁荣(高于均值的上升段), 与技术S曲线过渡期信号一致")
    elif ph == 3:
        lines.append("  机构对比: 中金/中信建投→复苏起点 | 海通/CMF→萧条延续 | 外资→不确定")
        lines.append("  → 本模型提示衰退(高于均值的下降段), 偏海通/CMF观点")
    elif ph == 1:
        lines.append("  机构对比: 中金/中信建投→复苏起点 | 海通/CMF→萧条延续 | 外资→不确定")
        lines.append("  → 本模型提示回升(低于均值的上升段), 偏中金/中信建投观点")
    elif ph == 4:
        lines.append("  机构对比: 中金/中信建投→复苏起点 | 海通/CMF→萧条延续 | 外资→不确定")
        lines.append("  → 本模型提示萧条(低于均值的下降段), 偏海通/CMF观点")
    lines.append("")
    lines.append(f"  数据精度: PCA方差占比={pv_pct}, 相位置信度={conf:.2f}, 方法={result.get('method_used', '?')}")
    slope = result.get("all_results", {}).get("slope", 0)
    if slope != 0:
        slope_dir = "上升" if slope > 0 else "下降"
        lines.append(f"  趋势斜率: {slope:.4f} ({slope_dir})")
    lines.append("═" * 50)
    text = "\n".join(lines)
    _ck.set(text)
    return text


@mcp.tool(
    name="chart_kondratiev_cycle",
    description="生成康波周期分析图（PCA合成指数+主周期标注），保存为PNG。可选方法: pca/wavelet/bandpass",
)
def chart_kondratiev_cycle(
    method: str = Field("pca", description="计算方法: pca/wavelet/bandpass"),
    output_path: str = Field("kondratiev_cycle.png", description="图表保存路径"),
) -> str:
    result, vals = _compute_kondratiev(method)
    if not vals:
        return "数据不足"
    return _gen_kondratiev_chart(result, vals, output_path)


@mcp.tool(
    name="data_kondratiev",
    description="获取康波周期原始数据（PCA合成指数序列）",
)
def data_kondratiev(
    method: str = Field("pca", description="计算方法: pca/wavelet/bandpass"),
) -> str:
    _ck = CacheKey.init(f"cycles_data_kondratiev_{method}_v2", ttl=604800, ttl2=2592000)
    cached = _ck.get()
    if cached is not None and isinstance(cached, str):
        return cached
    result, _ = _compute_kondratiev(method)
    text = json.dumps(result, ensure_ascii=False)
    _ck.set(text)
    return text
