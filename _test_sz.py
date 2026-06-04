"""Test 深圳股票 Tencent source."""
import os, sys
for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy','SOCKS_PROXY','socks_proxy']:
    os.environ.pop(k, None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import akshare as ak
try:
    df = ak.stock_zh_a_daily("sz002407", adjust="qfq")
    print(f"成功: {df.shape}")
except Exception as e:
    print(f"失败: {type(e).__name__}: {e}")
