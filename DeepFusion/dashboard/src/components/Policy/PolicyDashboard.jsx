import React, { useState, useEffect, useRef } from 'react';
import { useMCP } from '../../hooks/useMCP';
import CardWrapper from '../common/CardWrapper';
import '../../styles/policy-dashboard.css';

const POLICY_DATA = {
  'jan-foreign-reserve': { tag: '金融数据', title: '国家外汇储备数据', time: '1月', dept: '外汇管理局', importance: 3 },
  'feb-no1-document': { tag: '三农政策', title: '中央一号文件', time: '1-2月', dept: '中共中央、国务院', importance: 5 },
  'mar-government-report': { tag: '宏观经济', title: '政府工作报告', time: '3月', dept: '国务院', importance: 5 },
  'apr-monetary-report': { tag: '货币政策', title: 'Q1货币政策报告', time: '4月', dept: '央行', importance: 4 },
  'may-central-bank-report': { tag: '金融稳定', title: '央行年报/金融稳定报告', time: '5月', dept: '央行', importance: 4 },
  'jul-half-year-economy': { tag: '经济数据', title: '上半年经济运行数据', time: '7月', dept: '国家统计局', importance: 4 },
  'aug-monetary-report': { tag: '货币政策', title: 'Q2货币政策报告', time: '8月', dept: '央行', importance: 4 },
  'sep-monetary-report': { tag: '货币政策', title: 'Q3货币政策报告', time: '9月', dept: '央行', importance: 4 },
  'oct-statistical-yearbook': { tag: '统计数据', title: '中国统计年鉴', time: '10月', dept: '国家统计局', importance: 3 },
  'nov-monetary-report': { tag: '货币政策', title: 'Q4货币政策报告', time: '11月', dept: '央行', importance: 4 },
  'dec-full-year-economy': { tag: '经济数据', title: '全年经济运行数据', time: '12月', dept: '国家统计局', importance: 5 },
};

const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const POLICY_BY_MONTH = ['jan-foreign-reserve','feb-no1-document','mar-government-report','apr-monetary-report','may-central-bank-report',null,'jul-half-year-economy','aug-monetary-report','sep-monetary-report','oct-statistical-yearbook','nov-monetary-report','dec-full-year-economy'];
const FIVE_YEAR_PLAN = { currentStage: '开局起步期 · 夯实基础' };

function extractKeywords(line) {
  const m = line.match(/\[(.+?)\]/);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim()).filter(Boolean);
}
function extractUrl(line) {
  const parts = line.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  if (last && (last.startsWith('http://') || last.startsWith('https://'))) return last;
  return '';
}

export default function PolicyDashboard() {
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('policyFavorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [hoverCard, setHoverCard] = useState({ show: false, x: 0, y: 0, policy: null, keywords: [] });
  const [timelineYear, setTimelineYear] = useState(new Date().getFullYear());

  const stats = useMCP('policy_stats');
  const search = useMCP('policy_search', { limit: 30, year: timelineYear });
  const realStats = stats.data || '';
  const realDocs = (search.data || '').split('\n').slice(1).filter(Boolean);

  // 年进度计算
  const now = new Date();
  const planStart = new Date(2026, 0, 1);
  const planEnd = new Date(2030, 11, 31);
  const totalDays = (planEnd - planStart) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now - planStart) / (1000 * 60 * 60 * 24);
  const progress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
  const remainingMs = planEnd - now;
  const rDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const rYears = Math.floor(rDays / 365);
  const rMonths = Math.floor((rDays % 365) / 30);
  const rFinalDays = rDays % 30;

  useEffect(() => {
    localStorage.setItem('policyFavorites', JSON.stringify([...favorites]));
  }, [favorites]);

  const toggleFav = (e, key) => {
    e.stopPropagation();
    setFavorites(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  // 悬浮卡片：从真实数据提取关键词
  const showHover = (e, policy, docLines) => {
    const keywords = [];
    if (docLines) {
      for (const line of docLines) {
        const kw = extractKeywords(line);
        keywords.push(...kw);
      }
    }
    setHoverCard({ show: true, x: e.clientX + 12, y: e.clientY - 16, policy, keywords: [...new Set(keywords)].slice(0, 8) });
  };
  const moveHover = (e) => { if (hoverCard.show) setHoverCard(p => ({ ...p, x: e.clientX + 12, y: e.clientY - 16 })); };
  const hideHover = () => setHoverCard(p => ({ ...p, show: false }));

  const renderMonthNode = (monthIdx, policyKey) => {
    const isQuarter = [2, 5, 8, 11].includes(monthIdx);
    // 非季度点 → 小刻度线
    if (!policyKey) return (
      <div key={`e-${monthIdx}`} className="timeline-node" style={{ left: `${(monthIdx / 11) * 100}%` }}>
        {isQuarter ? (
          <div className="node-dot" style={{ width: 10, height: 10, borderStyle: 'dashed' }} />
        ) : (
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.3 }} />
        )}
      </div>
    );
    const p = POLICY_DATA[policyKey];
    const isCompleted = monthIdx < now.getMonth();
    const isCurrent = monthIdx === now.getMonth();
    const isFav = favorites.has(policyKey);
    let cls = `node-dot importance-${p.importance}`;
    if (isCompleted) cls += ' completed';
    if (isCurrent) cls += ' current';
    if (isFav) cls += ' favorite';

    // 非季度有事件月份：只有圆，没有文字标签
    if (!isQuarter) {
      return (
        <div key={policyKey} className="timeline-node" style={{ left: `${(monthIdx / 11) * 100}%` }}
          onMouseEnter={(e) => showHover(e, p, realDocs)} onMouseMove={moveHover} onMouseLeave={hideHover}>
          <div className={cls} onClick={(e) => toggleFav(e, policyKey)}>
            {isFav && <span className="favorite-star">★</span>}
          </div>
        </div>
      );
    }

    // 季度点 → 大粗体文字标签
    return (
      <div key={policyKey} className="timeline-node" style={{ left: `${(monthIdx / 11) * 100}%` }}
        onMouseEnter={(e) => showHover(e, p, realDocs)} onMouseMove={moveHover} onMouseLeave={hideHover}>
        <div className={cls} onClick={(e) => toggleFav(e, policyKey)}>
          {isFav && <span className="favorite-star">★</span>}
        </div>
        <div className="node-label" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
          {String(monthIdx + 1).padStart(2, '0')}
        </div>
      </div>
    );
  };

  return (
    <div className="policy-dashboard-container" onMouseMove={moveHover}>
      {/* 顶部卡片 */}
      <div className="top-cards">
        <div className="card countdown-card">
          <h3>📅 十五五规划进度</h3>
          <div className="countdown-days">{progress.toFixed(1)}%</div>
          <div className="card-subtitle">剩余 {rYears}年{rMonths}月{rFinalDays}天</div>
          <div className="card-desc">2026 → 2030 · {FIVE_YEAR_PLAN.currentStage}</div>
        </div>
        <div className="card progress-card">
          <h3>📊 十五五规划 · {FIVE_YEAR_PLAN.currentStage}</h3>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
          <div className="progress-info"><span>已完成 {progress.toFixed(1)}%</span><span>剩余 <span className="highlight-text">{rYears}年{rMonths}月</span></span></div>
        </div>
        <div className="card">
          <h3>📂 政策文件库</h3>
          <div className="favorites-count">{realStats.match(/\d+/)?.[0] || '—'}</div>
          <div className="card-subtitle">篇 · 已收藏 {favorites.size} 篇</div>
          {realStats.split('\n').slice(1, 3).map((l, i) => <div key={i} className="card-desc">{l}</div>)}
        </div>
      </div>

      {/* 年度政策时间线 — 带翻年 */}
      <div className="timeline-section">
        <div className="year-label">📋 {timelineYear} 年政策时间线</div>
        <div className="annual-timeline">
          <button className="year-arrow left" onClick={() => setTimelineYear(y => y - 1)}>◀</button>
          <div className="timeline-track">
            <div className="timeline-line"></div>
            <div className="timeline-nodes">
              {MONTH_KEYS.map((_, i) => renderMonthNode(i, POLICY_BY_MONTH[i]))}
            </div>
          </div>
          <button className="year-arrow right" onClick={() => setTimelineYear(y => y + 1)}>▶</button>
        </div>
        <div className="importance-legend">
          <div className="legend-item"><div className="legend-dot importance-5"></div><span>★★★★ 高</span></div>
          <div className="legend-item"><div className="legend-dot importance-4"></div><span>★★★ 中</span></div>
          <div className="legend-item"><div className="legend-dot importance-3"></div><span>★★ 普通</span></div>
          <div className="legend-item"><div className="legend-dot favorite"></div><span>★ 收藏</span></div>
        </div>
      </div>

      {/* 长周期战略节点 */}
      <div className="timeline-section">
        <h2 className="section-title">🔭 长周期战略节点（2025-2030）</h2>
        <div className="long-cycle-timeline">
          <div className="long-cycle-line"></div>
          <div className="long-cycle-nodes">
            {renderLongCycleNode('2025-15th-plan-proposal', '十五五规划建议', true)}
            {renderLongCycleNode('2026-15th-plan-start', '十五五规划实施', true)}
            {renderLongCycleNode('2027-defense', '国防/人权白皮书', false)}
            {renderLongCycleNode('2028-human-rights', '人权白皮书', false)}
            {renderLongCycleNode('2029-space', '航天白皮书', false)}
            {renderLongCycleNode('2030-16th-plan', '十六五规划建议', true)}
          </div>
        </div>
        <div className="long-cycle-legend">
          <div className="legend-item"><div className="legend-dot major"></div><span>■ 重大战略节点</span></div>
          <div className="legend-item"><div className="legend-dot minor"></div><span>▲ 专题白皮书</span></div>
        </div>
      </div>

      {/* 最新政策文件 */}
      <div className="timeline-section">
        <h2 className="section-title">📄 {timelineYear} 年政策文件</h2>
        <CardWrapper style={{ maxWidth: '50%', display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
          <div style={{ padding: 12 }}>
            {realDocs.length > 0 ? realDocs.slice(0, 10).map((doc, i) => {
              const kw = extractKeywords(doc);
              const date = doc.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
              const filename = doc.replace(/^\s*\d{4}-\d{2}-\d{2}\s*/, '');
              const url = extractUrl(doc);
              return (
              <CardWrapper key={i} as="a" href={url || undefined} target={url ? '_blank' : undefined} rel="noopener noreferrer" truncate hoverable={false}
                style={{ display: 'block', padding: '6px 0', borderBottom: i < Math.min(realDocs.length, 10) - 1 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, textDecoration: 'none', cursor: url ? 'pointer' : 'default', background: 'transparent', backdropFilter: 'none', border: 'none', borderRadius: 0, margin: 0 }}
                onMouseEnter={(e) => {
                  setHoverCard({ show: true, x: e.clientX + 12, y: e.clientY - 16, policy: { title: doc.substring(0, 40), tag: '政策文件', content: doc, impact: kw.slice(0, 5).join('、') }, keywords: kw });
                }} onMouseMove={moveHover} onMouseLeave={hideHover}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{date}</span>
                {kw.length > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-gold)' }}>
                    [{kw.slice(0, 3).join(', ')}{kw.length > 3 ? '…' : ''}]
                  </span>
                )}
                <span style={{ marginLeft: 6 }}>{filename}</span>
              </CardWrapper>
              );
            }) : <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>该年暂无政策数据</div>}
          </div>
        </CardWrapper>
      </div>

      {/* 官方链接 — 上金线 + 单行 */}
      <div className="links-section">
        <div className="links-header"><h2>🔗 官方直达</h2></div>
        <div className="links-container">
          <a href="https://www.gov.cn" target="_blank">中国政府网</a>
          <a href="https://www.stats.gov.cn" target="_blank">国家统计局</a>
          <a href="https://www.pbc.gov.cn" target="_blank">中国人民银行</a>
          <a href="https://www.ndrc.gov.cn" target="_blank">国家发改委</a>
          <a href="https://www.mof.gov.cn" target="_blank">财政部</a>
          <a href="http://www.scio.gov.cn" target="_blank">国务院新闻办</a>
        </div>
      </div>

      {/* 悬浮卡片 */}
      <div className="policy-hover-card" style={{ left: hoverCard.x, top: hoverCard.y, display: hoverCard.show ? 'block' : 'none' }}>
        {hoverCard.policy && (
          <>
            <span className="policy-tag">{hoverCard.policy.tag || '政策文件'}</span>
            <h3 className="policy-title">{hoverCard.policy.title}</h3>
            {hoverCard.policy.time && <div className="policy-meta">发布时间：{hoverCard.policy.time} · {hoverCard.policy.dept}</div>}
            <div className="policy-content">{hoverCard.policy.content && hoverCard.policy.content.length > 100 ? hoverCard.policy.content.substring(0, 100) + '…' : hoverCard.policy.content}</div>
            {hoverCard.keywords.length > 0 && <div className="policy-impact">影响板块：{hoverCard.keywords.join(' · ')}</div>}
            {hoverCard.policy.impact && !hoverCard.keywords.length && <div className="policy-impact">影响领域：{hoverCard.policy.impact}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function renderLongCycleNode(key, label, isMajor) {
  let cls = 'long-cycle-dot' + (isMajor ? ' major' : ' minor');
  return (
    <div key={key} className="long-cycle-node">
      <div className={cls}><span>{isMajor ? '◆' : '▲'}</span></div>
      <div className="long-cycle-label">{label}</div>
    </div>
  );
}
