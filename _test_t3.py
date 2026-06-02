"""Quick title check."""
from deep_fusion.shared.policy_db import PolicyDB
db = PolicyDB()
conn = db._connect()
rows = conn.execute("SELECT title FROM policy_docs LIMIT 3").fetchall()
for r in rows:
    t = r[0]
    print(repr(t[:80]))
    print(t[:80])
