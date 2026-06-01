"""频谱分析引擎：封装 shared/spectral 的 8 种方法 + 三级投票 + 相位推断。

不依赖任何特定数据源，接收 numpy array 或 list 作为输入。
"""
from __future__ import annotations

from typing import Any

import numpy as np

from ...shared.spectral import (
    _fft_psd_period,
    _acf_period,
    _wavelet_period,
    _emd_period,
    _lomb_scargle_period,
    _music_period,
    _esprit_period,
    _mem_period,
    ThreeLevelVoter,
    phase_from_waveform,
    cf_bandpass,
)


METHOD_MAP = {
    "fft": ("FFT", _fft_psd_period),
    "acf": ("ACF", _acf_period),
    "wavelet": ("小波", _wavelet_period),
    "emd": ("EMD", _emd_period),
    "lomb": ("Lomb-Scargle", _lomb_scargle_period),
    "music": ("MUSIC", _music_period),
    "esprit": ("ESPRIT", _esprit_period),
    "mem": ("MEM", _mem_period),
}

DEFAULT_METHODS = ["fft", "acf", "wavelet", "music"]


def run_spectral_detection(
    series: list[float],
    methods: list[str] | None = None,
    target_band: tuple[float, float] = (3, 100),
) -> dict[str, Any]:
    """对输入序列运行多频谱周期检测。

    Args:
        series: 时间序列（等间距，推荐年/月/日频）
        methods: 方法名列表，默认 ['fft','acf','wavelet','music']
        target_band: (低, 高) 周期范围（年/月/日，与序列单位一致）

    Returns:
        dict: {
            'individual_results': {方法名: {period, confidence, ...}},
            'voting_result': 三级投票主周期,
            'voters': [(周期, 权重, 方法名), ...],
            'phase': 当前相位,
            'current_value': PC1当前值,
            'direction': 上升/下降,
        }
    """
    arr = np.asarray(series, dtype=np.float64)
    arr_z = (arr - arr.mean()) / (arr.std() + 1e-12)

    if methods is None:
        methods = DEFAULT_METHODS

    individual = {}
    voters = []

    for key in methods:
        if key not in METHOD_MAP:
            continue
        label, fn = METHOD_MAP[key]
        try:
            result = fn(arr_z)
            period = result.get("period") or result.get("dominant_period")
            conf = result.get("confidence", 0)
            success = result.get("success", False)

            individual[key] = {
                "label": label,
                "period": round(period, 2) if period else None,
                "confidence": round(conf, 4),
                "success": success,
            }

            if period and conf > 0.3 and success:
                voters.append((period, conf, label))
        except Exception as e:
            individual[key] = {"label": label, "error": str(e)[:60]}

    # 三级投票
    voting_result = None
    if len(voters) >= 2:
        try:
            voter = ThreeLevelVoter()
            voting_result = voter.vote(voters)
            if isinstance(voting_result, dict):
                voting_result = voting_result.get("period") or voting_result.get(
                    "dominant_period"
                )
        except Exception:
            # fallback: 简单加权平均
            total_w = sum(w for _, w, _ in voters)
            if total_w > 0:
                voting_result = sum(p * w for p, w, _ in voters) / total_w

    # CF 带通 + 相位 (用目标周期范围)
    low_yr, high_yr = target_band
    try:
        bp = cf_bandpass(arr_z, low_yr, high_yr)
        bp_cycle = np.array(bp["cycle"])
        bp_cycle = (bp_cycle - bp_cycle.mean()) / (bp_cycle.std() + 1e-12)

        phase = phase_from_waveform(bp_cycle.tolist(), current_idx=-1)
        current_val = float(bp_cycle[-1])
        prev_val = float(bp_cycle[-2]) if len(bp_cycle) > 1 else 0
        direction = "上升" if current_val > prev_val else "下降"
        cycle_strength = float(bp_cycle.std())
    except Exception as e:
        phase = {"phase": None, "confidence": 0}
        current_val = 0.0
        direction = "未知"
        cycle_strength = 0.0

    # 相位转中文
    PHASE_NAMES = {0: "未知", 1: "回升期(复苏)", 2: "繁荣期", 3: "衰退期", 4: "萧条期"}
    phase_name = PHASE_NAMES.get(phase.get("phase"), "未知")

    return {
        "individual_results": individual,
        "voters": [(round(p, 2), round(w, 2), n) for p, w, n in voters],
        "voting_period": round(voting_result, 2) if voting_result else None,
        "phase": {
            "number": phase.get("phase"),
            "name": phase_name,
            "confidence": round(phase.get("confidence", 0), 4),
        },
        "current": {
            "value": round(current_val, 4),
            "direction": direction,
            "cycle_strength": round(cycle_strength, 4),
        },
        "method_count": len(methods),
        "voter_count": len(voters),
    }


def run_cf_bandpass(
    series: list[float],
    low_yr: float = 40,
    high_yr: float = 70,
) -> dict[str, Any]:
    """运行 CF 带通滤波 + 相位推断。

    返回: {cycle, zscore, phase, current_value, direction}
    """
    arr = np.asarray(series, dtype=np.float64)
    arr_z = (arr - arr.mean()) / (arr.std() + 1e-12)

    bp = cf_bandpass(arr_z, low_yr, high_yr)
    cycle = np.array(bp["cycle"])
    cycle_z = (cycle - cycle.mean()) / (cycle.std() + 1e-12)

    phase = phase_from_waveform(cycle_z.tolist(), current_idx=-1)
    PHASE_NAMES = {0: "未知", 1: "回升期", 2: "繁荣期", 3: "衰退期", 4: "萧条期"}

    return {
        "phase": {
            "number": phase.get("phase"),
            "name": PHASE_NAMES.get(phase.get("phase"), "未知"),
            "confidence": round(phase.get("confidence", 0), 4),
        },
        "current_value": round(float(cycle_z[-1]), 4),
        "direction": "上升"
        if float(cycle_z[-1]) > float(cycle_z[-2])
        else "下降",
        "cycle_strength": round(float(cycle_z.std()), 4),
        "zscore": [round(float(x), 4) for x in cycle_z],
    }
