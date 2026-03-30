import time
#import json
from typing import Any, Optional, Dict, Tuple

# In-memory cache store: key -> (value, expiry_timestamp)
_cache_store: Dict[str, Tuple[Any, float]] = {}

def cache_get(key: str) -> Optional[Any]:
    """Get value from cache if not expired."""
    entry = _cache_store.get(key)
    if entry:
        value, expiry = entry
        if expiry > time.time():
            return value
        else:
            del _cache_store[key]  # Clean up expired entry
    return None

def cache_set(key: str, value: Any, expire: int = 300) -> None:
    """Set value in cache with TTL (seconds)."""
    expiry = time.time() + expire
    _cache_store[key] = (value, expiry)

def cache_delete(key: str) -> None:
    """Delete a key from cache."""
    _cache_store.pop(key, None)

def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a pattern (supports * wildcard)."""
    import fnmatch
    keys_to_delete = [k for k in _cache_store.keys() if fnmatch.fnmatch(k, pattern)]
    for k in keys_to_delete:
        del _cache_store[k]





# import redis
# import json
# from typing import Any, Optional, List

# r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# def cache_get(key: str) -> Optional[Any]:
#     data = r.get(key)
#     return json.loads(data) if data else None

# def cache_set(key: str, value: Any, expire: int = 300) -> None:
#     r.setex(key, expire, json.dumps(value))

# def cache_delete(key: str) -> None:
#     r.delete(key)

# def cache_delete_pattern(pattern: str) -> None:
#     keys = r.keys(pattern)
#     if keys:
#         r.delete(*keys)