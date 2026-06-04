import { useRef, useEffect } from 'react';
import { useQueryMCPJSON } from '../../hooks/useQueryMCP';

/** 宏观覆盖总览：四个周期的最新值一览表 */
export default function CoverageTab() {
  const kd = useQueryMCPJSON('data_kitchin');
  const jd = useQueryMCPJSON('data_juglar');
  const kzd = useQueryMCPJSON('data_kuznets');
  const kvd = useQueryMCPJSON('data_kondratiev', { method: 'pca' });

  const kRows = Array.isArray(kd.data) ? kd.data : [];
  const jRows = Array.isArray(jd.data) ? jd.data : [];
  const kzRows = Array.isArray(kzd.data) ? kzd.data : [];
  const kL = kRows[kRows.length - 1] || {};
  const jL = jRows[jRows.length - 1] || {};
  const kzL = kzRows[kzRows.length - 1] || {};

  const rows = [
    { cycle: '基钦', period: kL.period, phase: kL.stage_name, dir: kL.inventory_dir, v1: `库存${kL.inventory_yoy}%`, v2: `需求${kL.demand_yoy}%` },
    { cycle: '朱格拉', period: jL.period, phase: jL.phase_name, dir: jL.fix_dir, v1: `z值${jL.comp_z?.toFixed(3)}`, v2: `固投${jL.fix_inv_yoy}%` },
    { cycle: '库兹涅茨', period: kzL.period, phase: kzL.phase_name, dir: kzL.re_dir, v1: `房价${kzL.house_price_yoy}`, v2: `销售${kzL.sales_yoy}%` },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 0' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>📊 宏观覆盖</h2>

      {/* 周期性表格 */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(212,168,83,0.08)' }}>
              {['周期', '最新期', '相位', '方向', '指标1', '指标2'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--accent-gold)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.cycle} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.cycle}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{r.period || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{r.phase || '—'}</td>
                <td style={{ padding: '12px 16px', color: r.dir > 0 ? '#3fb950' : r.dir < 0 ? '#f85149' : 'var(--text-muted)' }}>{r.dir > 0 ? '↑' : r.dir < 0 ? '↓' : '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{r.v1 || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{r.v2 || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 康波独立显示 */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>康波周期</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>相位</span><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>{kvd.data?.phase ?? '—'}</div></div>
          <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>主周期</span><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>{kvd.data?.dominant_period?.toFixed(1) ?? '—'}年</div></div>
          <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>置信度</span><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>{kvd.data?.confidence ? (kvd.data.confidence * 100).toFixed(0) + '%' : '—'}</div></div>
          <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PCA方差比</span><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>{kvd.data?.pca_variance_ratio ? (kvd.data.pca_variance_ratio * 100).toFixed(1) + '%' : '—'}</div></div>
        </div>
      </div>
    </div>
  );
}
