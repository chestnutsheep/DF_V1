"""频谱分析 MCP 工具 — 数据由调用者提供，不绑定任何数据源。"""
from io import StringIO
from typing import Any

import pandas as pd
from pydantic import Field

from ..server import mcp
from ..analysis.spectral.engine import run_spectral_detection, run_cf_bandpass, METHOD_MAP


@mcp.tool(
    name="cycle_detect",
    description="频谱周期检测：对输入时间序列运行 FFT/ACF/小波/MUSIC 等频谱分析+三级投票，输出检测到的周期、置信度和当前相位",
)
def cycle_detect(
    data_csv: str = Field(
        description="CSV格式时间序列，至少包含两列: period(时间标签), value(数值)。示例:\nperiod,value\n2000,100\n2001,102\n..."
    ),
    methods: str = Field(
        "fft,acf,wavelet,music",
        description="检测方法，逗号分隔，可选: fft, acf, wavelet, emd, lomb, music, esprit, mem",
    ),
    target_low: float = Field(3, description="目标周期下限（与输入数据单位一致，年/月/日）"),
    target_high: float = Field(100, description="目标周期上限"),
) -> str:
    try:
        df = pd.read_csv(StringIO(data_csv))
    except Exception as e:
        return f"CSV解析失败: {e}"

    if df.empty:
        return "数据为空"

    # 找 value 列
    val_col = None
    for c in ["value", "val", "close", "price", "指数", "值"]:
        if c in df.columns:
            val_col = c
            break
    if val_col is None:
        val_col = df.columns[-1]  # 最后一列

    values = df[val_col].dropna().tolist()
    if len(values) < 10:
        return f"数据太少 ({len(values)}个)，至少需要10个样本"

    method_list = [m.strip() for m in methods.split(",") if m.strip() in METHOD_MAP]
    if not method_list:
        method_list = ["fft", "acf", "wavelet", "music"]

    result = run_spectral_detection(
        values, methods=method_list, target_band=(target_low, target_high)
    )

    lines = ["=== 频谱周期检测报告 ===", f"方法: {', '.join(method_list)}", f"样本数: {len(values)}", ""]

    # 个体结果
    lines.append("── 各方法检测结果 ──")
    for key, info in result["individual_results"].items():
        if "error" in info:
            lines.append(f"  {info['label']:15s} ❌ {info['error']}")
        else:
            p = info.get("period")
            c = info.get("confidence", 0)
            ok = "✅" if info.get("success") else "⚠️"
            p_str = f"{p:.1f}" if p else "—"
            lines.append(f"  {info['label']:15s} 周期={p_str:>8}  置信度={c:.2f}  {ok}")

    # 投票结果
    vp = result.get("voting_period")
    if vp:
        lines.append("")
        lines.append(f"三级加权投票 → 主周期: {vp:.1f}")
        for p, w, n in result.get("voters", []):
            lines.append(f"  {n}: {p:.1f}年 (权重={w:.2f})")
    else:
        lines.append("")
        lines.append("三级投票: 有效票数不足")

    # 当前相位
    ph = result.get("phase", {})
    lines.append("")
    lines.append("── 当前相位 ──")
    lines.append(f"  阶段: {ph.get('name', '—')} (#{ph.get('number')})")
    lines.append(f"  置信度: {ph.get('confidence', 0):.2f}")

    cur = result.get("current", {})
    lines.append(f"  PC1值: {cur.get('value', 0):+.4f}")
    lines.append(f"  方向: {cur.get('direction', '—')}")
    lines.append(f"  周期强度: {cur.get('cycle_strength', 0):.4f}")

    return "\n".join(lines)


@mcp.tool(
    name="cycle_phase",
    description="周期相位判断：对输入时间序列运行 CF 带通滤波 + 相位推断，判断当前处于周期哪个阶段",
)
def cycle_phase(
    data_csv: str = Field(
        description="CSV格式时间序列，包含 period,value 两列"
    ),
    low_yr: float = Field(40, description="带通滤波低端（年）"),
    high_yr: float = Field(70, description="带通滤波高端（年）"),
) -> str:
    try:
        df = pd.read_csv(StringIO(data_csv))
    except Exception as e:
        return f"CSV解析失败: {e}"

    if df.empty:
        return "数据为空"

    val_col = None
    for c in ["value", "val", "close", "price", "指数", "值"]:
        if c in df.columns:
            val_col = c
            break
    if val_col is None:
        val_col = df.columns[-1]

    values = df[val_col].dropna().tolist()
    if len(values) < 20:
        return f"数据太少 ({len(values)}个)"

    result = run_cf_bandpass(values, low_yr, high_yr)
    ph = result["phase"]

    return (
        f"=== 周期相位判断 (CF {low_yr:.0f}-{high_yr:.0f}) ===\n"
        f"阶段: {ph['name']} (#{ph['number']})\n"
        f"置信度: {ph['confidence']:.2f}\n"
        f"PC1当前值: {result['current_value']:+.4f}\n"
        f"方向: {result['direction']}\n"
        f"周期强度: {result['cycle_strength']:.4f}"
    )
