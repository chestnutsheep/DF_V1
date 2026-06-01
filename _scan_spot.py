"""Scan akshare spot price functions."""
import akshare as ak
funcs = [x for x in dir(ak) if 'spot' in x.lower() or '现货' in x or 'commodity' in x.lower() or '商品' in x or 'price' in x.lower()]
for f in sorted(funcs):
    doc = getattr(ak, f).__doc__ or ''
    if doc:
        print(f'{f:50s} {doc[:80]}')
