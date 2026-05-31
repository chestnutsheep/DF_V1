# 四周期缺失指标补全规划

> 基于 NBS + FRED 数据源，补全基钦/朱格拉/库兹涅茨/康波四个经济周期的缺失指标

## 数据源策略

- **中国数据优先**：现有 `_NbsClient` + `search_and_fetch` 搜索中文指标名
- **FRED 回退**：NBS 搜不到时用 FRED 全球数据作为参考
- **康波全量进 PCA**：所有可获取的 FRED/WB 指标全部进入 PCA 矩阵，SVD 自动降维

## 逐周期改动

### 基钦周期（无改动）

当前指标已完整：工业增加值、产成品库存、PMI、M2、固投。不新增。

### 朱格拉周期

| 项目 | 内容 |
|------|------|
| 新增指标 | 产能利用率（key=`capacity_util`） |
| 数据源 | NBS API `search_and_fetch("产能利用率")` → 回退 FRED TCU |
| 集成位置 | 加到 Juglar `indicators` 列表 → `_classify_juglar` 中作为辅助确认 |
| CF 参数 | `low_yr=6, high_yr=12, fs=12` |
| 相位影响 | capacity_util Z-score 与 fix_inv Z-score 同向加强，反向警示 |

### 库兹涅茨周期

| 项目 | 内容 |
|------|------|
| 新增指标 | 70 城房价指数（key=`house_price_yoy`） |
| 数据源 | NBS API `search_and_fetch("70个大中城市新建商品住宅价格指数")` |
| 主次关系 | 房价 Z-score 为主判定信号，现有 `re_yoy` 降为辅助 |
| CF 参数 | `low_yr=12, high_yr=30, fs=12` |

### 康波周期

| 项目 | 内容 |
|------|------|
| 新增指标 | FRED: CPIAUCSL, UNRATE, INDPRO + WB 更多指标 |
| 数据源 | `fetch_fred()` / `fetch_wb()` |
| 集成位置 | `compute_kondratiev()` PCA 矩阵扩展到 5-7 指标 |
| 预期效果 | PCA 方差从 ~70% 提升到 ~80%+ |

## 现有改动（已实现）

1. `spectral.py::cf_bandpass()` — MA 平滑 → Butterworth 带通 → Z-score
2. `utils.py::fetch_fred()` — FRED HTTP CSV 缓存
3. `utils.py::compute_kondratiev()` — 全球数据 PCA → CF → sign&level
4. `cycles.py::_classify_kitchin()` — CF(3-5yr) + Z-score 预处理
5. `cycles.py::_classify_juglar()` — CF(6-12yr) + sign+level 机构标准
6. `cycles.py::_classify_kuznets()` — CF(12-30yr) + sign+level 机构标准
7. `cycles.py::kondratiev_cycle()` — 数据源从中国 5 指标切换为全球 FRED+WB

## 实现前提

- 当前 commit 已上传（`f381ca2`）
- 36 个测试全部通过
- CI 已修复（lockfile + pytest capture bug + Node 24 compat）
