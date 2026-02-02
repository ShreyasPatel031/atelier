# Clustering Protections (Before/During Clustering Only)

## Overview

Protections that occur **before** or **during** the clustering LLM call. Excludes post-clustering parsing/validation.

---

## Protection 1: Minimum Components Check

**Location:** `cluster_modules.py:175`

```python
if len(leaf_nodes) < MIN_COMPONENTS_FOR_CLUSTERING:  # MIN_COMPONENTS = 3
    # Don't cluster - return single module
    return single_module
```

**Purpose:** Prevents infinite nesting bug when too few components
**Threshold:** 3 components
**Action:** Skip clustering, return single module

---

## Protection 2: Token Count Check (Module Size)

**Location:** `cluster_modules.py:197`

```python
if token_count <= MAX_TOKEN_PER_MODULE:  # MAX_TOKEN_PER_MODULE = 32,768
    # Module fits - use directory-based split or return single module
    return directory_modules or single_module
```

**Purpose:** Skip LLM clustering if module already fits in context
**Threshold:** 32,768 tokens (full file contents)
**Action:** Use directory-based split or return single module (no LLM call)

---

## Protection 3: Prompt Token Truncation

**Location:** `cluster_modules.py:250`

```python
if prompt_tokens > MAX_CLUSTERING_PROMPT_TOKENS:  # MAX_CLUSTERING_PROMPT_TOKENS = 100,000
    # Truncate component list to fit context window
    # Safety margin: 5,000 tokens
    while current_tokens + line_tokens > MAX_CLUSTERING_PROMPT_TOKENS - 5000:
        break
```

**Purpose:** Prevent prompt from exceeding LLM context window
**Threshold:** 100,000 tokens (with 5,000 token safety margin)
**Action:** Truncate component list, rebuild prompt

---

## Protection 4: LLM Exception Handling

**Location:** `cluster_modules.py:313`

**Catches:**
- `TimeoutError` / timeout in error message
- `RateLimitError` / 429 status code
- `ConnectionError` / network errors
- Any other exception

**Action:** Fallback to directory-based clustering

```python
except Exception as e:
    if "timeout" in error_msg.lower():
        logger.error("TIMEOUT DETECTED!")
    elif "429" in error_msg or "rate limit" in error_msg.lower():
        logger.error("RATE LIMIT DETECTED!")
    elif "connection" in error_msg.lower():
        logger.error("NETWORK ERROR DETECTED!")
    
    # Fallback
    return _create_directory_based_modules(...)
```

---

## Protection 5: Recursive Depth Limit

**Location:** `cluster_modules.py:494+` (recursive calls)

**Purpose:** Prevent infinite recursion
**Threshold:** `MAX_DEPTH = 10` (from config)
**Action:** Stop recursing at max depth

---

## Summary Table

| # | Protection | Threshold | Action |
|---|-----------|-----------|--------|
| 1 | Min components | 3 | Skip clustering |
| 2 | Module token count | 32,768 | Skip LLM, use directory split |
| 3 | Prompt tokens | 100,000 | Truncate component list |
| 4 | LLM exceptions | Any | Fallback to directory split |
| 5 | Recursion depth | 10 levels | Stop recursing |

---

## Fallback Strategy

**All protections fall back to:** `_create_directory_based_modules()`

This groups components by top-level directory:
- Deterministic (no LLM needed)
- Always succeeds
- Creates reasonable module structure

---

## What's NOT Protected

1. **No explicit timeout setting** - Relies on underlying HTTP client timeout
2. **No batch processing** - Sends all nodes in single LLM call
3. **No retry logic** - One failure → immediate fallback

---

## Recommendations

1. **Remove 400 threshold** (arbitrary, not tied to constraints)
2. **Add explicit timeout** (e.g., 60s) in LLM call
3. **Add batch processing** for very large node sets (>500)
4. **Add retry logic** for transient failures (rate limits, network errors)
