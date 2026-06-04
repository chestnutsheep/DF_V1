import React, { useState, useEffect, useRef } from 'react';
import { useQueryMCP } from '../../hooks/useQueryMCP';
import './PolicyDashboard.css';

// ==================== 基础数据配置 ====================
const POLICY_DATA = {
  'jan-foreign-reserve': {
    tag: '金融数据',
    title: '国家外汇储备数据',
    time: '每年1月7日左右',
    dept: '国家外汇管理局',
    content: '发布上月末国家外汇储备规模、黄金储备等数据，反映国际收支状况和外汇市场运行情况，是观察人民币汇率稳定性和跨境资本流动的重要指标。',
    impact: '外汇市场、人民币汇率、货币政策'
  },
  'feb-no1-document': {
    tag: '三农政策',
    title: '中央一号文件',
    time: '每年1-2月',
    dept: '中共中央、国务院',
    content: '专门指导"三农"工作的纲领性文件，聚焦农业农村发展重点任务，部署粮食安全、乡村振兴、农业现代化等工作，是全年农业农村工作的总遵循。',
    impact: '农业、农村经济、粮食安全、乡村振兴'
  },
  'mar-government-report': {
    tag: '宏观经济',
    title: '政府工作报告',
    time: '每年3月',
    dept: '国务院',
    content: '在全国人民代表大会上发布，总结上一年政府工作，提出当年经济社会发展总体要求、政策取向和重点工作任务，设定GDP、就业、物价等核心目标。',
    impact: '宏观经济、财政政策、货币政策、行业发展'
  },
  'apr-monetary-report': {
    tag: '货币政策',
    title: '第一季度货币政策执行报告',
    time: '每年4月中旬',
    dept: '中国人民银行',
    content: '总结上一季度货币政策执行情况，分析国内外经济金融形势，阐述下一阶段货币政策取向，是了解央行政策思路的最权威文件。',
    impact: '货币政策、利率、流动性、银行业'
  },
  'may-central-bank-report': {
    tag: '金融稳定',
    title: '中国人民银行年报/金融稳定报告',
    time: '每年5月',
    dept: '中国人民银行',
    content: '全面总结上一年央行工作，分析金融体系运行状况，评估金融风险，提出金融稳定政策建议，同时发布人民币国际化进展情况。',
    impact: '金融稳定、银行业、人民币国际化'
  },
  'jul-half-year-economy': {
    tag: '经济数据',
    title: '上半年国民经济运行情况新闻发布会',
    time: '每年7月15日左右',
    dept: '国家统计局',
    content: '发布上半年GDP、工业增加值、固定资产投资、社会消费品零售总额、居民收入等核心经济数据，全面反映国民经济运行态势。',
    impact: '宏观经济、资本市场、行业政策'
  },
  'aug-monetary-report': {
    tag: '货币政策',
    title: '第二季度货币政策执行报告',
    time: '每年8月中旬',
    dept: '中国人民银行',
    content: '总结第二季度货币政策执行情况，分析国内外经济金融最新变化，阐述下一阶段货币政策取向和操作思路。',
    impact: '货币政策、利率、流动性、资本市场'
  },
  'sep-monetary-report': {
    tag: '货币政策',
    title: '第三季度货币政策执行报告',
    time: '每年9月中旬',
    dept: '中国人民银行',
    content: '总结第三季度货币政策执行情况，评估经济金融形势，预判未来走势，明确四季度货币政策重点方向。',
    impact: '货币政策、利率、流动性、房地产'
  },
  'oct-statistical-yearbook': {
    tag: '统计数据',
    title: '中国统计年鉴',
    time: '每年10月',
    dept: '国家统计局',
    content: '最全面的年度统计资料，收录了全国和各地区上一年经济、社会、科技、文化等各领域的详细统计数据，是研究中国经济社会发展的权威工具书。',
    impact: '经济研究、政策制定、行业分析'
  },
  'nov-monetary-report': {
    tag: '货币政策',
    title: '第四季度货币政策执行报告',
    time: '每年11月中旬',
    dept: '中国人民银行',
    content: '总结全年货币政策执行情况，全面分析国内外经济金融形势，展望下一年货币政策走向，是制定年度投资策略的重要参考。',
    impact: '货币政策、利率、流动性、资本市场'
  },
  'dec-full-year-economy': {
    tag: '经济数据',
    title: '全年国民经济运行情况新闻发布会',
    time: '每年12月中旬',
    dept: '国家统计局',
    content: '发布全年国民经济运行核心数据，包括GDP总量及增速、工业、投资、消费、就业、物价等，全面总结全年经济发展成果。',
    impact: '宏观经济、资本市场、政策制定'
  }
};

// 长周期战略节点数据（2025-2030）
const LONG_CYCLE_DATA = {
  '2025-15th-plan-proposal': {
    tag: '五年规划',
    title: '十五五规划建议发布',
    time: '2025年10月',
    dept: '中共中央',
    content: '发布《中共中央关于制定国民经济和社会发展第十五个五年规划的建议》，明确十五五时期的指导思想、基本原则和主要目标。',
    impact: '国家战略、产业布局、投资方向'
  },
  '2026-15th-plan-start': {
    tag: '五年规划',
    title: '十五五规划正式实施',
    time: '2026年1月',
    dept: '全国人民代表大会',
    content: '《中华人民共和国国民经济和社会发展第十五个五年规划纲要》正式实施，部署2026-2030年经济社会发展重大任务。',
    impact: '国家战略、产业发展、区域规划'
  },
  '2027-defense-white-paper': {
    tag: '国防白皮书',
    title: '中国的国防白皮书',
    time: '2027年',
    dept: '国务院新闻办公室',
    content: '全面介绍中国国防政策、军队建设成就和国际安全合作，阐述中国坚持走和平发展道路的决心。',
    impact: '国家安全、国际形势、国防工业'
  },
  '2027-human-rights-white-paper': {
    tag: '人权白皮书',
    title: '中国人权事业进展白皮书',
    time: '2027年',
    dept: '国务院新闻办公室',
    content: '全面展示中国人权事业发展成就，介绍中国在经济、社会、文化权利等方面的进展。',
    impact: '国家治理、国际形象'
  },
  '2028-defense-white-paper': {
    tag: '国防白皮书',
    title: '中国的国防白皮书',
    time: '2028年',
    dept: '国务院新闻办公室',
    content: '更新中国国防政策和军队建设情况，回应国际社会关切。',
    impact: '国家安全、国防工业'
  },
  '2028-human-rights-white-paper': {
    tag: '人权白皮书',
    title: '中国人权事业进展白皮书',
    time: '2028年',
    dept: '国务院新闻办公室',
    content: '持续展示中国人权事业发展新进展。',
    impact: '国家治理、国际形象'
  },
  '2029-space-white-paper': {
    tag: '航天白皮书',
    title: '中国的航天白皮书',
    time: '2029年',
    dept: '国务院新闻办公室',
    content: '介绍中国航天事业发展成就和未来规划，包括载人航天、月球探测、火星探测等重大工程。',
    impact: '航天产业、科技发展'
  },
  '2030-16th-plan-proposal': {
    tag: '五年规划',
    title: '十六五规划建议发布',
    time: '2030年10月',
    dept: '中共中央',
    content: '启动第十六个五年规划编制工作，发布规划建议，展望2031-2035年发展蓝图。',
    impact: '国家战略、长远发展'
  }
};

const NEXT_POLICIES = [
  { month: 0, day: 7, name: '国家外汇储备数据' },
  { month: 1, day: 20, name: '中央一号文件' },
  { month: 2, day: 5, name: '政府工作报告' },
  { month: 3, day: 15, name: 'Q1货币政策执行报告' },
  { month: 4, day: 20, name: '央行年报' },
  { month: 6, day: 15, name: '上半年经济数据' },
  { month: 7, day: 15, name: 'Q2货币政策执行报告' },
  { month: 9, day: 15, name: 'Q3货币政策执行报告' },
  { month: 9, day: 20, name: '中国统计年鉴' },
  { month: 11, day: 15, name: 'Q4货币政策执行报告' },
  { month: 11, day: 20, name: '中央经济工作会议' }
];

const FIVE_YEAR_PLAN = {
  name: '十五五规划',
  startYear: 2026,
  endYear: 2030,
  currentStage: '开局起步期 · 夯实基础'
};

// ==================== 主组件 ====================
const PolicyDashboard = () => {
  // 仪表盘核心数据
  const [dashboardData, setDashboardData] = useState({
    progressPercent: 0,
    remainingTime: '',
    nextPolicyName: '',
    countdownDays: 0,
    currentMonth: new Date().getMonth()
  });

  // 收藏功能状态（本地持久化）
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('policyFavorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // ── MCP 实时数据（React Query 缓存） ──
  const stats = useQueryMCP('policy_stats');
  const search = useQueryMCP('policy_search', { limit: 15 });
  const realStats = stats.data || '';
  const realDocs = (search.data||'').split('\n').slice(1).filter(Boolean);

  // 悬浮卡片状态
  const hoverCardRef = useRef(null);
  const [hoverCard, setHoverCard] = useState({
    show: false,
    x: 0,
    y: 0,
    policy: POLICY_DATA['jul-half-year-economy']
  });

  // 保存收藏到本地存储
  useEffect(() => {
    localStorage.setItem('policyFavorites', JSON.stringify([...favorites]));
  }, [favorites]);

  // 自动计算仪表盘数据
  useEffect(() => {
    const updateDashboard = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // 五年规划进度计算
      const planStart = new Date(FIVE_YEAR_PLAN.startYear, 0, 1);
      const planEnd = new Date(FIVE_YEAR_PLAN.endYear, 11, 31);
      const totalDays = (planEnd - planStart) / (1000 * 60 * 60 * 24);
      const elapsedDays = (now - planStart) / (1000 * 60 * 60 * 24);
      const progress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));

      // 剩余时间计算
      const remainingMs = planEnd - now;
      const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const remainingYears = Math.floor(remainingDays / 365);
      const remainingMonths = Math.floor((remainingDays % 365) / 30);
      const remainingDaysFinal = remainingDays % 30;

      // 下一个政策倒计时
      let nextPolicy = null;
      let minDays = Infinity;
      NEXT_POLICIES.forEach(policy => {
        const policyDate = new Date(currentYear, policy.month, policy.day);
        if (policyDate > now) {
          const daysUntil = Math.ceil((policyDate - now) / (1000 * 60 * 60 * 24));
          if (daysUntil < minDays) {
            minDays = daysUntil;
            nextPolicy = policy;
          }
        }
      });

      setDashboardData({
        progressPercent: progress.toFixed(1),
        remainingTime: `${remainingYears}年${remainingMonths}个月${remainingDaysFinal}天`,
        nextPolicyName: nextPolicy?.name || '暂无',
        countdownDays: minDays,
        currentMonth
      });
    };

    updateDashboard();
    const timer = setInterval(updateDashboard, 86400000);
    return () => clearInterval(timer);
  }, []);

  // 收藏切换函数
  const toggleFavorite = (e, policyKey) => {
    e.stopPropagation(); // 阻止触发悬浮卡片
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(policyKey)) {
        newFavorites.delete(policyKey);
      } else {
        newFavorites.add(policyKey);
      }
      return newFavorites;
    });
  };

  // 悬浮卡片交互
  const handlePolicyMouseEnter = (e, policyKey, dataSource = POLICY_DATA) => {
    const policy = dataSource[policyKey] || POLICY_DATA['jul-half-year-economy'];
    setHoverCard({
      show: true,
      x: e.clientX + 15,
      y: e.clientY - 20,
      policy
    });
  };

  const handlePolicyMouseMove = (e) => {
    if (hoverCard.show) {
      let x = e.clientX + 15;
      let y = e.clientY - 20;
      
      const cardWidth = hoverCardRef.current?.offsetWidth || 360;
      const cardHeight = hoverCardRef.current?.offsetHeight || 220;
      
      if (x + cardWidth > window.innerWidth) {
        x = e.clientX - cardWidth - 15;
      }
      
      if (y + cardHeight > window.innerHeight) {
        y = window.innerHeight - cardHeight - 10;
      }
      
      setHoverCard(prev => ({ ...prev, x, y }));
    }
  };

  const handlePolicyMouseLeave = () => {
    setHoverCard(prev => ({ ...prev, show: false }));
  };

  // 年度时间线节点渲染
  const renderTimelineNode = (month, policyKey, tooltip, importance) => {
    const isCompleted = month < dashboardData.currentMonth;
    const isCurrent = month === dashboardData.currentMonth;
    const isFavorite = policyKey && favorites.has(policyKey);

    return (
      <div 
        className="timeline-node"
        onMouseEnter={(e) => policyKey && handlePolicyMouseEnter(e, policyKey)}
        onMouseMove={handlePolicyMouseMove}
        onMouseLeave={handlePolicyMouseLeave}
      >
        <div 
          className={`node-dot ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} importance-${importance} ${isFavorite ? 'favorite' : ''}`}
          onClick={(e) => policyKey && toggleFavorite(e, policyKey)}
          title={policyKey ? (isFavorite ? '点击取消收藏' : '点击收藏') : ''}
        >
          {isFavorite && <span className="favorite-star">★</span>}
        </div>
        <div className="node-label">{String(month + 1).padStart(2, '0')}</div>
        <div className="node-tooltip">{tooltip}</div>
      </div>
    );
  };

  // 长周期时间线节点渲染
  const renderLongCycleNode = (year, policyKey, tooltip, isMajor) => {
    const isFavorite = policyKey && favorites.has(policyKey);

    return (
      <div 
        className="long-cycle-node"
        onMouseEnter={(e) => policyKey && handlePolicyMouseEnter(e, policyKey, LONG_CYCLE_DATA)}
        onMouseMove={handlePolicyMouseMove}
        onMouseLeave={handlePolicyMouseLeave}
      >
        <div 
          className={`long-cycle-dot ${isMajor ? 'major' : 'minor'} ${isFavorite ? 'favorite' : ''}`}
          onClick={(e) => policyKey && toggleFavorite(e, policyKey)}
          title={policyKey ? (isFavorite ? '点击取消收藏' : '点击收藏') : ''}
        >
          {isFavorite && <span className="favorite-star">★</span>}
        </div>
        <div className="long-cycle-label">{year}</div>
        <div className="node-tooltip">{tooltip}</div>
      </div>
    );
  };

  return (
    <div className="policy-dashboard-container">
      {/* 顶部卡片区域 */}
      <div className="top-cards">
        {/* 倒计时卡片 */}
        <div className="card countdown-card">
          <h3>距离 <span className="highlight-text">{dashboardData.nextPolicyName}</span> 发布还有</h3>
          <div className="countdown-days">{dashboardData.countdownDays}</div>
          <div className="card-subtitle">↑↑ 重点关注</div>
          <p className="card-desc">
            「 定调上半年经济走势，影响下半年政策方向 」
          </p>
        </div>

        {/* 五年规划进度卡片 */}
        <div className="card progress-card">
          <h3>【{FIVE_YEAR_PLAN.name} {FIVE_YEAR_PLAN.startYear}-{FIVE_YEAR_PLAN.endYear}】进度: <span className="highlight-text">{dashboardData.progressPercent}%</span></h3>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${dashboardData.progressPercent}%` }}
            ></div>
          </div>
          <div className="progress-info">
            <span>当前阶段：{FIVE_YEAR_PLAN.currentStage}</span>
            <span>剩余时间：{dashboardData.remainingTime}</span>
          </div>
        </div>

        {/* 收藏统计卡片 */}
        <div className="card favorites-card">
          <h3>我的收藏</h3>
          <div className="favorites-count">{favorites.size}</div>
          <div className="card-subtitle">个重要政策</div>
          <p className="card-desc">
            「 点击时间线圆点即可收藏/取消 」
          </p>
        </div>
      </div>

      {/* 年度时间线区域 */}
      <div className="timeline-section">
        <h2 className="section-title">2026年年度政策时间线</h2>
        <div className="annual-timeline">
          <div className="timeline-line"></div>
          <div className="timeline-nodes">
            {renderTimelineNode(0, 'jan-foreign-reserve', '外储数据/Q4经济数据', 3)}
            {renderTimelineNode(1, 'feb-no1-document', '中央一号文件/统计公报', 5)}
            {renderTimelineNode(2, 'mar-government-report', '政府工作报告/两会文件', 5)}
            {renderTimelineNode(3, 'apr-monetary-report', 'Q1货币政策执行报告', 4)}
            {renderTimelineNode(4, 'may-central-bank-report', '央行年报/金融稳定报告', 4)}
            {renderTimelineNode(5, null, '当前位置', 2)}
            {renderTimelineNode(6, 'jul-half-year-economy', '上半年经济数据 ◁ 下一个', 5)}
            {renderTimelineNode(7, 'aug-monetary-report', 'Q2货币政策执行报告', 4)}
            {renderTimelineNode(8, 'sep-monetary-report', 'Q3货币政策执行报告', 4)}
            {renderTimelineNode(9, 'oct-statistical-yearbook', '中国统计年鉴', 3)}
            {renderTimelineNode(10, 'nov-monetary-report', 'Q4货币政策执行报告', 4)}
            {renderTimelineNode(11, 'dec-full-year-economy', '全年经济数据/中央经济工作会', 5)}
          </div>
        </div>

        {/* 重要性图例 */}
        <div className="importance-legend">
          <div className="legend-item">
            <div className="legend-dot importance-5"></div>
            <span>★★★★★ 最高重要性</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot importance-4"></div>
            <span>★★★★ 高重要性</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot importance-3"></div>
            <span>★★★ 中等重要性</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot importance-2"></div>
            <span>★★ 普通重要性</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot favorite"></div>
            <span>★ 已收藏</span>
          </div>
        </div>
      </div>

      {/* 新增：长周期战略时间线 */}
      <div className="timeline-section">
        <h2 className="section-title">长周期战略节点（2025-2030）</h2>
        <div className="long-cycle-timeline">
          <div className="long-cycle-line"></div>
          <div className="long-cycle-nodes">
            {renderLongCycleNode(2025, '2025-15th-plan-proposal', '十五五规划建议发布', true)}
            {renderLongCycleNode(2026, '2026-15th-plan-start', '十五五规划正式实施', true)}
            {renderLongCycleNode(2027, '2027-defense-white-paper', '国防/人权白皮书', false)}
            {renderLongCycleNode(2028, '2028-defense-white-paper', '国防/人权白皮书', false)}
            {renderLongCycleNode(2029, '2029-space-white-paper', '中国航天白皮书', false)}
            {renderLongCycleNode(2030, '2030-16th-plan-proposal', '十六五规划建议发布', true)}
          </div>
        </div>

        {/* 长周期图例 */}
        <div className="long-cycle-legend">
          <div className="legend-item">
            <div className="legend-dot major"></div>
            <span>■ 重大战略节点</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot minor"></div>
            <span>▲ 专题白皮书</span>
          </div>
        </div>
      </div>

      {/* 官方链接区域 */}
      <div className="links-section">
        <h2 className="section-title">🔗 官方直达链接</h2>
        <div className="links-container">
          <a href="https://www.gov.cn" target="_blank" rel="noopener noreferrer">中国政府网</a>
          <a href="https://www.stats.gov.cn" target="_blank" rel="noopener noreferrer">国家统计局</a>
          <a href="https://www.pbc.gov.cn" target="_blank" rel="noopener noreferrer">中国人民银行</a>
          <a href="https://www.ndrc.gov.cn" target="_blank" rel="noopener noreferrer">国家发改委</a>
          <a href="https://www.mof.gov.cn" target="_blank" rel="noopener noreferrer">财政部</a>
          <a href="http://www.scio.gov.cn" target="_blank" rel="noopener noreferrer">国务院新闻办</a>
        </div>
      </div>

      {/* 悬浮政策卡片 */}
      <div 
        ref={hoverCardRef}
        className={`policy-hover-card ${hoverCard.show ? 'show' : ''}`}
        style={{ left: hoverCard.x, top: hoverCard.y }}
      >
        <span className="policy-tag">{hoverCard.policy.tag}</span>
        <h3 className="policy-title">{hoverCard.policy.title}</h3>
        <div className="policy-meta">
          <span>发布时间：{hoverCard.policy.time}</span>
          <span>发布部门：{hoverCard.policy.dept}</span>
        </div>
        <div className="policy-content">{hoverCard.policy.content}</div>
        <div className="policy-impact">
          核心影响领域：<span className="impact-highlight">{hoverCard.policy.impact}</span>
        </div>
      </div>
    </div>
  );
};

export default PolicyDashboard;
