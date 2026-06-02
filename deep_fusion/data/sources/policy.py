"""Policy document tracker — gov.cn 政策文件抓取与解析。"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

import requests as _rq
from bs4 import BeautifulSoup

# gov.cn 直连，不走代理（Clash 可能干扰国内政务网站）
_SESSION = _rq.Session()
_SESSION.headers.update({"User-Agent": "Mozilla/5.0"})
_SESSION.trust_env = False  # 忽略 HTTP_PROXY/HTTPS_PROXY 环境变量

from ...shared.policy_db import PolicyDB

db = PolicyDB()

EXCLUDE_PATTERNS = re.compile(
    r"(/home/|/jiedu/|/yaowen/|mail\.|javascript|#)"
)
CONTENT_PATTERN = re.compile(r"/zhengce/content/\d+")


def fetch_gov_latest(max_pages: int = 3) -> list[dict[str, Any]]:
    """爬 gov.cn 政策文件。"""
    results = []
    seen_urls = set()

    sources = [
        ("https://www.gov.cn/zhengce/", "国务院政策文件库"),
        ("https://www.gov.cn/zhengce/zuixin/", "最新政策"),
    ]

    for base_url, source in sources:
        for page in range(1, max_pages + 1):
            url = f"{base_url}index.htm" if page == 1 else f"{base_url}index_{page}.htm"
            try:
                r = _SESSION.get(url, timeout=15)
                if r.status_code != 200:
                    continue
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    txt = a.get_text(strip=True)
                    if not txt or len(txt) < 10:
                        continue
                    full_url = href if href.startswith("http") else f"https://www.gov.cn{href}"
                    # 只保留 /zhengce/content/ 路径
                    if not CONTENT_PATTERN.search(full_url):
                        continue
                    if EXCLUDE_PATTERNS.search(full_url):
                        continue
                    if href in seen_urls:
                        continue
                    seen_urls.add(href)
                    results.append({
                        "title": txt,
                        "url": full_url,
                        "source": source,
                        "found_at": datetime.now().isoformat(),
                        "body": "",
                    })
            except Exception as e:
                print(f"  ⚠ {url}: {e}")
                continue

    return results


def fetch_detail(entry: dict[str, Any]) -> dict[str, Any]:
    """抓取单篇政策详情。"""
    try:
        r = _SESSION.get(entry["url"], timeout=15)
        if r.status_code != 200:
            return entry
        soup = BeautifulSoup(r.text, "html.parser")

        # 标题
        h = soup.find(["h1", "h2", "h3"])
        if h:
            entry["title"] = h.get_text(strip=True)

        # 发布日期
        date_pat = re.compile(r"(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)")
        for span in soup.find_all(["span", "time", "p"]):
            txt = span.get_text(strip=True)
            m = date_pat.search(txt)
            if m:
                entry["publish_date"] = m.group(1)
                break

        # 发文机构
        org_pat = re.compile(r"(国务院|中共中央|发改委|财政部|工信部|央行|商务部|科技部|自然资源部|住建部|农业农村部)")
        for span in soup.find_all(["span", "p", "div"]):
            txt = span.get_text(strip=True)
            m = org_pat.search(txt)
            if m:
                entry["organization"] = m.group(1)
                break

        # 正文
        body_parts = []
        for p in soup.find_all("p"):
            txt = p.get_text(strip=True)
            if len(txt) > 20:
                body_parts.append(txt)
        entry["body"] = "\n".join(body_parts[:150])
        body_text = " ".join(body_parts)

        # 关键词
        keywords = ["五年规划", "十五五", "十四五", "改革", "创新", "数字经济",
                     "绿色", "碳中和", "新能源", "产业链", "消费", "投资",
                     "房地产", "地方债", "专项债", "财政", "货币", "降准", "降息",
                     "人工智能", "数据要素", "国企改革", "民营"]
        found_kw = [kw for kw in keywords if kw in body_text]
        entry["keywords"] = ",".join(found_kw)

    except Exception as e:
        print(f"  ⚠ 详情抓取失败: {entry.get('url')}: {e}")

    return entry


def collect(max_pages: int = 3) -> dict[str, int]:
    """全流程: 抓取 → 详情 → 写入 DB。"""
    entries = fetch_gov_latest(max_pages)
    print(f"  找到 {len(entries)} 条")

    new_count = 0
    for i, e in enumerate(entries):
        if db.exists(e["url"]):
            continue
        e = fetch_detail(e)
        db.save(e)
        new_count += 1
        if (i + 1) % 5 == 0:
            print(f"  [{i+1}/{len(entries)}] 已入库 {new_count} 条")

    return {"total": len(entries), "new": new_count}
