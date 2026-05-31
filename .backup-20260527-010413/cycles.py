"""周期定位工具 — 基钦/朱格拉/库兹涅茨/康波

核心思路：一个 CycleEngine + 4 份配置表 → 4 套 @mcp.tool
NBS API 客户端已内联，不再依赖外部 cycles/ 项目。
"""
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable

import akshare as ak
import numpy as np
import pandas as pd
import requests
from pydantic import Field

from ..server import mcp
from ..shared.utils import ak_cache
from ..shared.spectral import auto_select, phase_from_waveform

logger = logging.getLogger(__name__)


# ── 共享工具函数 ─────────────────────────────────────────────

def _direction(cur: float | None, prev: float | None) -> int | None:
    if cur is None or prev is None:
        return None
    return 1 if cur > prev else (-1 if cur < prev else 0)


def _ma(values: list[float | None], window: int = 3) -> list[float | None]:
    result = []
    for i, v in enumerate(values):
        if v is None:
            result.append(None)
            continue
        w = [values[j] for j in range(max(0, i - window + 1), i + 1) if values[j] is not None]
        if len(w) >= 2:
            result.append(round(sum(w) / len(w), 2))
        else:
            result.append(v)
    return result


def _to_period(raw: str) -> str:
    """统一解析 akshare 日期格式 → YYYYMM"""
    s = raw.replace("年", "").replace("月", "").replace("日", "").replace("-", "").replace("/", "").strip()
    if len(s) >= 6:
        return s[:6]
    if len(s) == 4:
        return s + "01"
    return raw[:6]


def _parse_ak(df, val_col: str = "", date_col: str = "日期") -> tuple[list[str], list[float]]:
    if df is None or df.empty:
        return [], []
    if date_col not in df.columns:
        for c in df.columns:
            if "月" in str(c) and "日" not in str(c):
                date_col = c
                break
    if not val_col or val_col not in df.columns:
        for c in df.columns:
            if c == date_col:
                continue
            try:
                float(df[c].dropna().iloc[0])
                val_col = c
                break
            except (ValueError, IndexError):
                continue
    periods, values = [], []
    for _, r in df.iterrows():
        raw = str(r.get(date_col, ""))
        v = r.get(val_col)
        if v is None:
            continue
        try:
            fv = float(v)
            if not np.isfinite(fv):
                continue
        except (ValueError, TypeError):
            continue
        periods.append(_to_period(raw))
        values.append(fv)
    return periods, values


def _fmt(v: float | None) -> str:
    return f"{v:>6.2f}" if v is not None else "  N/A"


def _arr(d: int | None) -> str:
    return "↑" if d == 1 else ("↓" if d == -1 else "—")


def _p2date(period: str):
    from datetime import date
    return date(int(period[:4]), int(period[4:6]), 1)


def _ak_safe(name, col, fallback=None):
    try:
        fn = getattr(ak, name, None)
        if fn is None:
            return pd.DataFrame(), col
        df = ak_cache(fn, ttl=86400)
        return (df, col) if df is not None else (pd.DataFrame(), col)
    except Exception:
        return pd.DataFrame(), col


# ── 周期引擎 ──────────────────────────────────────────────

@dataclass
class IndicatorDef:
    key: str                        # 存到 data 字典的 key
    fetch_fn: Callable | None = None  # 无参函数 → (periods, values)
    akshare_fn: str | None = None     # akshare 函数名
    akshare_col: str | None = None    # 从 DataFrame 取的列（留空自动检测）
    _cache: tuple | None = field(default=None, repr=False)

    def fetch(self) -> tuple[list[str], list[float]]:
        if self._cache is not None:
            return self._cache
        if self.fetch_fn:
            self._cache = self.fetch_fn()
        elif self.akshare_fn:
            df, col = _ak_safe(self.akshare_fn, self.akshare_col or "")
            self._cache = _parse_ak(df, col)
        else:
            self._cache = [], []
        return self._cache


@dataclass
class CycleConfig:
    id: str
    name: str
    desc: str
    indicators: list[IndicatorDef]
    core_key: str                   # 必须存在的 key → 用于过滤 period
    requires: list[str] | None = None  # 额外的必须字段（如 Kitchin 需要 demand_yoy+inventory_yoy）
    ma_window: int = 3
    classify_fn: Callable | None = None
    phase_names: dict | None = None


class CycleEngine:
    """配置驱动的周期计算引擎，替代 N 份 _compute_* 函数"""

    def __init__(self, config: CycleConfig):
        self.cfg = config
        self.data: dict[str, dict] = {}
        self.periods: list[str] = []
        self.results: list[dict] = []

    def run(self, limit: int = 60) -> tuple[list[str], dict, list[dict]]:
        self.data = {}
        all_periods: set[str] = set()

        for ind in self.cfg.indicators:
            periods, values = ind.fetch()
            all_periods.update(periods)

        all_p = sorted(all_periods)
        for p in all_p:
            entry: dict = {}
            for ind in self.cfg.indicators:
                periods, values = ind.fetch()
                try:
                    entry[ind.key] = values[periods.index(p)]
                except ValueError:
                    pass
            self.data[p] = entry

        req = (self.cfg.requires or []) + [self.cfg.core_key]
        self.periods = [p for p in all_p if all(k in self.data[p] for k in req)][-limit:]
        if len(self.periods) < 6:
            self.periods, self.data, self.results = [], {}, []
            return self.periods, self.data, self.results

        if self.cfg.classify_fn:
            self.results = self.cfg.classify_fn(self.periods, self.data, self.cfg)

        return self.periods, self.data, self.results


# ── 阶段判定函数（各周期专属） ──────────────────────────

def _classify_kitchin(periods: list[str], data: dict, cfg: CycleConfig) -> list[dict]:
    dem = [data[p].get("demand_yoy") for p in periods]
    inv = [data[p].get("inventory_yoy") for p in periods]
    dem_s = _ma(dem, cfg.ma_window)
    inv_s = _ma(inv, cfg.ma_window)
    stage_names = {1: "主动去库存", 2: "被动去库存", 3: "主动补库存", 4: "被动补库存"}
    results = []
    for i, p in enumerate(periods):
        dd = _direction(dem_s[i], dem_s[i - 1] if i > 0 else None)
        idir = _direction(inv_s[i], inv_s[i - 1] if i > 0 else None)
        stage = 0
        if dd is not None and idir is not None:
            if dd == -1 and idir == -1: stage = 1
            elif dd == 1 and idir == -1: stage = 2
            elif dd == 1 and idir == 1: stage = 3
            elif dd == -1 and idir == 1: stage = 4
        real_inv = (data[p].get("inventory_yoy") or 0) - ((data[p].get("pmi") or 50) - 50)
        results.append({
            "period": p, "demand_yoy": data[p].get("demand_yoy"),
            "inventory_yoy": data[p].get("inventory_yoy"),
            "pmi": data[p].get("pmi"), "m2_yoy": data[p].get("m2_yoy"),
            "fix_inv_yoy": data[p].get("fix_inv_yoy"),
            "real_inventory_yoy": real_inv,
            "stage": stage, "stage_name": stage_names.get(stage, "未知"),
            "demand_dir": dd, "inventory_dir": idir,
        })
    return results


def _classify_juglar(periods: list[str], data: dict, cfg: CycleConfig) -> list[dict]:
    fix_v = [data[p].get("fix_inv_yoy") for p in periods]
    fix_s = _ma(fix_v, cfg.ma_window)
    phase_names = {1: "复苏", 2: "繁荣", 3: "衰退", 4: "萧条"}
    results = []
    for i, p in enumerate(periods):
        dd = _direction(fix_s[i], fix_s[i - 1] if i > 0 else None)
        pmi = data[p].get("pmi")
        phase = 0
        if dd is not None:
            if dd > 0:
                phase = 2 if pmi is not None and pmi >= 52 else 1
            elif dd < 0:
                phase = 4 if pmi is not None and pmi < 48 else 3
        results.append({
            "period": p, "fix_inv_yoy": fix_v[i],
            "pmi": pmi, "ppi_yoy": data[p].get("ppi_yoy"),
            "ind_yoy": data[p].get("ind_yoy"),
            "phase": phase, "phase_name": phase_names.get(phase, "未知"),
            "fix_dir": dd,
        })
    return results


def _classify_kuznets(periods: list[str], data: dict, cfg: CycleConfig) -> list[dict]:
    vals = [data[p].get("re_yoy") for p in periods]
    vals_s = _ma(vals, cfg.ma_window)
    phase_names = {1: "复苏", 2: "繁荣", 3: "衰退", 4: "萧条"}
    results = []
    for i, p in enumerate(periods):
        dd = _direction(vals_s[i], vals_s[i - 1] if i > 0 else None)
        phase = 1 if dd == 1 else (3 if dd == -1 else 0)
        if phase == 1 and data[p].get("pmi") is not None and data[p]["pmi"] >= 51:
            phase = 2
        elif phase == 3 and data[p].get("pmi") is not None and data[p]["pmi"] < 48:
            phase = 4
        results.append({
            "period": p, "re_yoy": vals[i],
            "pmi": data[p].get("pmi"),
            "phase": phase, "phase_name": phase_names.get(phase, "未知"),
            "re_dir": dd,
        })
    return results


# ── 4 份配置表 ──────────────────────────────────────────

def _nbs(name: str, key: str) -> IndicatorDef:
    """创建 NBS 数据 IndicatorDef。内部使用闭包延迟解析 _fetch_nbs_*，
    因为 _fetch_nbs_* 定义在文件末尾，模块级 CYCLES 初始化时尚未加载。
    """
    def _resolve():
        FN_MAP = {
            "fetch_inventory_yoy": _fetch_nbs_inventory_yoy,
            "fetch_ind_yoy": _fetch_nbs_ind_yoy,
            "fetch_fix_inv_monthly": _fetch_nbs_fix_inv_monthly,
            "fetch_re_dev_yoy": _fetch_nbs_re_dev_yoy,
        }
        return FN_MAP[name]()
    return IndicatorDef(key=key, fetch_fn=_resolve)

CYCLES: dict[str, CycleConfig] = {
    "kitchin": CycleConfig(
        id="kitchin", name="基钦周期(库存周期)", desc="库存-需求交叉法判断基钦周期4阶段",
        indicators=[
            _nbs("fetch_ind_yoy", "demand_yoy"),
            _nbs("fetch_inventory_yoy", "inventory_yoy"),
            _nbs("fetch_fix_inv_monthly", "fix_inv_yoy"),
            IndicatorDef(key="pmi", akshare_fn="macro_china_pmi", akshare_col="制造业采购经理人指数"),
            IndicatorDef(key="m2_yoy", akshare_fn="macro_china_m2_yearly", akshare_col="货币供应量同比增速"),
        ],
        core_key="inventory_yoy", requires=["demand_yoy"], ma_window=3,
        classify_fn=_classify_kitchin,
        phase_names={1: "主动去库存", 2: "被动去库存", 3: "主动补库存", 4: "被动补库存"},
    ),
    "juglar": CycleConfig(
        id="juglar", name="朱格拉周期(固定资本投资周期)", desc="投资-产能法判断朱格拉周期4阶段",
        indicators=[
            _nbs("fetch_fix_inv_monthly", "fix_inv_yoy"),
            _nbs("fetch_ind_yoy", "ind_yoy"),
            IndicatorDef(key="ppi_yoy", akshare_fn="macro_china_ppi", akshare_col="工业生产者出厂价格指数"),
            IndicatorDef(key="pmi", akshare_fn="macro_china_pmi", akshare_col="制造业采购经理人指数"),
        ],
        core_key="fix_inv_yoy", ma_window=6,
        classify_fn=_classify_juglar,
        phase_names={1: "复苏", 2: "繁荣", 3: "衰退", 4: "萧条"},
    ),
    "kuznets": CycleConfig(
        id="kuznets", name="库兹涅茨周期(房地产周期)", desc="销售-投资-价格法判断库兹涅茨周期4阶段",
        indicators=[
            _nbs("fetch_re_dev_yoy", "re_yoy"),
            IndicatorDef(key="pmi", akshare_fn="macro_china_pmi", akshare_col="制造业采购经理人指数"),
        ],
        core_key="re_yoy", ma_window=6,
        classify_fn=_classify_kuznets,
        phase_names={1: "复苏", 2: "繁荣", 3: "衰退", 4: "萧条"},
    ),
}


# ── MCP 工具注册（循环注册，不用 4 份重复装饰器） ─────

CYCLE_METADATA = {
    "kitchin": {
        "name": "kitchin_cycle",
        "desc": "判断当前库存周期（基钦周期）阶段：主动去库存/被动去库存/主动补库存/被动补库存。多信号加权：工业增加值+产成品库存+PMI+M2",
        "chart_name": "chart_kitchin_cycle",
        "chart_desc": "生成基钦周期定位分析图（需求vs库存/PMI/实际库存vsPPI/M2vs固投），保存为PNG文件",
    },
    "juglar": {
        "name": "juglar_cycle",
        "desc": "判断当前固定资本投资周期（朱格拉周期）阶段。核心指标：固投+PPI+PMI",
        "chart_name": "chart_juglar_cycle",
        "chart_desc": "生成朱格拉周期定位分析图（投资指标/PPIvsPMI/固投细项/营收vs设备投资），保存为PNG",
    },
    "kuznets": {
        "name": "kuznets_cycle",
        "desc": "判断当前建筑/房地产周期（库兹涅茨周期）阶段。核心：房地产开发投资累计增长+PMI",
        "chart_name": "chart_kuznets_cycle",
        "chart_desc": "生成库兹涅茨周期定位分析图（房地产开发投资+PMI），保存为PNG",
    },
}


def _compute(cycle_id: str, limit: int = 60):
    cfg = CYCLES[cycle_id]
    engine = CycleEngine(cfg)
    return engine.run(limit)


def _fmt_report(periods, data, results, phase_key: str, dir_key: str, val_key: str, name: str) -> str:
    if not results:
        return "数据不足（需要至少 6 期数据）"
    lines = ["═" * 50, f"  {name}定位", "═" * 50]
    for r in results[-20:]:
        lines.append(f"  {r['period']}  {_arr(r.get(dir_key))} {_fmt(r.get(val_key))}  PMI{_fmt(r.get('pmi'))}  → {r.get(phase_key, '')}")
    return "\n".join(lines)


# Dynamically register tools
for _cid in ["kitchin", "juglar", "kuznets"]:
    _meta = CYCLE_METADATA[_cid]
    _cfg = CYCLES[_cid]

    # ── text tool ──
    _phase_key = "stage_name" if _cid == "kitchin" else "phase_name"
    _dir_key = "demand_dir" if _cid == "kitchin" else ("fix_dir" if _cid == "juglar" else "re_dir")
    _val_key = "demand_yoy" if _cid == "kitchin" else ("fix_inv_yoy" if _cid == "juglar" else "re_yoy")

    @mcp.tool(name=_meta["name"], description=_meta["desc"])
    def _make_text_tool(cid=_cid, pk=_phase_key, dk=_dir_key, vk=_val_key, nm=_cfg.name):
        def _fn(limit: int = Field(60, description="返回期数")) -> str:
            p, d, r = _compute(cid, limit)
            return _fmt_report(p, d, r, pk, dk, vk, nm)
        _fn.__name__ = f"{cid}_cycle"
        _fn.__annotations__["limit"] = int
        return _fn
    # Can't use loop closure here with @decorator, use explicit registration instead
    # We'll register below

# Use explicit registration instead of decorator loop
def _make_report_fn(cid, pk, dk, vk, nm):
    def _fn(limit: int = 60) -> str:
        p, d, r = _compute(cid, limit)
        return _fmt_report(p, d, r, pk, dk, vk, nm)
    _fn.__name__ = f"{cid}_cycle"
    return _fn

def _make_chart_fn(cid):
    def _fn(output_path: str = f"{cid}_cycle.png", limit: int = 120) -> str:
        p, d, r = _compute(cid, limit)
        if not r:
            return "数据不足"
        _chart_dispatch(cid, r, d, output_path)
        return f"图表已保存: {output_path}"
    _fn.__name__ = f"chart_{cid}_cycle"
    return _fn


def _chart_dispatch(cid: str, results, data, path: str):
    mapper = {
        "kitchin": _gen_kitchin_chart,
        "juglar": _gen_juglar_chart,
        "kuznets": _gen_kuznets_chart,
    }
    fn = mapper.get(cid)
    if fn:
        fn(results, data, path)


for _cid in ["kitchin", "juglar", "kuznets"]:
    _meta = CYCLE_METADATA[_cid]
    _cfg = CYCLES[_cid]
    _phase_key = "stage_name" if _cid == "kitchin" else "phase_name"
    _dir_key = "demand_dir" if _cid == "kitchin" else ("fix_dir" if _cid == "juglar" else "re_dir")
    _val_key = "demand_yoy" if _cid == "kitchin" else ("fix_inv_yoy" if _cid == "juglar" else "re_yoy")

    _fn_report = _make_report_fn(_cid, _phase_key, _dir_key, _val_key, _cfg.name)
    mcp.tool(name=_meta["name"], description=_meta["desc"])(_fn_report)

    _fn_chart = _make_chart_fn(_cid)
    mcp.tool(name=_meta["chart_name"], description=_meta["chart_desc"])(_fn_chart)


# ── 康波周期（独立处理，算法不同） ────────────────────

def _compute_kondratiev():
    from ..shared.utils import compute_kondratiev as _ck

    result = _ck()
    if result.get("pca1") is None:
        return result, []
    return result, result["pca1"]


@mcp.tool(
    title="康波周期定位",
    description="判断当前长波周期（康德拉季耶夫周期）阶段。使用世界银行65年长序列 + PCA合成指数 + 8谱分析法 + 相位映射",
)
def kondratiev_cycle() -> str:
    result, vals = _compute_kondratiev()
    if not vals:
        return "数据不足（需要至少 20 年序列）"
    dp = result.get("dominant_period")
    ph = result.get("phase", 0)
    phase_names = ["未知", "复苏(繁荣初期)", "繁荣(顶峰)", "衰退(下降期)", "萧条(谷底)"]
    lines = ["═" * 50, "  康波周期(长波)定位", "═" * 50]
    lines.append(f"  数据源: 世界银行 (65年长序列)")
    lines.append(f"  年份范围: {result.get('year_range', '?')}")
    lines.append(f"  参与指标: {', '.join(result.get('indicators_used', []))}")
    lines.append(f"  PCA第一主成分方差占比: {result.get('pca_variance_ratio', 0)*100:.0f}%")
    if dp:
        lines.append(f"  主周期长度: {dp:.1f} 年  (置信度: {result.get('confidence', 0):.2f})")
        lines.append(f"  使用方法: {result.get('method_used', '?')}")
    lines.append(f"  当前相位: {ph} — {phase_names[ph]}")
    lines.append(f"  相位置信度: {result.get('phase_confidence', 0):.2f}")
    if result.get("turning_probability", 0) > 0.5:
        lines.append(f"  ⚠ 拐点预警: 转向概率 {result.get('turning_probability', 0):.0%}")
    return "\n".join(lines)


@mcp.tool(
    title="康波周期图表",
    description="生成康波周期分析图（GDP历史序列+主周期标注），保存为PNG",
)
def chart_kondratiev_cycle(
    output_path: str = Field("kondratiev_cycle.png", description="图表保存路径"),
) -> str:
    result, vals = _compute_kondratiev()
    if not vals:
        return "数据不足"
    _gen_kondratiev_chart(result, vals, output_path)
    return f"图表已保存: {output_path}"


@mcp.tool(
    name="cycle_data_coverage",
    description="生成四周期数据覆盖甘特图，展示各数据源的起止时间范围",
)
def cycle_data_coverage(
    output_path: str = "cycle_data_coverage.png",
) -> str:
    _gen_coverage_chart(output_path)
    return f"图表已保存: {output_path}"


@mcp.tool(
    name="data_kitchin",
    description="基钦周期分析数据（阶段判定 + 原始指标）— 返回 JSON 数组匹配 KitchinResult 类型",
)
def data_kitchin() -> str:
    _, _, results = _compute("kitchin", limit=120)
    return json.dumps(results, ensure_ascii=False)


@mcp.tool(
    name="data_juglar",
    description="朱格拉周期分析数据（阶段判定 + 原始指标）— 返回 JSON 数组",
)
def data_juglar() -> str:
    _, _, results = _compute("juglar", limit=120)
    return json.dumps(results, ensure_ascii=False)


@mcp.tool(
    name="data_kuznets",
    description="库兹涅茨周期分析数据（阶段判定 + 原始指标）— 返回 JSON 数组",
)
def data_kuznets() -> str:
    _, _, results = _compute("kuznets", limit=120)
    return json.dumps(results, ensure_ascii=False)


@mcp.tool(
    name="data_kondratiev",
    description="康波周期原始数据（世界银行跨越百年的核心经济指标）— 同 kondratiev_cycle",
)
def data_kondratiev() -> str:
    from ..shared.utils import compute_kondratiev  # 已存在的函数
    result, vals = compute_kondratiev()
    return json.dumps({"result": result, "pca1": vals}, ensure_ascii=False)


def _gen_coverage_chart(output_path: str):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.font_manager as fm

    _font_paths = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/arphic/uming.ttc",
    ]
    for _p in _font_paths:
        if Path(_p).exists():
            _fp = fm.FontProperties(fname=_p)
            plt.rcParams["font.family"] = _fp.get_name()
            break

    # Fetch actual data ranges via cached _nbs() wrapper
    from ..shared.utils import fetch_wb

    coverage = []

    # Kitchin: NBS indicators
    def _safe_range(fn):
        try:
            p, v = fn()
            if p:
                return p[0], p[-1]
        except Exception:
            pass
        return ("?", "?")

    ind_yoy = IndicatorDef(key="_", fetch_fn=_fetch_nbs_ind_yoy)
    inv_yoy = IndicatorDef(key="_", fetch_fn=_fetch_nbs_inventory_yoy)
    fix_inv = IndicatorDef(key="_", fetch_fn=_fetch_nbs_fix_inv_monthly)
    re_dev = IndicatorDef(key="_", fetch_fn=_fetch_nbs_re_dev_yoy)

    s1, e1 = _safe_range(ind_yoy.fetch)
    coverage.append(("基钦: 工业增加值", 2000 if s1 == "?" else int(s1[:4]), 2026, "#2ecc71"))
    s2, e2 = _safe_range(_fetch_nbs_inventory_yoy)
    coverage.append(("基钦: 产成品库存", 2018 if s2 == "?" else int(s2[:4]), 2026, "#27ae60"))
    s3, e3 = _safe_range(fix_inv.fetch)
    coverage.append(("基钦: 固投(辅)", 2000 if s3 == "?" else int(s3[:4]), 2026, "#1abc9c"))
    coverage.append(("基钦: PMI", 2005, 2026, "#e67e22"))
    coverage.append(("基钦: M2", 2000, 2026, "#f39c12"))

    # Juglar
    coverage.append(("朱格拉: 固投", 2000 if s3 == "?" else int(s3[:4]), 2026, "#3498db"))
    s1j, e1j = _safe_range(ind_yoy.fetch)
    coverage.append(("朱格拉: 工业增加值", 2000 if s1j == "?" else int(s1j[:4]), 2026, "#2980b9"))
    coverage.append(("朱格拉: PPI", 2011, 2026, "#9b59b6"))
    coverage.append(("朱格拉: PMI", 2005, 2026, "#8e44ad"))

    # Kuznets
    s1k, e1k = _safe_range(re_dev.fetch)
    coverage.append(("库兹涅茨: 房地产投资", 2000 if s1k == "?" else int(s1k[:4]), 2026, "#e74c3c"))
    coverage.append(("库兹涅茨: PMI", 2005, 2026, "#c0392b"))

    # Kondratiev (WB uses CacheKey internally)
    for lbl, ind in [
        ("康波: 人均GDP", "NY.GDP.PCAP.KD"),
        ("康波: 人口", "SP.POP.TOTL"),
        ("康波: 城镇化率", "SP.URB.TOTL"),
        ("康波: 通胀(GDP平减)", "NY.GDP.DEFL.KD.ZG"),
        ("康波: GDP增速", "NY.GDP.MKTP.KD.ZG"),
    ]:
        vals = fetch_wb(ind)
        if vals:
            coverage.append((lbl, vals[0][0], vals[-1][0], "#8B4513"))
        else:
            coverage.append((lbl, 1960, 2024, "#8B4513"))

    # Sort: Kondratiev first, then Kuznets, Juglar, Kitchin
    cycle_order = {"康波": 0, "库兹涅茨": 1, "朱格拉": 2, "基钦": 3}
    coverage.sort(key=lambda x: (cycle_order.get(x[0].split(":")[0], 9), x[0]))

    fig, ax = plt.subplots(figsize=(14, max(6, len(coverage) * 0.35)))
    fig.subplots_adjust(left=0.15, right=0.95, top=0.95, bottom=0.08)
    current_year = 2026

    for i, (label, start, end, color) in enumerate(coverage):
        end_actual = min(end, current_year)
        if end_actual < start:
            continue
        ax.barh(i, end_actual - start, left=start, height=0.6, color=color, alpha=0.8, edgecolor="white", linewidth=0.5)
        # Label on bar
        bar_label = f"{start}-{end_actual}"
        if end != current_year and end < current_year:
            bar_label += f" (截{end})"
        ax.text(end_actual - 0.3, i, bar_label, va="center", ha="right", fontsize=6, color="white", fontweight="bold")

    ax.set_yticks(range(len(coverage)))
    ax.set_yticklabels([c[0] for c in coverage], fontsize=8)
    ax.set_xlabel("年份", fontsize=10)
    ax.set_title("经济周期分析 — 数据覆盖甘特图", fontsize=13, fontweight="bold")
    ax.axvline(x=current_year, color="red", ls="--", lw=1, alpha=0.5)
    ax.text(current_year, len(coverage) - 0.5, " 当前", color="red", fontsize=8, va="bottom")
    ax.set_xlim(left=1955)
    ax.grid(True, axis="x", alpha=0.3)

    # Add cycle group labels
    cycle_groups = {"康波": (0, 999), "库兹涅茨": (999, 999), "朱格拉": (999, 999), "基钦": (999, 999)}
    for i, (label, _, _, _) in enumerate(coverage):
        prefix = label.split(":")[0]
        if prefix in cycle_groups:
            s, e = cycle_groups[prefix]
            cycle_groups[prefix] = (min(s, i), max(e, i))

    y_pos = len(coverage)
    for prefix, (s, e) in sorted(cycle_groups.items(), key=lambda x: x[1][0]):
        if e >= s:
            mid = (s + e) / 2
            ax.annotate(prefix, xy=(0.01, mid), xycoords=("axes fraction", "data"),
                        fontsize=10, fontweight="bold", ha="left", va="center",
                        rotation=0, color="#555")

    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


# ── 图表函数 ──────────────────────────────────

def _gen_kitchin_chart(results: list[dict], data: dict, output_path: str):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    from matplotlib.patches import Patch
    import matplotlib.font_manager as fm

    _font_paths = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/arphic/uming.ttc",
    ]
    for _p in _font_paths:
        if Path(_p).exists():
            _fp = fm.FontProperties(fname=_p)
            plt.rcParams["font.family"] = _fp.get_name()
            break

    STAGE_NAMES = {1: "主动去库存", 2: "被动去库存", 3: "主动补库存", 4: "被动补库存"}
    periods = [r["period"] for r in results]
    dates = [_p2date(p) for p in periods]
    demand_vals = [r.get("demand_yoy") for r in results]
    inventory_vals = [r.get("inventory_yoy") for r in results]
    ppi_vals = [r.get("pmi") for r in results]
    real_inv_vals = [r.get("real_inventory_yoy") for r in results]
    pmi_vals = [r.get("pmi") for r in results]
    m2_vals = [r.get("m2_yoy") for r in results]
    stages = [r["stage"] for r in results]

    stage_colors = {1: "#e74c3c", 2: "#2ecc71", 3: "#f39c12", 4: "#3498db"}
    fig, axes = plt.subplots(2, 2, figsize=(16, 10))
    fig.suptitle("基钦周期(库存周期)定位分析", fontsize=15, fontweight="bold", y=1.02)

    ax1 = axes[0, 0]
    ax1t = ax1.twinx()
    current_stage = None
    stage_start = 0
    sr = []
    for i, s in enumerate(stages + [0]):
        if s != current_stage:
            if current_stage is not None and current_stage != 0:
                sr.append((stage_start, i, current_stage))
            current_stage = s
            stage_start = i
        if i == len(stages):
            break
    for ss, se, s in sr:
        ax1.axvspan(dates[ss], dates[min(se, len(dates) - 1)], alpha=0.12, color=stage_colors.get(s, "#ccc"))
    vd = [(d, v) for d, v in zip(dates, demand_vals) if v is not None]
    if vd:
        ax1.plot([x[0] for x in vd], [x[1] for x in vd], color="#2c3e50", lw=1.8, marker=".", ms=2, label="工业增加值同比%")
    vi = [(d, v) for d, v in zip(dates, inventory_vals) if v is not None]
    if vi:
        ax1t.plot([x[0] for x in vi], [x[1] for x in vi], color="#e67e22", lw=1.8, marker=".", ms=2, label="产成品存货同比%")
    vri = [(d, v) for d, v in zip(dates, real_inv_vals) if v is not None]
    if vri:
        ax1t.plot([x[0] for x in vri], [x[1] for x in vri], color="#e67e22", lw=0.8, alpha=0.5, ls="--", label="实际库存")
    ax1.axhline(0, color="#888", lw=0.5, ls="--")
    ax1t.axhline(0, color="#888", lw=0.5, ls="--")
    ax1.set_ylabel("工业增加值同比%", color="#2c3e50")
    ax1t.set_ylabel("库存同比%", color="#e67e22")

    ax2 = axes[0, 1]
    vp = [(d, v) for d, v in zip(dates, pmi_vals) if v is not None]
    if vp:
        ax2.plot([x[0] for x in vp], [x[1] for x in vp], color="#27ae60", lw=1.5, marker=".", ms=2, label="制造业PMI")
    ax2.axhline(50, color="#e74c3c", lw=1, ls="--", alpha=0.7, label="荣枯线(50)")
    ax2.set_ylabel("PMI")
    ax2.legend(loc="lower right", fontsize=8)
    ax2.grid(True, alpha=0.3, ls="--", lw=0.5)
    ax2.set_title("PMI 制造业趋势")

    ax3 = axes[1, 0]
    ax3t = ax3.twinx()
    vri2 = [(d, v) for d, v in zip(dates, real_inv_vals) if v is not None]
    if vri2:
        ax3.plot([x[0] for x in vri2], [x[1] for x in vri2], color="#e67e22", lw=1.5, marker=".", ms=2, label="实际库存同比%")
    vpp = [(d, v) for d, v in zip(dates, ppi_vals) if v is not None]
    if vpp:
        ax3t.plot([x[0] for x in vpp], [x[1] for x in vpp], color="#8e44ad", lw=1.5, marker=".", ms=2, label="PPI指数")
    ax3.axhline(0, color="#888", lw=0.5, ls="--")
    ax3t.axhline(100, color="#888", lw=0.5, ls="--")
    ax3.set_ylabel("实际库存同比%", color="#e67e22")
    ax3t.set_ylabel("PPI指数", color="#8e44ad")

    ax4 = axes[1, 1]
    vm = [(d, v) for d, v in zip(dates, m2_vals) if v is not None]
    if vm:
        ax4.plot([x[0] for x in vm], [x[1] for x in vm], color="#2980b9", lw=1.5, marker=".", ms=2, label="M2同比%")
    ax4.set_ylabel("M2同比%", color="#2980b9")

    for ax in axes.flat:
        ax.xaxis.set_major_locator(mdates.YearLocator(2))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        ax.tick_params(axis="x", rotation=45, labelsize=8)

    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()


def _gen_juglar_chart(results: list[dict], data: dict, output_path: str):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    from matplotlib.patches import Patch
    import matplotlib.font_manager as fm

    _font_paths = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/arphic/uming.ttc",
    ]
    for _p in _font_paths:
        if Path(_p).exists():
            _fp = fm.FontProperties(fname=_p)
            plt.rcParams["font.family"] = _fp.get_name()
            break

    PHASE_NAMES = {1: "复苏期", 2: "繁荣期", 3: "衰退期", 4: "萧条期"}
    periods = [r["period"] for r in results]
    dates = [_p2date(p) for p in periods]
    equip = [r.get("fix_inv_yoy") for r in results]
    pmi = [r.get("pmi") for r in results]
    ppi = [r.get("ppi_yoy") for r in results]
    phases = [r["phase"] for r in results]

    phase_colors = {1: "#2ecc71", 2: "#f39c12", 3: "#e74c3c", 4: "#3498db"}
    fig, axes = plt.subplots(2, 2, figsize=(16, 10))
    fig.suptitle("朱格拉周期(固定资本投资周期)定位分析", fontsize=15, fontweight="bold", y=1.02)

    ax1 = axes[0, 0]
    ax1t = ax1.twinx()
    current_p = None
    ps_start = 0
    sr = []
    for i, s in enumerate(phases + [0]):
        if s != current_p:
            if current_p is not None and current_p != 0:
                sr.append((ps_start, i, current_p))
            current_p = s
            ps_start = i
        if i == len(phases):
            break
    for ss, se, s in sr:
        ax1.axvspan(dates[ss], dates[min(se, len(dates) - 1)], alpha=0.12, color=phase_colors.get(s, "#ccc"))
    veq = [(d, v) for d, v in zip(dates, equip) if v is not None]
    if veq:
        ax1.plot([x[0] for x in veq], [x[1] for x in veq], color="#2c3e50", lw=2, marker=".", ms=3, label="固投同比%")
    ax1.axhline(0, color="#888", lw=0.5, ls="--")
    ax1.set_ylabel("固投同比%", color="#2c3e50")
    h1, l1 = ax1.get_legend_handles_labels()
    sh = [Patch(facecolor=phase_colors[s], alpha=0.3, label=PHASE_NAMES[s]) for s in [1, 2, 3, 4]]
    ax1.legend(h1 + sh, l1 + [PHASE_NAMES[s] for s in [1, 2, 3, 4]], loc="upper left", fontsize=7, ncol=2)
    ax1.grid(True, alpha=0.3, ls="--", lw=0.5)
    ax1.set_title("固投 (阶段着色)")

    ax2 = axes[0, 1]
    ax2t = ax2.twinx()
    vpp = [(d, v) for d, v in zip(dates, ppi) if v is not None]
    if vpp:
        ax2.plot([x[0] for x in vpp], [x[1] for x in vpp], color="#c0392b", lw=1.5, marker=".", ms=2, label="PPI指数")
    vpmi = [(d, v) for d, v in zip(dates, pmi) if v is not None]
    if vpmi:
        ax2t.plot([x[0] for x in vpmi], [x[1] for x in vpmi], color="#27ae60", lw=1.5, marker=".", ms=2, label="制造业PMI")
    ax2.axhline(100, color="#888", lw=0.5, ls="--")
    ax2t.axhline(50, color="#e74c3c", lw=1, ls="--", alpha=0.7)
    ax2.set_ylabel("PPI指数", color="#c0392b")
    ax2t.set_ylabel("PMI", color="#27ae60")
    ax2.grid(True, alpha=0.3, ls="--", lw=0.5)
    ax2.set_title("PPI vs PMI")

    ax3 = axes[1, 0]
    ax4 = axes[1, 1]
    ax4.text(0.5, 0.5, "数据源限制：详细固投分项\n（设备/制造业/新建/扩建/改建）\n需 NBS API，当前仅显示总量", ha="center", va="center", transform=ax4.transAxes, fontsize=10, color="#888")
    ax4.set_title("固投细项占位")

    for ax in axes.flat:
        ax.xaxis.set_major_locator(mdates.YearLocator(2))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        ax.tick_params(axis="x", rotation=45, labelsize=8)

    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()


def _gen_kuznets_chart(results: list[dict], data: dict, output_path: str):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    from matplotlib.patches import Patch
    import matplotlib.font_manager as fm

    _font_paths = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/arphic/uming.ttc",
    ]
    for _p in _font_paths:
        if Path(_p).exists():
            _fp = fm.FontProperties(fname=_p)
            plt.rcParams["font.family"] = _fp.get_name()
            break

    PHASE_NAMES = {1: "复苏期", 2: "繁荣期", 3: "衰退期", 4: "萧条期"}
    periods = [r["period"] for r in results]
    dates = [_p2date(p) for p in periods]
    re_sale = [r.get("re_yoy") for r in results]
    pmi = [r.get("pmi") for r in results]
    phases = [r["phase"] for r in results]

    phase_colors = {1: "#2ecc71", 2: "#f39c12", 3: "#e74c3c", 4: "#3498db"}
    fig, axes = plt.subplots(2, 1, figsize=(14, 10))
    fig.suptitle("库兹涅茨周期(房地产周期)定位分析", fontsize=15, fontweight="bold", y=1.02)

    ax1 = axes[0]
    current_p = None
    ps_start = 0
    sr = []
    for i, s in enumerate(phases + [0]):
        if s != current_p:
            if current_p is not None and current_p != 0:
                sr.append((ps_start, i, current_p))
            current_p = s
            ps_start = i
        if i == len(phases):
            break
    for ss, se, s in sr:
        ax1.axvspan(dates[ss], dates[min(se, len(dates) - 1)], alpha=0.12, color=phase_colors.get(s, "#ccc"))
    vs = [(d, v) for d, v in zip(dates, re_sale) if v is not None]
    if vs:
        ax1.plot([x[0] for x in vs], [x[1] for x in vs], color="#2c3e50", lw=2, marker=".", ms=3, label="房地产开发投资累计增长%")
    ax1.axhline(0, color="#888", lw=0.5, ls="--")
    ax1.set_ylabel("累计增长%", color="#2c3e50")
    ax1.grid(True, alpha=0.3, ls="--", lw=0.5)
    ax1.set_title("房地产开发投资 (阶段着色)")

    ax2 = axes[1]
    vp = [(d, v) for d, v in zip(dates, pmi) if v is not None]
    if vp:
        ax2.plot([x[0] for x in vp], [x[1] for x in vp], color="#27ae60", lw=1.5, marker=".", ms=2, label="制造业PMI")
    ax2.axhline(50, color="#e74c3c", lw=1, ls="--", alpha=0.7, label="荣枯线(50)")
    ax2.set_ylabel("PMI")
    ax2.legend(loc="lower right", fontsize=8)
    ax2.grid(True, alpha=0.3, ls="--", lw=0.5)
    ax2.set_title("PMI 制造业趋势")

    for ax in axes.flat:
        ax.xaxis.set_major_locator(mdates.YearLocator(2))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        ax.tick_params(axis="x", rotation=45, labelsize=8)

    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()


def _gen_kondratiev_chart(result: dict, vals: list, output_path: str):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch
    import matplotlib.font_manager as fm

    _font_paths = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/arphic/uming.ttc",
    ]
    for _p in _font_paths:
        if Path(_p).exists():
            _fp = fm.FontProperties(fname=_p)
            plt.rcParams["font.family"] = _fp.get_name()
            break

    years = result.get("years", [])
    pca1 = vals
    dp = result.get("dominant_period")
    ph = result.get("phase", 0)
    phase_labels = ["未知", "复苏(繁荣初期)", "繁荣(顶峰)", "衰退(下降期)", "萧条(谷底)"]
    phase_colors = {1: "#2ecc71", 2: "#f39c12", 3: "#e74c3c", 4: "#3498db"}

    fig, ax = plt.subplots(figsize=(14, 7))

    # Fill phase regions on top axis
    mu = float(np.mean(pca1))
    sigma = float(np.std(pca1))

    # Phase shading by slope
    for i in range(1, len(years)):
        y_slope = pca1[i] - pca1[i - 1]
        y_val = pca1[i]
        if y_val > mu and y_slope < 0:
            color = phase_colors.get(3, "#e74c3c")  # 衰退
            alpha = 0.15
        elif y_val < mu and y_slope < 0:
            color = phase_colors.get(4, "#3498db")  # 萧条
            alpha = 0.12
        elif y_val < mu and y_slope > 0:
            color = phase_colors.get(1, "#2ecc71")  # 复苏
            alpha = 0.12
        else:
            color = phase_colors.get(2, "#f39c12")  # 繁荣
            alpha = 0.15
        ax.axvspan(years[i - 1], years[i], alpha=alpha, color=color)

    # PCA1 line
    ax.plot(years, pca1, "b-", lw=2, marker=".", ms=4, label="PCA综合指数(去趋势)")
    ax.axhline(mu, color="#888", lw=0.5, ls="--", alpha=0.6)
    ax.axhline(mu + sigma, color="#aaa", lw=0.5, ls=":", alpha=0.4)
    ax.axhline(mu - sigma, color="#aaa", lw=0.5, ls=":", alpha=0.4)
    ax.axvline(x=years[-1], color="gray", ls="--", alpha=0.5)

    # Annotate peaks/troughs
    from scipy.signal import argrelextrema
    peaks = argrelextrema(np.array(pca1), np.greater, order=4)[0]
    troughs = argrelextrema(np.array(pca1), np.less, order=4)[0]
    for p in peaks:
        ax.annotate(f"{years[p]}", (years[p], pca1[p]), xytext=(0, 10),
                    textcoords="offset points", ha="center", fontsize=7, color="orange", fontweight="bold")
    for t in troughs:
        ax.annotate(f"{years[t]}", (years[t], pca1[t]), xytext=(0, -12),
                    textcoords="offset points", ha="center", fontsize=7, color="blue", fontweight="bold")

    # Legend
    legend_patches = [
        Patch(facecolor=phase_colors[1], alpha=0.3, label="复苏期(↑<μ)"),
        Patch(facecolor=phase_colors[2], alpha=0.3, label="繁荣期(↑>μ)"),
        Patch(facecolor=phase_colors[3], alpha=0.3, label="衰退期(↓>μ)"),
        Patch(facecolor=phase_colors[4], alpha=0.3, label="萧条期(↓<μ)"),
    ]
    ax.legend(handles=legend_patches, loc="upper left", fontsize=7, ncol=2)

    # Title and info
    title = f"康波周期 — PCA综合指数 (指标: {', '.join(result.get('indicators_used', []))})"
    if dp:
        title += f" | 主周期 ~{dp:.0f}年"
    ax.set_title(title, fontsize=12)
    ax.set_ylabel("标准化得分")
    ax.set_xlabel("年份")
    ax.grid(True, alpha=0.3)

    info = (
        f"数据: 世界银行({result.get('year_range','?')})  PCA方差占比: {result.get('pca_variance_ratio',0)*100:.0f}%\n"
        f"当前: {phase_labels[ph]}  相位置信度: {result.get('phase_confidence',0):.2f}"
    )
    ax.text(0.02, 0.02, info, transform=ax.transAxes, fontsize=8, verticalalignment="bottom",
            bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.6))

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


# ═══════════════════════════════════════════════════════════════
# NBS API 客户端 — 内联自 workspace/cycles/scripts/nbs_client.py
# 国家统计局新版 API V2.0
# 三步走: 搜索→cid → queryIndicatorsByCid → indicatorId → getEsDataByCidAndDt → 数据
# ═══════════════════════════════════════════════════════════════

_NBS_BASE_URL = "https://data.stats.gov.cn/dg/website/publicrelease/web/external"
_NBS_ROOT_IDS = {
    1: "fc982599aa684be7969d7b90b1bd0e84",
    2: "a94b8b7365a94874968cabbe392cf679",
    3: "1dcdcab5f2c6476aa8cd5e5dca351159",
}
_NBS_CACHE_DIR = Path.home() / ".cache" / "deep_fusion" / "nbs"
_NBS_REQUEST_INTERVAL = 0.6


class _NbsClient:
    __shared: "_NbsClient | None" = None

    def __new__(cls, *args, **kwargs):
        if cls.__shared is None:
            cls.__shared = super().__new__(cls)
        return cls.__shared

    def __init__(self, cid_dir: str | Path | None = None):
        if hasattr(self, "_initialized"):
            return
        self._initialized = True
        self.cache_dir = _NBS_CACHE_DIR
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        })
        self._session.trust_env = False
        self._last_request = 0.0
        self._cid_index: list[dict] | None = None
        self._cid_dir = Path(cid_dir) if cid_dir else (Path(__file__).resolve().parent.parent / "shared" / "data")

    def _rate_limit(self):
        elapsed = time.time() - self._last_request
        if elapsed < _NBS_REQUEST_INTERVAL:
            time.sleep(_NBS_REQUEST_INTERVAL - elapsed)
        self._last_request = time.time()

    def _cache_get(self, key: str, ttl: int) -> dict | None:
        path = self.cache_dir / f"{key}.json"
        if path.exists():
            age = time.time() - path.stat().st_mtime
            if age < ttl:
                return json.loads(path.read_text(encoding="utf-8"))
        return None

    def _cache_set(self, key: str, data):
        path = self.cache_dir / f"{key}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, default=str), encoding="utf-8")

    def _load_cid_index(self):
        if self._cid_index is not None:
            return
        self._cid_index = []
        for fname in ["nbs_cids_monthly.json", "nbs_cids_quarterly.json", "nbs_cids_annual.json"]:
            path = self._cid_dir / fname
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8"))
                freq = "月度" if "monthly" in fname else ("季度" if "quarterly" in fname else "年度")
                for item in data:
                    self._cid_index.append({
                        "cid": item.get("id", ""),
                        "name": item.get("name", ""),
                        "freq": freq,
                        "sdate": item.get("sdate"),
                        "edate": item.get("edate"),
                        "treeinfo_globalid": item.get("treeinfo_globalid", ""),
                    })

    def search(self, keyword: str, freq: str = "") -> list[dict]:
        self._load_cid_index()
        if self._cid_index is None:
            return []
        results = []
        for item in self._cid_index:
            if keyword in item["name"]:
                if freq and item["freq"] != freq:
                    continue
                results.append(dict(item))
        return results

    def get_tree_children(self, pid: str = "", code: str = "1") -> list[dict]:
        self._rate_limit()
        resp = self._session.get(
            f"{_NBS_BASE_URL}/new/queryIndexTreeAsync",
            params={"pid": pid, "code": code},
            timeout=15,
        )
        nodes = resp.json().get("data", [])
        results = []
        for node in nodes:
            results.append({
                "cid": node.get("_id", ""),
                "name": node.get("name", ""),
                "isLeaf": node.get("isLeaf", False),
                "sdate": node.get("sdate"),
                "edate": node.get("edate"),
                "treeinfo_globalid": node.get("treeinfo_globalid", ""),
            })
        return results

    def find_cid_by_path(self, path: list[str], code: str = "1") -> str | None:
        pid = ""
        current = self.get_tree_children(pid, code)
        for segment in path:
            matched = [n for n in current if segment in n["name"]]
            if not matched:
                return None
            node = matched[0]
            if node["isLeaf"] or segment == path[-1]:
                return node["cid"]
            pid = node["cid"]
            current = self.get_tree_children(pid, code)
        return None

    def get_indicators(self, cid: str, use_cache: bool = True) -> list[dict]:
        cache_key = f"indicators_{cid}"
        if use_cache:
            cached = self._cache_get(cache_key, ttl=86400)
            if cached:
                return cached
        self._rate_limit()
        resp = self._session.get(
            f"{_NBS_BASE_URL}/new/queryIndicatorsByCid",
            params={"cid": cid},
            timeout=15,
        )
        data = resp.json()
        if not data.get("success"):
            return []
        indicators = data["data"].get("list", [])
        self._cache_set(cache_key, indicators)
        return indicators

    def find_indicator(self, cid: str, keyword: str, use_cache: bool = True) -> dict | None:
        indicators = self.get_indicators(cid, use_cache=use_cache)
        for ind in indicators:
            if keyword in ind.get("i_showname", ""):
                return ind
        return None

    def find_indicators(self, cid: str, keyword: str, use_cache: bool = True) -> list[dict]:
        indicators = self.get_indicators(cid, use_cache=use_cache)
        return [ind for ind in indicators if keyword in ind.get("i_showname", "")]

    def fetch_data(
        self,
        cid: str,
        indicator_ids: list[str],
        start: str = "2020",
        end: str = "",
        region: list[dict] | None = None,
        freq: str = "MM",
    ) -> pd.DataFrame:
        if region is None:
            region = [{"text": "全国", "value": "000000000000"}]
        if not end:
            end = datetime.now().strftime("%Y%m")
        suffix = {"MM": "MM", "SS": "SS", "YY": "YY"}.get(freq, "MM")
        dt_range = f"{start}01{suffix}-{end}{suffix}"
        root_id = _NBS_ROOT_IDS.get({"MM": 1, "SS": 2, "YY": 3}.get(freq, 1), _NBS_ROOT_IDS[1])
        payload = {
            "cid": cid,
            "indicatorIds": indicator_ids,
            "das": region,
            "dts": [dt_range],
            "showType": "1",
            "rootId": root_id,
        }
        self._rate_limit()
        resp = self._session.post(
            f"{_NBS_BASE_URL}/getEsDataByCidAndDt",
            json=payload,
            timeout=30,
        )
        data = resp.json()
        if not data.get("success"):
            raise Exception(f"NBS API 失败: {data.get('message', '未知错误')}")
        records = data.get("data", [])
        if not records:
            return pd.DataFrame()
        rows = []
        for rec in records:
            row = {"period": rec.get("code", ""), "period_name": rec.get("name", "")}
            for val in rec.get("values", []):
                col_name = val.get("i_showname", val.get("_id", ""))
                row[col_name] = val.get("value")
                if "i_mark" not in row and val.get("i_mark"):
                    row["_口径_"] = val["i_mark"]
            rows.append(row)
        df = pd.DataFrame(rows)
        for col in df.columns:
            if col in ("period", "period_name", "_口径_"):
                continue
            df[col] = pd.to_numeric(df[col], errors="coerce")
        return df

    def fetch_merged(
        self,
        cid_indicator_pairs: list[tuple[str, str]],
        cid_date_ranges: list[tuple[str | None, str | None]] | None = None,
        start: str = "2000",
        end: str = "",
        freq: str = "MM",
    ) -> pd.DataFrame:
        all_frames = []
        for i, (cid, ind_id) in enumerate(cid_indicator_pairs):
            df = self.fetch_data(cid, [ind_id], start=start, end=end, freq=freq)
            if df is not None and not df.empty:
                val_cols = [c for c in df.columns if c not in ("period", "period_name", "_口径_")]
                if val_cols:
                    df = df[["period"] + val_cols]
                    sdate = cid_date_ranges[i][0] if cid_date_ranges else None
                    edate = cid_date_ranges[i][1] if cid_date_ranges else None
                    df["_sdate"] = sdate or ""
                    df["_edate"] = edate or ""
                    all_frames.append(df)
        if not all_frames:
            return pd.DataFrame()
        stacked = pd.concat(all_frames, ignore_index=True)
        val_col = [c for c in stacked.columns if c not in ("period", "_sdate", "_edate")][0]
        periods = sorted(stacked["period"].unique())
        rows = []
        for p in periods:
            subset = stacked[stacked["period"] == p]
            if subset.empty:
                continue
            candidates = []
            for _, row in subset.iterrows():
                v = row[val_col]
                if pd.isna(v):
                    continue
                sd = str(row["_sdate"]).strip()
                ed = str(row["_edate"]).strip()
                p_num = int(str(p)[:6])
                in_range = True
                if sd and sd != "None":
                    in_range = in_range and p_num >= int(sd.replace("-", "")[:6])
                if ed and ed != "None" and str(ed) != "None":
                    in_range = in_range and p_num <= int(ed.replace("-", "")[:6])
                candidates.append((v, in_range, sd, ed))
            if candidates:
                valid = [c for c in candidates if c[1]]
                if valid:
                    rows.append({"period": p, val_col: valid[-1][0]})
                else:
                    rows.append({"period": p, val_col: candidates[0][0]})
        result = pd.DataFrame(rows) if rows else pd.DataFrame(columns=["period", val_col])
        return result

    def search_and_fetch(
        self,
        keyword: str,
        indicator_keyword: str = "增减",
        start: str = "2000",
        end: str = "",
        freq: str = "MM",
    ) -> pd.DataFrame | None:
        candidates = self.search(keyword, freq={"MM": "月度", "SS": "季度", "YY": "年度"}.get(freq, ""))
        if not candidates:
            return None
        cid_infos = []
        for c in candidates:
            indicators = self.get_indicators(c["cid"])
            matched = [i for i in indicators if indicator_keyword in (i.get("i_showname") or "")]
            if matched:
                cid_infos.append({
                    "cid": c["cid"],
                    "name": c["name"],
                    "sdate": c.get("sdate"),
                    "edate": c.get("edate"),
                    "indicator": matched[0],
                })
        if not cid_infos:
            return None

        def _sort_key(x):
            s = x.get("sdate")
            return int(s) if s else 9999
        cid_infos.sort(key=_sort_key)
        pairs = [(ci["cid"], ci["indicator"]["_id"]) for ci in cid_infos]
        date_ranges = [(ci.get("sdate"), ci.get("edate")) for ci in cid_infos]
        return self.fetch_merged(pairs, cid_date_ranges=date_ranges, start=start, end=end, freq=freq)

    def clear_cache(self):
        for f in self.cache_dir.glob("*.json"):
            f.unlink()

    def cache_size(self) -> int:
        return sum(f.stat().st_size for f in self.cache_dir.glob("*.json"))


def _get_nbs_client():
    return _NbsClient()


def _clean_df(df) -> tuple[list[str], list[float]]:
    if df is None or df.empty:
        return [], []
    periods = [p[:6] for p in df["period"].tolist()]
    val_col = [c for c in df.columns if c not in ("period",)][0]
    values = df[val_col].tolist()
    clean_p, clean_v = [], []
    for p, v in zip(periods, values):
        if v is not None and np.isfinite(v):
            clean_p.append(p)
            clean_v.append(float(v))
    return clean_p, clean_v


def _fetch_by_indicator_name(
    dataset_keyword: str,
    indicator_name: str,
    freq: str = "MM",
    start: str = "2000",
) -> pd.DataFrame | None:
    client = _get_nbs_client()
    cids = client.search(dataset_keyword)
    if not cids:
        return None
    cid_infos = []
    for c in cids:
        indicators = client.get_indicators(c["cid"])
        for ind in indicators:
            name = ind.get("i_showname", "")
            if name == indicator_name or name.startswith(indicator_name):
                cid_infos.append({
                    "cid": c["cid"],
                    "name": c["name"],
                    "sdate": c.get("sdate"),
                    "edate": c.get("edate"),
                    "indicator": ind,
                })
                break
    if not cid_infos:
        return None
    cid_infos.sort(key=lambda x: int(x.get("sdate") or 0) if x.get("sdate") and x["sdate"].lstrip("-").isdigit() else 9999)
    pairs = [(ci["cid"], ci["indicator"]["_id"]) for ci in cid_infos]
    date_ranges = [(ci.get("sdate"), ci.get("edate")) for ci in cid_infos]
    return client.fetch_merged(pairs, cid_date_ranges=date_ranges, start=start, end="", freq=freq)


def _fetch_nbs_inventory_yoy() -> tuple[list[str], list[float]]:
    return _clean_df(_get_nbs_client().search_and_fetch("产成品存货", "增减"))


def _fetch_nbs_ind_yoy() -> tuple[list[str], list[float]]:
    return _clean_df(_get_nbs_client().search_and_fetch("规上工业增加值增长速度", "同比增长"))


def _fetch_nbs_fix_inv_monthly() -> tuple[list[str], list[float]]:
    return _clean_df(_get_nbs_client().search_and_fetch("固定资产投资概况", "累计增长"))


def _fetch_nbs_re_dev_yoy() -> tuple[list[str], list[float]]:
    return _clean_df(_get_nbs_client().search_and_fetch("房地产开发投资情况", "累计增长"))


def _fetch_nbs_cpi_yoy() -> tuple[list[str], list[float]]:
    return _clean_df(_fetch_by_indicator_name(
        "全国居民消费价格分类指数 (上年同月=100)",
        "居民消费价格指数 (上年同月=100)",
    ))


def _fetch_nbs_ppi_yoy() -> tuple[list[str], list[float]]:
    return _clean_df(_fetch_by_indicator_name(
        "工业生产者出厂价格指数 (上年同月=100)",
        "工业生产者出厂价格指数 (上年同月=100)",
    ))


def _fetch_nbs_gdp_quarterly() -> tuple[list[str], list[float]]:
    try:
        df = _fetch_by_indicator_name(
            "国内生产总值指数",
            "国内生产总值指数 (上年同期=100) 当季值",
            freq="SS",
        )
        if df is not None:
            val_col = [c for c in df.columns if c not in ("period",)][0]
            df[val_col] = df[val_col] - 100
        return _clean_df(df)
    except Exception:
        return [], []


def _fetch_nbs_unemployment() -> tuple[list[str], list[float]]:
    return _clean_df(_get_nbs_client().search_and_fetch("城镇调查失业率", "失业率"))
