import { useMCP } from '../../hooks/useMCP';

function parseLatest(csv) {
  if (!csv) return '—';
  const lines = csv.trim().split('\n');
  const last = lines[lines.length - 1];
  const parts = last.split(',');
  return parts[1] ? parts[1].trim() : '—';
}

export default function MacroSnapshot() {
  const gdp = useMCP('macro_gdp', { limit: 1 });
  const cpi = useMCP('macro_cpi', { limit: 1 });
  const pmi = useMCP('macro_pmi', { limit: 1 });
  const inv = useMCP('macro_inventory_growth', { limit: 1 });
  const fix = useMCP('macro_fixed_investment', { limit: 1 });

  const items = [
    { label: 'GDP 当季同比', val: parseLatest(gdp.data), unit: '%', freq: '季度' },
    { label: 'CPI 当月同比', val: parseLatest(cpi.data), unit: '', freq: '月度' },
    { label: '制造业 PMI', val: parseLatest(pmi.data), unit: '', freq: '月度' },
    { label: '产成品库存同比', val: parseLatest(inv.data), unit: '%', freq: '月度' },
    { label: '固定资产投资', val: parseLatest(fix.data), unit: '%', freq: '月度' },
  ];

  return (
    <div className="snapshot-row" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 16,
      marginTop: 20,
      paddingLeft: 0,
    }}>
      {items.map((c, i) => (
        <div key={i} className="snapshot-card" style={{
          background: 'var(--bg-panel)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div className="metric-name" style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            borderLeft: '3px solid var(--accent-gold)',
            paddingLeft: 10,
            lineHeight: 1.4,
          }}>{c.label}</div>
          <div className="metric-value" style={{
            fontSize: 30,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}>{c.val}{c.unit}</div>
          <div className="metric-sub" style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 8,
          }}>{c.freq} · 最新一期</div>
        </div>
      ))}
    </div>
  );
}
