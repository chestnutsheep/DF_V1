"""Policy tracking MCP tools — 国务院政策文件抓取与检索。"""
import json

from pydantic import Field

from ..server import mcp
from ..data.sources import policy


@mcp.tool(
    name="policy_collect",
    description="抓取国务院(gov.cn)最新政策文件并入库",
)
def policy_collect(max_pages: int = 3) -> str:
    result = policy.collect(max_pages=max_pages)
    return f"采集完成: 共 {result['total']} 条, 新增 {result['new']} 条"


@mcp.tool(
    name="policy_search",
    description="搜索已入库的政策文件",
)
def policy_search(
    keyword: str = "",
    org: str = "",
    limit: int = 20,
) -> str:
    from ..shared.policy_db import PolicyDB
    db = PolicyDB()
    results = db.search(keyword=keyword, org=org, limit=limit)
    if not results:
        return "无匹配结果"
    lines = [f"共 {len(results)} 条"]
    for r in results:
        kw = f" [{r['keywords']}]" if r.get("keywords") else ""
        org = f" ({r['organization']})" if r.get("organization") else ""
        date = r.get("publish_date", "") or ""
        lines.append(f"  {date:12s} {r['title'][:50]}{org}{kw}")
    return "\n".join(lines)


@mcp.tool(
    name="policy_detail",
    description="查看某篇政策文件详情",
)
def policy_detail(
    url: str = Field(..., description="政策文件URL"),
) -> str:
    from ..shared.policy_db import PolicyDB
    db = PolicyDB()
    doc = db.get(url)
    if not doc:
        return "未找到"
    body = doc.get("body", "")[:2000]
    return json.dumps(
        {k: v for k, v in doc.items() if k != "raw_json"},
        ensure_ascii=False, indent=2,
    ) + f"\n\n正文(前2000字):\n{body}"


@mcp.tool(
    name="policy_stats",
    description="政策文件库统计",
)
def policy_stats() -> str:
    from ..shared.policy_db import PolicyDB
    db = PolicyDB()
    st = db.stats()
    lines = [f"政策文件库: 共 {st['total']} 篇"]
    for org, cnt in st.get("orgs", {}).items():
        lines.append(f"  {org}: {cnt} 篇")
    return "\n".join(lines)
