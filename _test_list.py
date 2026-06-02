"""Check raw gov.cn list page links."""
import os, requests
for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY']:
    os.environ.pop(k, None)
from bs4 import BeautifulSoup

s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0"})
s.trust_env = False

r = s.get("https://www.gov.cn/zhengce/", timeout=15)
soup = BeautifulSoup(r.text, "html.parser")
for a in soup.find_all("a", href=True):
    href = a["href"]
    txt = a.get_text(strip=True)
    if "zhengce/content" in href:
        print(f"  {txt[:60]:60s} {href}")
