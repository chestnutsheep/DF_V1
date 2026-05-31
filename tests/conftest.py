import pytest


@pytest.fixture(autouse=True)
def _reset_cache_registry():
    from deep_fusion.cache import CacheKey
    saved = dict(CacheKey.ALL)
    CacheKey.ALL.clear()
    yield
    CacheKey.ALL.clear()
    CacheKey.ALL.update(saved)
