"""Check Caixin data functions."""
import akshare as ak
funcs = [x for x in dir(ak) if 'caixin' in x.lower() or 'cx_' in x.lower() or '财新' in x]
for f in sorted(funcs):
    doc = getattr(ak, f).__doc__ or ''
    print(f'{f:50s} {doc[:60]}')
