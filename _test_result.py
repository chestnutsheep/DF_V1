"""Check policy DB quality."""
import sys
sys.path.insert(0, "/home/AI/workspace/Mcp Server/DeepFusion")
import sqlite3
from deep_fusion.shared.policy_db import DB_PATH
conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
rows = conn.execute("""
    SELECT substr(url,1,50) as u, substr(title,1,40) as t, organization,
           publish_date, keywords, length(body) as b
    FROM policy_docs ORDER BY publish_date DESC
""").fetchall()
for r in rows:
    print(f"  {r['u'][:50]:50s} {r['t'][:40]:40s} org={r['organization'] or '-':12s} date={r['publish_date'] or '-':12s} body={r['b']}B")
print(f"\n共 {len(rows)} 条")
print(f"有正文: {sum(1 for r in rows if r['b'] > 500)}")
