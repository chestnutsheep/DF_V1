import { useState, useEffect } from 'react';
import { useMCP } from '../../hooks/useMCP';
import DataGrid from '../common/DataGrid';
import DataChart from '../common/DataChart';
import { STOCK_FINANCE_CONFIG } from '../../configs/stockFinance';

function parseKline(csv) {
  if (!csv) return [];
  const match = csv.match(/=== K线数据 ===\n([\s\S]+?)\n\n/);
  if (!match) return [];
  const lines = match[1].trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  const dateIdx = headers.findIndex(h => h === '日期' || h === 'date');
  const closeIdx = headers.findIndex(h => h === '收盘' || h === 'close');
  const volumeIdx = headers.findIndex(h => h === '成交量' || h === 'volume');
  if (closeIdx === -1) return [];
  return lines.slice(1).map(l => {
    const parts = l.split(',');
    return {
      period: dateIdx !== -1 ? parts[dateIdx]?.slice(5) : '',
      close: parseFloat(parts[closeIdx]),
      volume: volumeIdx !== -1 ? parseInt(parts[volumeIdx]) : 0,
    };
  }).filter(d => !isNaN(d.close)).slice(-120);
}

function parseFinancial(csv) {
  if (!csv) return {};
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split(',');
  const last = lines[lines.length - 1].split(',');
  const result = {};
  headers.forEach((h, i) => { result[h] = last[i]; });
  return {
    revenue_growth: parseFloat(result['主营业务收入增长率(%)']),
    profit_growth: parseFloat(result['净利润增长率(%)']),
    roe: parseFloat(result['净资产收益率(%)']),
    gross_margin: parseFloat(result['销售毛利率(%)']),
  };
}

export default function StockPanel() {
  const [keyword, setKeyword] = useState('贵州茅台');
  const [symbol, setSymbol] = useState('600519');
  const [stockName, setStockName] = useState('贵州茅台');
  const { data: searchRes, refetch } = useMCP('search', { keyword, market: 'sh' });
  const { data: klineRaw } = useMCP('individual_hist', { symbol, period: 'daily', limit: 120 });
  const { data: finRaw } = useMCP('financial_indicators', { symbol });

  useEffect(() => {
    if (searchRes) {
      const lines = searchRes.trim().split('\n');
      let code = symbol, name = keyword;
      for (const line of lines) {
        if (line.startsWith('code')) code = line.split(/\s+/)[1] || code;
        if (line.startsWith('name')) name = line.split(/\s+/)[1] || name;
      }
      if (code !== symbol) setSymbol(code);
      if (name !== stockName) setStockName(name);
    }
  }, [searchRes]);

  const klineData = parseKline(klineRaw);
  const finData = parseFinancial(finRaw);
  const chartSeries = [{ key: 'close', name: '收盘价', color: '#d2991d', type: 'line' }];

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && refetch()}
          placeholder="股票代码/名称"
          style={{ flex: 1, padding: '8px 14px', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}
        />
        <button onClick={() => refetch()} style={{ padding: '8px 22px', borderRadius: 20, background: 'var(--accent-gold)', color: '#000', border: 'none', cursor: 'pointer' }}>🔍 查询</button>
      </div>
      <div style={{ marginBottom: 20, padding: '12px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{stockName}</span>
        <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>{symbol}.SH</span>
      </div>
      <DataChart data={klineData} series={chartSeries} dateKey="period" height={300} />
      <DataGrid config={STOCK_FINANCE_CONFIG} data={finData} prevData={{}} columns={4} gap={16} />
    </div>
  );
}