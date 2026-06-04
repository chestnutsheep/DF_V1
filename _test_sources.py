"""Test alternative akshare data sources."""
import os, sys
for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy','SOCKS_PROXY','socks_proxy']:
    os.environ.pop(k, None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import akshare as ak

# Try 新浪日K
try:
    df = ak.stock_zh_a_hist_sina("sh600519")
    print(f"SINA: {df.shape}")
except Exception as e:
    print(f"SINA fail: {type(e).__name__}")

# Try 腾讯日K via minute data
try:
    df = ak.stock_zh_a_daily(symbol="sh600519", adjust="qfq")
    print(f"TENCENT: {df.shape}")
except Exception as e:
    print(f"TENCENT fail: {type(e).__name__}")

# Try stock_zh_a_hist_min_em (分钟线，但可以聚合)
try:
    df = ak.stock_zh_a_hist_min_em(symbol="600519", period="1", start_date="20260601", end_date="20260604")
    print(f"MIN_EM: {df.shape}")
except Exception as e:
    print(f"MIN_EM fail: {type(e).__name__}")
