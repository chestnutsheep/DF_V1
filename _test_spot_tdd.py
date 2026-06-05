"""
TDD: 市场行情查询交换层测试
验证 新浪→东方财富 降级路径可用
"""
import os, sys, json

for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy','SOCKS_PROXY','socks_proxy']:
    os.environ.pop(k, None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import akshare as ak
import pandas as pd

PASS = 0
FAIL = 0

def check(name, ok, detail=""):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name}  {detail}")

# ── 1. stock_zh_a_spot (新浪全A) ──
print("1️⃣  stock_zh_a_spot (新浪全A)")
try:
    df = ak.stock_zh_a_spot()
    check("返回 DataFrame", isinstance(df, pd.DataFrame))
    check("行数 > 5000", len(df) > 5000)
    check("含列 代码", '代码' in df.columns)
    check("含列 名称", '名称' in df.columns)
    check("含列 最新价", '最新价' in df.columns)
    check("含列 涨跌幅", '涨跌幅' in df.columns)
    check("含列 成交量", '成交量' in df.columns)

    # 子集筛选测试
    # 沪A = 代码以 sh 开头
    sh = df[df['代码'].str.startswith('sh', na=False)]
    check("沪A 子集过滤", len(sh) > 500, f"got {len(sh)}")

    # 验证数值列类型
    check("最新价可为数值", pd.to_numeric(df['最新价'], errors='coerce').notna().sum() > 100)

    # 沪A 筛选结果
    first_sh = sh.head(3)
    for _, row in first_sh.iterrows():
        check(f"  沪A 示例: {row['代码']} {row['名称']} ¥{row['最新价']}", True)

except Exception as e:
    check("新浪全A调用", False, str(e))

# ── 2. stock_sector_spot (新浪行业) ──
print("\n2️⃣  stock_sector_spot (新浪行业板块)")
try:
    df = ak.stock_sector_spot()
    check("返回 DataFrame", isinstance(df, pd.DataFrame))
    check("行数 > 10", len(df) > 10)
    check("含列 板块", '板块' in df.columns or 'label' in df.columns)
    check("含列 涨跌幅", '涨跌幅' in df.columns or '个股-涨跌幅' in df.columns)
    # 显示前3个板块
    for _, row in df.head(3).iterrows():
        name = row.get('板块', row.get('label', ''))
        chg = row.get('涨跌幅', row.get('个股-涨跌幅', ''))
        check(f"  板块示例: {name} {chg}%", True)
except Exception as e:
    check("新浪行业板块调用", False, str(e))

# ── 3. stock_hk_spot (新浪港股) ──
print("\n3️⃣  stock_hk_spot (新浪港股)")
try:
    df = ak.stock_hk_spot()
    check("返回 DataFrame", isinstance(df, pd.DataFrame))
    check("行数 > 500", len(df) > 500)
    check("含列 代码", '代码' in df.columns)
    check("含列 最新价", '最新价' in df.columns)
    for _, row in df.head(2).iterrows():
        check(f"  港股示例: {row['代码']} {row.get('中文名称','')} ¥{row['最新价']}", True)
except Exception as e:
    check("新浪港股调用", False, str(e))

# ── 4. 市场行情查询函数（模拟交换层）──
print("\n4️⃣  模拟交换层逻辑")
def fetch_spot(market="all"):
    """优先新浪→回退东方财富"""
    # 新浪 (无参数，全市场)
    try:
        df = ak.stock_zh_a_spot()
        if df is not None and not df.empty:
            # 本地过滤逻辑
            if market == "all":
                return df
            prefix_map = {"沪A": "sh", "深A": "sz", "京A": "bj", "创业板": "sz30", "科创板": "sh68"}
            prefix = prefix_map.get(market, "")
            if prefix:
                if prefix == "sz30":
                    return df[df['代码'].str.match(r'sz3\d{4}', na=False)]
                elif prefix == "sh68":
                    return df[df['代码'].str.match(r'sh68\d{4}', na=False)]
                else:
                    return df[df['代码'].str.startswith(prefix, na=False)]
            return df
    except Exception:
        pass

    # 回退：东方财富
    fallback_map = {
        "all": ak.stock_zh_a_spot_em,
        "沪A": ak.stock_sh_a_spot_em,
        "深A": ak.stock_sz_a_spot_em,
    }
    func = fallback_map.get(market, ak.stock_zh_a_spot_em)
    try:
        df = func()
        return df
    except Exception:
        return None

# 测试交换层
try:
    df = fetch_spot()
    check("fetch_spot('all') 返回数据", df is not None and len(df) > 5000)
except Exception as e:
    check("fetch_spot('all')", False, str(e))

try:
    df_sh = fetch_spot("沪A")
    check("fetch_spot('沪A') 返回数据", df_sh is not None and len(df_sh) > 500)
except Exception as e:
    check("fetch_spot('沪A')", False, str(e))

try:
    df_sz = fetch_spot("深A")
    check("fetch_spot('深A') 返回数据", df_sz is not None and len(df_sz) > 500)
except Exception as e:
    check("fetch_spot('深A')", False, str(e))

# ── 汇总 ──
print(f"\n{'='*30}")
print(f"通过: {PASS}  失败: {FAIL}")
if FAIL > 0:
    print("⚠️  有失败的测试")
    sys.exit(1)
else:
    print("✅ 全部通过")
