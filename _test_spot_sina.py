"""Test 新浪 stock_zh_a_spot 参数和返回格式"""
import os, sys
for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy','SOCKS_PROXY','socks_proxy']:
    os.environ.pop(k, None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import akshare as ak
import pandas as pd

# 1. 参数检查
print("=== stock_zh_a_spot 签名 ===")
import inspect
sig = inspect.signature(ak.stock_zh_a_spot)
print(f"参数: {sig}")

# 2. 测试调用
print("\n=== 测试调用 ===")
try:
    df = ak.stock_zh_a_spot()
    print(f"成功: {type(df).__name__} shape={df.shape}")
    print(f"列: {list(df.columns)}")
    print(f"\n前2行:\n{df.head(2).to_string()}")
except Exception as e:
    print(f"失败: {type(e).__name__}: {e}")

# 3. 对比 stock_zh_a_spot_em 的结构
print("\n=== stock_zh_a_spot_em 对比 ===")
try:
    df_em = ak.stock_zh_a_spot_em()
    print(f"EM: {type(df_em).__name__} shape={df_em.shape}")
    print(f"EM列: {list(df_em.columns)}")
    print(f"\nEM前2行:\n{df_em.head(2).to_string()}")
except Exception as e:
    print(f"EM失败: {type(e).__name__}: {e}")

# 4. 行业板块
print("\n=== stock_sector_spot (新浪) ===")
try:
    df_sec = ak.stock_sector_spot()
    print(f"成功: shape={df_sec.shape}")
    print(f"列: {list(df_sec.columns)[:10]}")
    print(f"\n前2行:\n{df_sec.head(2).to_string()}")
except Exception as e:
    print(f"失败: {type(e).__name__}: {e}")

# 5. 港股
print("\n=== stock_hk_spot (新浪) ===")
try:
    df_hk = ak.stock_hk_spot()
    print(f"成功: shape={df_hk.shape}")
    print(f"列: {list(df_hk.columns)[:10]}")
    print(f"\n前2行:\n{df_hk.head(2).to_string()}")
except Exception as e:
    print(f"失败: {type(e).__name__}: {e}")

# 6. 雪球个股基本信息
print("\n=== stock_individual_basic_info_xq ===")
try:
    df_xq = ak.stock_individual_basic_info_xq(symbol="SH600519")
    print(f"成功: shape={df_xq.shape}")
    print(f"列: {list(df_xq.columns)}")
    print(f"\n数据:\n{df_xq.to_string()}")
except Exception as e:
    print(f"失败: {type(e).__name__}: {e}")
