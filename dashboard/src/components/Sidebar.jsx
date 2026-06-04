import { useState, useEffect } from 'react';
import { Sidebar, Menu, MenuItem, SidebarContext } from 'react-pro-sidebar';
import { useContext } from 'react';
import { useAppStore } from '../store';
import { mcp } from '../services/mcp';

const themes = ['matin', 'crepuscule', 'eclat', 'reve', 'lumiere'];
const themeColors = ['#1A2F2A','#0F1A2E','#1A2E1A','#1E1A2E','#1A2A3A'];

const SUB_NAV = {
  policy: [
    { label: '政策统计', icon: '📊' },
    { label: '文件列表', icon: '📋' },
    { label: '采集管理', icon: '🔄' },
  ],
  macro: [
    { label: '基钦周期', icon: '📉' },
    { label: '朱格拉',   icon: '📈' },
    { label: '库兹涅茨', icon: '🏠' },
    { label: '康波周期', icon: '🌊' },
    { label: '宏观覆盖', icon: '📊' },
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

function SidebarContent() {
  const s = useContext(SidebarContext);
  const collapsed = s?.collapsed ?? false;
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setActiveMicroSub = useAppStore((s) => s.setActiveMicroSub);
  const [phase, setPhase] = useState('');
  const [policyCnt, setPolicyCnt] = useState('');
  const [policyBriefs, setPolicyBriefs] = useState([]);

  useEffect(() => {
    async function f() {
      try { const k=await mcp.call('data_kitchin'); const arr=JSON.parse(k); if(arr?.length) setPhase(arr[arr.length-1].stage_name||''); } catch(e){}
      try { const s=await mcp.policy.stats(); const m=s.match(/(\d+)\s*篇/); if(m) setPolicyCnt(m[1]); const r=await mcp.policy.search('','',5); setPolicyBriefs(r.split('\n').slice(1,4).filter(Boolean)); } catch(e){}
    }
    f();
  }, []);

  const items = SUB_NAV[activeTab] || SUB_NAV.macro;

  return (
    <Sidebar
      width="var(--nav-width)"
      collapsedWidth="60px"
      backgroundColor="transparent"
      rootStyles={{ borderRight: '1px solid var(--border-subtle)', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}
    >
      <div style={{ padding: collapsed ? '20px 10px' : '24px 20px 20px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 12, textAlign: collapsed ? 'center' : 'left' }}>
        <h1 style={{ fontSize: collapsed ? 14 : 18, fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: 1, margin: 0 }}>{collapsed ? '◈' : '◈ Deep Fusion'}</h1>
        {!collapsed && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>宏观·中观·微观·政策·国际</p>}
      </div>

      {!collapsed && (
        <>
          <div style={{ margin: '8px 16px 12px', padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width:8, height:8, background:'var(--accent-green)', borderRadius:'50%', display:'inline-block' }} />
              <span style={{ fontSize:16, fontWeight:700 }}>{new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{phase ? `基钦相位：${phase}` : '加载中...'}</div>
          </div>

          <div style={{ margin:'0 16px 12px' }}>
            <div style={{ fontSize:12,fontWeight:700,letterSpacing:1,color:'var(--text-secondary)',padding:'0 4px 8px' }}>⚖️ 配置倾向</div>
            <div style={{ padding:14, background:'rgba(0,0,0,0.2)', borderRadius:'var(--radius)', border:'1px solid var(--border-subtle)' }}>
              <div style={{ fontSize:16,fontWeight:700 }}>股--% · 债--% · 现--% · 商--%</div>
              <div style={{ fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginTop:4 }}>🚧 待四周期综合模型</div>
            </div>
          </div>

          {activeTab === 'policy' && (
            <div style={{ margin:'0 16px 12px' }}>
              <div style={{ fontSize:12,fontWeight:700,letterSpacing:1,color:'var(--text-secondary)',padding:'0 4px 8px' }}>📜 政策速递 {policyCnt && `(${policyCnt}篇)`}</div>
              <div style={{ padding:14, background:'rgba(0,0,0,0.2)', borderRadius:'var(--radius)', border:'1px solid var(--border-subtle)' }}>
                {policyBriefs.length>0 ? policyBriefs.map((b,i)=>(
                  <div key={i} style={{ fontSize:11,color:'var(--text-secondary)',padding:'3px 0',borderBottom:i<policyBriefs.length-1?'1px solid rgba(212,168,83,0.06)':'none' }}>
                    {b.length>35?b.slice(0,35)+'...':b}
                  </div>
                )) : <div style={{fontSize:11,color:'var(--text-muted)'}}>加载中...</div>}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ fontSize:12,fontWeight:700,letterSpacing:1,color:'var(--text-secondary)',padding: collapsed ? '8px 10px 4px' : '8px 20px 4px', textAlign: collapsed ? 'center' : 'left' }}>
        {collapsed ? '📍' : '📍 导航'}
      </div>
      <Menu>
        {items.map((item, i) => (
          <MenuItem
            key={i}
            icon={<span>{item.icon}</span>}
            onClick={() => {
              if (item.key && activeTab === 'micro') setActiveMicroSub(item.key);
            }}
            style={{
              color: 'var(--text-secondary)', fontSize: 13,
              borderRadius: 8, margin: '2px 8px',
              backgroundColor: 'transparent',
            }}
            active={false}
          >
            {collapsed ? '' : item.label}
          </MenuItem>
        ))}
      </Menu>

      <div style={{ padding: collapsed ? '12px 10px 6px' : '16px 20px 6px', fontSize:12,fontWeight:700,letterSpacing:1,color:'var(--text-secondary)', textAlign: collapsed ? 'center' : 'left' }}>
        {collapsed ? '◈' : '◈ 主题切换'}
      </div>
      <div style={{ display:'flex', gap:8, padding: collapsed ? '8px 10px' : '8px 20px', justifyContent: collapsed ? 'center' : 'flex-start', flexWrap:'wrap' }}>
        {themes.map((t, i) => (
          <div key={t} onClick={() => setTheme(t)}
            style={{
              width: collapsed ? 16 : 24, height: collapsed ? 16 : 24, borderRadius:'50%', cursor:'pointer',
              border: theme===t ? '2px solid var(--accent-gold)' : '2px solid transparent',
              background: themeColors[i],
            }}
          />
        ))}
      </div>
    </Sidebar>
  );
}

export default function SidebarWrapper() {
  return <SidebarContent />;
}
