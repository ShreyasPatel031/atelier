# cookie_compatibility_wrappers Module Documentation

## Introduction

The `cookie_compatibility_wrappers` module provides essential wrapper classes, `_CookieCompatRequest` and `_CookieCompatResponse`, designed to bridge the gap between `httpx`'s internal `Request` and `Response` objects and Python's standard `http.cookiejar.CookieJar` for seamless cookie management. This module ensures that `httpx`'s rich request and response structures can be used effectively with `CookieJar` operations, facilitating robust and compliant cookie handling within the `httpx` ecosystem.

## Module Architecture

The `cookie_compatibility_wrappers` module consists of two primary components, each serving as an adapter for `CookieJar` compatibility:

### 1. `_CookieCompatRequest`

This class wraps an `httpx._models.Request` instance, presenting an interface that `http.cookiejar.CookieJar` can understand and interact with. It overrides methods like `add_unredirected_header` to ensure that any cookie-related headers added by `CookieJar` are also reflected in the underlying `httpx.Request` object.

### 2. `_CookieCompatResponse`

This class wraps an `httpx._models.Response` instance, providing the necessary `info()` method that returns an `email.message.Message` object, which `http.cookiejar.CookieJar` expects to extract `Set-Cookie` headers. It effectively translates `httpx` response headers into a format consumable by the standard cookie handling mechanisms.

## System Integration

This module plays a crucial role in `httpx`'s cookie management system. It acts as an intermediary, enabling the `httpx._models.Cookies` class (documented in [cookie_jar_management.md](cookie_jar_management.md)) to leverage the full capabilities of `http.cookiejar`. By providing these compatibility wrappers, `httpx` can maintain its internal data structures while still adhering to the standard Python library's cookie handling conventions. This integration ensures consistent and reliable cookie behavior across various HTTP interactions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "cookie_compat_request", "label": "_CookieCompatRequest", "type": "component", "link": null},
        {"id": "cookie_compat_response", "label": "_CookieCompatResponse", "type": "component", "link": null},
        {"id": "request_model", "label": "httpx._models.Request", "type": "external", "link": "http_messages.md"},
        {"id": "response_model", "label": "httpx._models.Response", "type": "external", "link": "http_messages.md"},
        {"id": "cookie_jar_ops", "label": "CookieJar Operations (via cookie_jar_management)", "type": "external", "link": "cookie_jar_management.md"}
    ],
    "edges": [
        {"source": "cookie_compat_request", "target": "request_model", "label": "wraps"},
        {"source": "cookie_compat_response", "target": "response_model", "label": "wraps"},
        {"source": "cookie_jar_ops", "target": "cookie_compat_request", "label": "uses"},
        {"source": "cookie_jar_ops", "target": "cookie_compat_response", "label": "uses"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    cookie_compat_request[_CookieCompatRequest]
    cookie_compat_response[_CookieCompatResponse]
    request_model[httpx._models.Request]
    response_model[httpx._models.Response]
    cookie_jar_ops[CookieJar Operations (via cookie_jar_management)]

    cookie_compat_request -- wraps --> request_model
    cookie_compat_response -- wraps --> response_model
    cookie_jar_ops -- uses --> cookie_compat_request
    cookie_jar_ops -- uses --> cookie_compat_response
```