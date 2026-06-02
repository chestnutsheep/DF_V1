"""Explore key policy sites for document paths."""
import os, requests
for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY']:
    os.environ.pop(k, None)
from bs4 import BeautifulSoup

s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0"})
s.trust_env = False

targets = [
    # 统计局 - 最新发布 / 新闻
    ("统计局新闻", "https://www.stats.gov.cn/sj/zxfb/"),
    ("统计局公报", "https://www.stats.gov.cn/sj/tjgb/"),
    # 央行 - 货币政策 / 金融稳定 / 人民币
    ("央行货币政策", "https://www.pbc.gov.cn/zhengcehuobisi/125207/125227/index.html"),
    ("央行金融稳定", "https://www.pbc.gov.cn/jinrongwendingju/146766/index.html"),
    ("央行年报", "https://www.pbc.gov.cn/zhengcehuobisi/125207/125227/125231/index.html"),
    # 财政部
    ("财政部预算", "https://www.mof.gov.cn/zhengwuxinxi/caizhengxinxi/yusuansi/"),
    # 发改委
    ("发改委规划", "https://www.ndrc.gov.cn/fzgggz/"),
]

for name, url in targets:
    try:
        r = s.get(url, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # 找前5个链接
        count = 0
        for a in soup.find_all("a", href=True):
            txt = a.get_text(strip=True)
            href = a["href"]
            if not txt or len(txt) < 10:
                continue
            if "content" in href or "/202" in href:
                full = href if href.startswith("http") else f"https://www.stats.gov.cn{href}"
                print(f"  {txt[:45]:45s} {full[:65]}")
                count += 1
                if count >= 5:
                    break
        print(f"{name}: {r.status_code} ({len(r.text)}B) 示例↑")
        print()
    except Exception as e:
        print(f"{name}: ❌ {e}\n")
