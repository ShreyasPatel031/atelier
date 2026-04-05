# Platform Engines Module

## Introduction
The `platform_engines` module is responsible for abstracting and managing platform-specific webview implementations. It provides a consistent interface for different underlying web rendering engines across various operating systems, ensuring proper lifecycle management, particularly during the destruction of webview instances and their associated windows.

## Architecture Overview
The module's architecture is designed around individual engine implementations, each encapsulating the logic required to interact with a specific platform's web rendering technology. This modular approach allows for easy integration of new webview backends and isolation of platform-specific code.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "gtk_engine", "label": "GTK WebKit Engine", "type": "module", "link": "gtk_engine.md"},
        {"id": "cocoa_engine", "label": "Cocoa WKWebView Engine", "type": "module", "link": "cocoa_engine.md"},
        {"id": "win32_engine", "label": "Win32 Edge Engine", "type": "module", "link": "win32_engine.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    gtk_engine[GTK WebKit Engine]
    cocoa_engine[Cocoa WKWebView Engine]
    win32_engine[Win32 Edge Engine]

    click gtk_engine "gtk_engine.md" "View GTK WebKit Engine Module"
    click cocoa_engine "cocoa_engine.md" "View Cocoa WKWebView Engine Module"
    click win32_engine "win32_engine.md" "View Win32 Edge Engine Module"
```

## Sub-modules

### [GTK WebKit Engine](gtk_engine.md)
This sub-module provides the implementation for integrating with GTK-based WebKit webviews. It handles the creation, destruction, and event handling specific to the GTK toolkit and WebKit rendering engine.

### [Cocoa WKWebView Engine](cocoa_engine.md)
This sub-module contains the logic for utilizing Apple's WKWebView on macOS (Cocoa). It manages the setup and teardown of WKWebView instances and their interaction with the Cocoa application environment.

### [Win32 Edge Engine](win32_engine.md)
This sub-module is responsible for the integration with Microsoft Edge's WebView2 control on Windows (Win32). It handles the necessary COM interfaces and Win32 API calls for embedding and managing the WebView2 component.
