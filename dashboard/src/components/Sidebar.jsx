import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { mcp } from '../services/mcp';

const SUB_NAV = {
  policy: [
    { label: '政策统计', icon: '📊' },
    { label: '文件列表', icon: '📋' },
    { label: '采集管理', icon: '🔄' },
  ],
  macro: [
    { label: '基钦周期', icon: '📉' },
    { label: '朱格拉周期', icon: '📈' },
    { label: '库兹涅茨', icon: '🏠' },
    { label: '康波周期', icon: '🌊' },
    { label: '宏观快照', icon: '📊' },
  ],
  meso: [
    { label: '银行', icon: '🏦' },
    { label: '钢铁', icon: '🏗️' },
    { label: '房地产', icon: '🏘️' },
    { label: '白酒', icon: '🍶' },
  ],
  micro: [
    { key: 'stock',   label: '个股', icon: '📈' },
    { key: 'fund',    label: '基金', icon: '📦' },
    { key: 'futures', label: '期货', icon: '⛽' },
    { key: 'bond',    label: '债券', icon: '📜' },
    { key: 'option',  label: '期权', icon: '🎯' },
  ],
  global: [
    { label: 'FRED 序列', icon: '🇺🇸' },
    { label: 'World Bank', icon: '🌍' },
    { label: '贸易/通胀', icon: '📊' },
  ],
};

/* 周期→行业推荐映射 */
function getIndustryAdvice(phases) {
  const k = phases.kitchin || '';
  const j = phases.juglar || '';
  const kz = phases.kuznets || '';
  const recs = [];

  if (k.includes('补库存') || k.includes('繁荣')) {
    recs.push({ industry: '基础材料/化工', reason: '补库存周期上游受益', weight: 90 });
    recs.push({ industry: '机械设备', reason: '产能扩张期资本品需求旺', weight: 80 });
  }
  if (k.includes('去库存') || k.includes('衰退') || k.includes('萧条')) {
    recs.push({ industry: '必需消费/医药', reason: '去库存周期防御配置', weight: 85 });
    recs.push({ industry: '公用事业', reason: '需求刚性，现金流稳定', weight: 75 });
  }
  if (j.includes('繁荣') || j.includes('复苏')) {
    recs.push({ industry: '高端制造/半导体', reason: '朱格拉上行期设备投资扩张', weight: 95 });
    recs.push({ industry: '新能源/电力设备', reason: '资本开支增长方向', weight: 85 });
  }
  if (j.includes('衰退') || j.includes('萧条')) {
    recs.push({ industry: '银行/保险', reason: '利率下行期金融红利', weight: 70 });
  }
  if (kz.includes('复苏') || kz.includes('繁荣')) {
    recs.push({ industry: '家电/家居', reason: '房地产复苏后周期受益', weight: 75 });
  }
  if (kz.includes('衰退') || kz.includes('萧条')) {
    recs.push({ industry: '建筑/建材', reason: '地产下行期逆周期调节', weight: 65 });
  }

  // 去重
  const seen = new Set();
  return recs.filter(r => { const key = r.industry; if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => b.weight - a.weight).slice(0, 5);
}

export default function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const activeMicroSub = useAppStore((s) => s.activeMicroSub);
  const setActiveMicroSub = useAppStore((s) => s.setActiveMicroSub);
  const [phase, setPhase] = useState('');
  const [phaseName, setPhaseName] = useState('');
  const [policyCnt, setPolicyCnt] = useState('');
  const [policyBriefs, setPolicyBriefs] = useState([]);
  const [industryRecs, setIndustryRecs] = useState([]);

  useEffect(() => {
    async function f() {
      try {
        const k = await mcp.call('data_kitchin');
        const arr = JSON.parse(k);
        if (arr && arr.length) {
          const last = arr[arr.length - 1];
          setPhase(last.stage_name || '');
        }
        // 拉取三周期数据 → 生成行业推荐
        const [j, kz] = await Promise.all([
          mcp.call('data_juglar').then(t => JSON.parse(t)).catch(() => []),
          mcp.call('data_kuznets').then(t => JSON.parse(t)).catch(() => []),
        ]);
        const jLast = Array.isArray(j) && j.length ? j[j.length - 1] : {};
        const kzLast = Array.isArray(kz) && kz.length ? kz[kz.length - 1] : {};
        setIndustryRecs(getIndustryAdvice({
          kitchin: last?.stage_name || '',
          juglar: jLast?.phase_name || '',
          kuznets: kzLast?.phase_name || '',
        }));
      } catch (e) {}
      try {
        const s = await mcp.policy.stats();
        const m = s.match(/(\d+)\s*篇/);
        if (m) setPolicyCnt(m[1]);
        const r = await mcp.policy.search('', '', 5);
        setPolicyBriefs(r.split('\n').slice(1, 4).filter(Boolean));
      } catch (e) {}
    }
    f();
  }, []);

  const subItems = SUB_NAV[activeTab] || SUB_NAV.macro;

  return (
    <nav style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--nav-width)', background: 'var(--bg-sidebar-gradient)', backdropFilter: 'blur(18px)', borderRight: '1px solid var(--border-subtle)', padding: '0', zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: 1.5, fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif' }}>◈ Deep Fusion</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>宏观 · 中观 · 微观 · 政策 · 国际</p>
      </div>

      {/* 当前日期+相位 */}
      <div style={{ margin: '10px 16px 6px', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%', display: 'inline-block' }} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>基钦相位：{phase || '加载中...'}</div>
      </div>

      {/* 配置倾向 */}
      <div style={{ margin: '4px 16px 6px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 4px 6px', letterSpacing: 1 }}>⚖️ 配置倾向</div>
        <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
            <span>权益 <span style={{ color: 'var(--accent-gold)' }}>--%</span></span>
            <span>债券 <span style={{ color: 'var(--accent-gold)' }}>--%</span></span>
            <span>商品 <span style={{ color: 'var(--accent-gold)' }}>--%</span></span>
            <span>现金 <span style={{ color: 'var(--accent-gold)' }}>--%</span></span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>🚧 待四周期综合模型</div>
        </div>
      </div>

      {/* 行业选择参考 */}
      {industryRecs.length > 0 && (
        <div style={{ margin: '4px 16px 6px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 4px 6px', letterSpacing: 1 }}>🏭 行业推荐（多周期驱动）</div>
          <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            {industryRecs.slice(0, 4).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < Math.min(industryRecs.length, 4) - 1 ? '1px solid rgba(212,168,83,0.06)' : 'none' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.industry}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{r.reason}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: r.weight >= 85 ? 'var(--accent-red)' : r.weight >= 70 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{r.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 子导航 */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '10px 22px 4px', letterSpacing: 1.5 }}>
        {activeTab === 'policy' ? '📋 政策' : activeTab === 'macro' ? '🌐 宏观' : activeTab === 'meso' ? '🏭 中观' : activeTab === 'micro' ? '🔬 微观' : '🌍 国际'}
      </div>
      {subItems.map((item, i) => {
        const isMicro = activeTab === 'micro' && 'key' in item;
        const isActive = isMicro ? activeMicroSub === item.key : false;
        return (
          <div key={i} onClick={isMicro ? () => setActiveMicroSub(item.key) : undefined}
            style={{
              padding: '10px 22px', margin: '1px 6px', cursor: 'pointer',
              borderRadius: 10,
              borderLeft: isActive ? '3px solid var(--accent-gold)' : '3px solid transparent',
              color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
              fontSize: 14, fontWeight: isActive ? 700 : 500,
              display: 'flex', alignItems: 'center', gap: 10,
              background: isActive ? 'rgba(212,168,83,0.08)' : 'transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(212,168,83,0.04)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          ><span style={{ fontSize: 16 }}>{item.icon}</span><span>{item.label}</span></div>
        );
      })}

      {/* 政策速递 — 仅 policy tab 展示 */}
      {activeTab === 'policy' && (
        <div style={{ margin: '6px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 4px 6px', letterSpacing: 1 }}>📜 政策速递 {policyCnt && `(${policyCnt}篇)`}</div>
          <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            {policyBriefs.length > 0
              ? policyBriefs.map((b, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: i < policyBriefs.length - 1 ? '1px solid rgba(212,168,83,0.06)' : 'none' }}>
                    {b.length > 30 ? b.slice(0, 30) + '...' : b}
                  </div>
                ))
              : <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 4 }}>加载中...</div>}
          </div>
        </div>
      )}

      {/* 底部弹性留白 */}
      <div style={{ flex: 1 }} />
    </nav>
  );
}
