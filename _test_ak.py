"""Test akshare directly."""
import os, sys
for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy','SOCKS_PROXY','socks_proxy']:
    os.environ.pop(k, None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import akshare as ak
try:
    df = ak.stock_zh_a_hist("600519", period="daily", start_date="20260601", end_date="20260604")
    print(f"Shape: {df.shape if df is not None else 'None'}")
    if df is not None:
        print(df.tail(2))
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
