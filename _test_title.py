"""Check titles now."""
import sys
sys.path.insert(0, "/home/AI/workspace/Mcp Server/DeepFusion")
import sqlite3
from deep_fusion.shared.policy_db import DB_PATH
conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT substr(title,1,55) as t, substr(organization,1,12) as o, publish_date, length(body) as b FROM policy_docs ORDER BY publish_date DESC").fetchall()
for r in rows[:10]:
    print(f"  {r['t'][:55]:55s} org={r['o']:12s} date={r['publish_date'] or '-':12s} body={r['b']}B")
print(f"\n共 {len(rows)} 条")
