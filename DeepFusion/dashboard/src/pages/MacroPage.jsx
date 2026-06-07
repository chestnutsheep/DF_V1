import { useMCP } from '../hooks/useMCP';
import MacroSnapshot from '../components/Macro/MacroSnapshot';
import CyclePage from '../components/Macro/CyclePage';
import DataCard from '../components/common/DataCard';
import { KITCHIN_CONFIG } from '../configs/kitchin';
import { JUGLAR_CONFIG } from '../configs/juglar';
import { KUZNETS_CONFIG } from '../configs/kuznets';
import { KONDRATIEV_CONFIG } from '../configs/kondratiev';

const CYCLES = [
  { id: 'kitchin', label: '基钦', config: KITCHIN_CONFIG },
  { id: 'juglar', label: '朱格拉', config: JUGLAR_CONFIG },
  { id: 'kuznets', label: '库兹涅茨', config: KUZNETS_CONFIG },
  { id: 'kondratiev', label: '康波', config: KONDRATIEV_CONFIG },
];

const COVERAGE_TOOLS = [
  { tool: 'data_kitchin', key: 'kitchin', label: '基钦', color: '#3fb950', fields: ['stage_name', 'confidence', 'dominant_period'] },
  { tool: 'data_juglar', key: 'juglar', label: '朱格拉', color: '#D4A853', fields: ['phase_name', 'confidence', 'dominant_period'] },
  { tool: 'data_kuznets', key: 'kuznets', label: '库兹涅茨', color: '#58a6ff', fields: ['phase_name', 'confidence', 'dominant_period'] },
  { tool: 'data_kondratiev', key: 'kondratiev', label: '康波', color: '#f85149', fields: ['phase_name', 'confidence', 'dominant_period'] },
];

function MethodCards() {
  const pcaResult = useMCP('data_kondratiev', { method: 'pca' });
  const waveletResult = useMCP('data_kondratiev', { method: 'wavelet' });
  const bandpassResult = useMCP('data_kondratiev', { method: 'bandpass' });

  const parseResult = (raw) => {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  };

  const pca = parseResult(pcaResult.data);
  const wavelet = parseResult(waveletResult.data);
  const bandpass = parseResult(bandpassResult.data);

  const methods = [
    { ...KONDRATIEV_CONFIG.methodMetrics[0], value: pca.confidence, phase: pca.phase_name },
    { ...KONDRATIEV_CONFIG.methodMetrics[1], value: wavelet.confidence, phase: wavelet.phase_name },
    { ...KONDRATIEV_CONFIG.methodMetrics[2], value: bandpass.confidence, phase: bandpass.phase_name },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent-gold)' }}>
        🔬 三种计算方法对比
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {methods.map((m, i) => (
          <DataCard
            key={m.method}
            label={m.label}
            value={m.value != null ? m.value * 100 : null}
            unit="%"
            higherBetter={m.higherBetter}
            decimals={1}
            detail={m.detail}
            source={m.phase ? `相位: ${m.phase}` : ''}
          />
        ))}
      </div>
    </div>
  );
}

function CoverageGrid() {
  const hooks = COVERAGE_TOOLS.map(c => {
    const params = c.key === 'kondratiev' ? { method: 'pca' } : {};
    return { ...c, result: useMCP(c.tool, params) };
  });

  const parse = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { const arr = JSON.parse(raw); return arr?.[arr.length - 1] || {}; } catch {}
    }
    return raw?.data ? (() => { try { return JSON.parse(raw.data); } catch { return {}; } })() : {};
  };

  const rows = hooks.map(h => {
    const data = parse(h.result.data);
    return {
      label: h.label, color: h.color,
      phase: data.phase_name || data.stage_name || '—',
      confidence: data.confidence != null ? (data.confidence * 100).toFixed(1) + '%' : '—',
      period: data.dominant_period != null ? data.dominant_period : '—',
    };
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${rows.length}, 1fr)`,
        gap: 12,
      }}
    >
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: r.color }}>{r.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <div>相位: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.phase}</span></div>
            <div>置信度: <span style={{ color: 'var(--accent-gold)' }}>{r.confidence}</span></div>
            <div>周期: <span style={{ color: 'var(--text-primary)' }}>{r.period}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MacroPage() {
  return (
    <div>
      <MacroSnapshot />
      <hr className="section-divider" />
      {CYCLES.map((c, i) => (
        <div key={c.id} id={c.id}>
          <CyclePage config={c.config} showTitle={c.label} />
          {c.id === 'kondratiev' && <MethodCards />}
          {i < CYCLES.length - 1 && <hr className="section-divider-thin" />}
        </div>
      ))}

      {/* 周期覆盖 — Sidebar 子导航 "宏观覆盖" 锚点 */}
      <hr className="section-divider" />
      <div id="coverage">
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 8 }}>周期覆盖</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          四周期当前相位一览
        </p>
        <CoverageGrid />
      </div>
    </div>
  );
}
