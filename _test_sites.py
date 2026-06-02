"""Test gov sites connectivity."""
import os
for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY']:
    os.environ.pop(k, None)
import requests

sites = [
    ("国家统计局", "https://www.stats.gov.cn/"),
    ("央行", "https://www.pbc.gov.cn/"),
    ("财政部", "https://www.mof.gov.cn/"),
    ("发改委", "https://www.ndrc.gov.cn/"),
    ("国新办", "http://www.scio.gov.cn/"),
    ("外管局", "https://www.safe.gov.cn/"),
    ("法律法规库", "https://flk.npc.gov.cn/"),
]

for name, url in sites:
    try:
        s = requests.Session()
        s.headers.update({"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"})
        s.trust_env = False
        r = s.get(url, timeout=15)
        print(f"{name:10s} {r.status_code} ({len(r.text)}B)")
    except Exception as e:
        print(f"{name:10s} ❌ {e}")
