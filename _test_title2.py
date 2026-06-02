"""Check titles after fix."""
import sys
sys.path.insert(0, "/home/AI/workspace/Mcp Server/DeepFusion")
from deep_fusion.shared.policy_db import PolicyDB
db = PolicyDB()
conn = db._connect()
rows = conn.execute("SELECT substr(title,1,60) as t, organization, length(body) as b FROM policy_docs ORDER BY publish_date DESC").fetchall()
for r in rows[:5]:
    print(f"  {r[0][:60]:60s} org={r[1] or '-':15s} body={r[2]}B")
print(f"共 {len(rows)} 条")
conn.close()
