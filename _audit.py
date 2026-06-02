"""Audit all MCP tools and capture their return data shapes."""
import json, os
for k in ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','all_proxy','SOCKS_PROXY']:
    os.environ.pop(k, None)
import requests

API = 'http://localhost:8080/api/tools/call'

def call(name, args={}):
    try:
        r = requests.post(API, json={'name':name, 'arguments':args}, timeout=60)
        d = r.json()
        if d.get('ok'):
            text = d['data']
            return text[:200] if len(text) > 200 else text
        return f"[error: {d.get('error','?')}]"
    except Exception as e:
        return f"[conn: {e}]"

tools = [
    # 宏观
    ('macro_gdp', {'limit':2}), ('macro_cpi', {'limit':2}), ('macro_pmi', {'limit':2}),
    ('macro_inventory_growth', {'limit':2}), ('macro_fixed_investment', {'limit':2}),
    ('macro_industrial_value_add', {'limit':2}), ('macro_interest_rate', {'limit':2}),
    ('macro_money_supply', {'limit':2}), ('macro_business', {'limit':3}),
    ('macro_growth', {'limit':3}), ('macro_inflation', {'limit':3}),
    ('macro_monetary', {'limit':3}),
    # 周期
    ('data_kitchin', {'limit':1}), ('kitchin_cycle', {}),
    ('data_juglar', {'limit':1}), ('juglar_cycle', {}),
    ('data_kuznets', {'limit':1}), ('kuznets_cycle', {}),
    ('kondratiev_cycle', {}), ('data_kondratiev', {}),
    ('cycle_cache_status', {}),
    # 行业
    ('industry_classify', {'分类标准':'同花顺'}),
    ('industry_quotes', {'industry':'银行','limit':2}),
    ('industry_capital_flow', {'industry':'银行','limit':3}),
    ('industry_daily_query', {'industry':'银行','limit':2}),
    ('industry_sw_tree', {}),
    # 现货
    ('spot_prices', {'symbol':'螺纹钢','limit':2}),
    ('spot_symbols', {}),
    # 财新
    ('caixin_list', {}), ('caixin_indices', {'name':'中国新经济指数','limit':2}),
    # FRED/WB
    ('fred_list', {}), ('fred_data', {'series':'fred_gs10','limit':2}),
    ('wb_list', {}), ('wb_data', {'indicator':'wb_gdp_growth','limit':2}),
    # 多因子
    ('ff_factors', {}),
    # 个股
    ('search', {'keyword':'贵州茅台'}),
    ('individual_hist', {'symbol':'600519','period':'daily'}),
    ('individual_info', {'symbol':'600519'}),
    ('financial_indicators', {'symbol':'600519'}),
    ('financial_statements', {'symbol':'600519'}),
    ('peer_comparison', {'symbol':'600519'}),
    ('capital_tracking', {'symbol':'600519'}),
    ('sentiment_side', {'symbol':'600519'}),
    ('composite_stock_diagnostic', {'symbol':'600519'}),
    ('market_prices', {'symbol':'600519','limit':2}),
    ('market_overview', {'limit':2}),
    # 港股/美股
    ('stock_indicators_hk', {'symbol':'00700'}), ('stock_indicators_us', {'symbol':'AAPL'}),
    # 基金
    ('fund_info', {'limit':2}), ('fund_nav', {'symbol':'110011','limit':2}),
    ('fund_holdings', {'symbol':'110011'}), ('fund_ranking', {'limit':2}),
    # 期货
    ('futures_prices', {'symbol':'RB','limit':2}), ('futures_basis', {'symbol':'RB','limit':2}),
    ('futures_inventory', {'symbol':'RB','limit':2}), ('futures_positions', {'symbol':'RB','limit':2}),
    # 外汇
    ('fx_rates', {}), ('fx_history', {'symbol':'USDCNY','limit':2}),
    # 贵金属
    ('pm_spot_prices', {'limit':2}), ('pm_international_prices', {'limit':2}),
    ('pm_etf_holdings', {}), ('pm_comex_inventory', {}),
    # 政策
    ('policy_stats', {}), ('policy_search', {'limit':2}),
    # 市场
    ('stock_zt_pool_em', {}), ('stock_zt_pool_strong_em', {}),
    ('stock_lhb_ggtj_sina', {}), ('stock_sector_fund_flow_rank', {}),
    ('northbound_funds', {}), ('sector_valuation', {}),
    ('sector_rotation', {}), ('stock_news_global', {}),
    ('market_anomaly_scan', {}), ('margin_balance', {}),
    ('get_current_time', {}),
]

results = {}
for name, args in tools:
    r = call(name, args)
    results[name] = r
    print(f"{name:40s} → {r[:80]}")

with open('/tmp/tool_audit.json', 'w') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
