import { useState } from 'react';
import { useMCP } from '../../hooks/useMCP';
import DataChart from '../common/DataChart';

export default function GlobalPanel() {
  const [activeTab, setActiveTab] = useState('fred');
  const { data: fredRaw } = useMCP('fred_data', { series: 'fred_gs10', limit: 60 });
  const { data: wbRaw } = useMCP('wb_data', { indicator: 'wb_gdp_growth', limit: 40 });

  const fredData = parseCsv(fredRaw);
  const wbData = parseCsv(wbRaw);

  const fredSeries = [{ key: 'value', name: '美国10年期国债收益率', color: '#d2991d', type: 'line' }];
  const wbSeries = [{ key: 'value', name: '全球GDP增长率', color: '#5B8FA8', type: 'bar' }];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🌍 国际宏观</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>美联储利率 · 全球GDP · 大宗商品</p>
      </div>

      <hr className="section-divider" />

      {/* 导航 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'fred', label: '🇺🇸 FRED' },
          { key: 'wb', label: '🌍 World Bank' },
          { key: 'trade', label: '📊 贸易' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '4px 14px', borderRadius: 16, fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500,
              background: activeTab === t.key ? 'var(--accent-gold)' : 'transparent',
              color: activeTab === t.key ? '#000' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* FRED 视图 */}
      {activeTab === 'fred' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ width: '60%', flexShrink: 0 }}>
            <DataChart data={fredData} series={fredSeries} height={320} />
          </div>
          <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-panel)', borderRadius: 2, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent-gold)', fontSize: 13 }}>📌 关键指标</div>
            {[
              { label: '美联储利率', value: '5.25%', dir: '↑' },
              { label: '美国CPI', value: '2.1%', dir: '↓' },
              { label: '非农就业', value: '18.7万人', dir: '↑' },
              { label: '欧元区GDP', value: '+0.3%', dir: '→' },
              { label: '美元指数', value: '103.2', dir: '↑' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 700 }}>{item.value} <span style={{ color: 'var(--accent-gold)', fontSize: 11 }}>{item.dir}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* World Bank 视图 */}
      {activeTab === 'wb' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ width: '60%', flexShrink: 0 }}>
            <DataChart data={wbData} series={wbSeries} height={320} />
          </div>
          <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-panel)', borderRadius: 2, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent-gold)', fontSize: 13 }}>🌏 全球GDP增速对比</div>
            {[
              { label: '中国', value: '+5.2%', color: '#3fb950' },
              { label: '美国', value: '+2.1%', color: '#d2991d' },
              { label: '欧元区', value: '+0.3%', color: '#f85149' },
              { label: '日本', value: '+0.8%', color: '#5B8FA8' },
              { label: '印度', value: '+6.4%', color: '#3fb950' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
              </div>
            ))}

            <div style={{ fontWeight: 700, marginTop: 16, marginBottom: 12, color: 'var(--accent-gold)', fontSize: 13 }}>🛢️ 全球大宗商品</div>
            {[
              { label: '原油', value: '$78.5/桶' },
              { label: '黄金', value: '$2,320/盎司' },
              { label: '铜', value: '$8,900/吨' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 700 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trade' && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          贸易数据模块开发中
        </div>
      )}
    </div>
  );
}

function parseCsv(csv) {
  if (!csv) return [];
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  return lines.slice(1).map(l => {
    const parts = l.split(',');
    return { period: parts[0]?.slice(0, 7) || '', value: parseFloat(parts[1]) };
  }).filter(d => !isNaN(d.value)).slice(-60);
}
