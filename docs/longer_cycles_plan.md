# 周期数据延展方案 (>120年)
# 分支: refactor/longer-cycles

## 目标
四个周期主判定指标至少覆盖 120 年（~1905~2026）

## 方案

### Kondratiev（康波 40-60年）← 最容易
当前: WB 数据 1960~2026 (65yr)
延展:
- PPIACO (FRED, 1913~2026, 113yr) ← 接近120
- 补 CPI 历史: CPIAUCSL (1947~) + 分段接驳 UK RPI (1800~)
- 补 GDP 增长: GNPCA (1929~, 96yr)
- 实测 PPIACO 可达多少 → 再看要不要接驳更早数据

### Kitchin（基钦 3-5年）
当前: NBS 工业增加值 2001~2026 (25yr)
延展:
- INDPRO (FRED 工业产出, 1919~, 107yr) → 中国无长序列, 用全球/US 数据做参照
- 中国部分: NBS 22年保留, 国际序列做长周期基准
- 124年 = 1902~2026 → 差 17 年到 1919, 需要历史 GDP 估计接驳

### Juglar（朱格拉 7-11年）
当前: NBS 固投/设备 2000~2026 (26yr)
延展:
- GNPCA (FRED 实际 GNP, 1929~, 96yr)
- 补更长: Fixed Asset Investment 接驳 → 需要 NBER 历史序列
- 或: GDPCA (1929~) + 工业增加值为 proxy

### Kuznets（库兹涅茨 15-25年）
当前: NBS 房价 2011~2026 (15yr) ← 最短
延展:
- HOUST (FRED 新屋开工, 1959~, 67yr)
- 人口/城市化率 (WB, 1960~, 65yr)
- 补更早: 美国历史城市化率 (1790~ census)

## 执行计划

### Phase 1: 提取长序列 FRED 数据
- `data/sources/wb_fred_adapter.py` 增加 `fetch_fred_long(sid, max_age)` 支持 120 年
- 测试以下系列实际可用长度:
  - PPIACO (113yr) ✅ 已测
  - INDPRO (107yr) ✅ 已测
  - GNPCA (96yr) ✅ 已测
  - HOUST (67yr) ✅ 已测
  - CPIAUCSL (79yr)
  - GDPCA (96yr)

### Phase 2: 修改周期配置
- `dispatch.py`: 每个周期增加 `long_term_indicators` 配置
- `engine.py`: 支持多时间尺度: 短期 (NBS) + 长期 (FRED/WB)
- `kondratiev.py`: 优先使用 PPIACO + WB 组合

### Phase 3: 合成缺失年代
- 对 1900-1919 年空缺: 用英国/美国历史经济序列做 proxy
- 方法: 线性回归 + 滚动窗口关联

## 风险
1. 中国 1900-1978 年数据无官方来源 → 必须用 proxy
2. FRED NBER 系列通过 CSV 下载不可用 → 可能需要 FRED API key
3. 序列接驳 (splicing) 可能引入偏差
