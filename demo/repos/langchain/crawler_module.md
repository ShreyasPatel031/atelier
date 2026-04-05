# Crawler Module Documentation

## Introduction

The `crawler_module` provides web crawling capabilities, enabling automated interaction with web pages. It leverages the Playwright library to simulate browser actions such as navigating, scrolling, clicking, and typing. This module is a core component within the `web_automation_chains` of the classic Langchain architecture, designed to facilitate agents in understanding and interacting with web content.

## Architecture and Component Relationships

The `crawler_module` primarily consists of the `Crawler` class, which encapsulates all browser automation logic. It interacts directly with the Playwright library to control a Chromium browser instance. The `Crawler` class exposes methods for various web interactions, making it a self-contained unit for web-based data extraction and interaction.

It is part of the `web_automation_chains`, implying its integration into larger workflows that automate web tasks, potentially alongside the `natbot_chain_module` which might use the `Crawler` for its operations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "crawler", "label": "Crawler Class", "type": "component", "link": null},
        {"id": "go_to_page", "label": "go_to_page(url)", "type": "component", "link": null},
        {"id": "scroll", "label": "scroll(direction)", "type": "component", "link": null},
        {"id": "click", "label": "click(id_)", "type": "component", "link": null},
        {"id": "type_method", "label": "type(id_, text)", "type": "component", "link": null},
        {"id": "enter", "label": "enter()", "type": "component", "link": null},
        {"id": "crawl_method", "label": "crawl()", "type": "component", "link": null},
        {"id": "playwright", "label": "Playwright Library", "type": "external", "link": null},
        {"id": "web_automation_chains", "label": "Web Automation Chains", "type": "external", "link": "web_automation_chains.md"},
        {"id": "natbot_chain_module", "label": "Natbot Chain Module", "type": "external", "link": "natbot_chain_module.md"}
    ],
    "edges": [
        {"source": "crawler", "target": "go_to_page"},
        {"source": "crawler", "target": "scroll"},
        {"source": "crawler", "target": "click"},
        {"source": "crawler", "target": "type_method"},
        {"source": "crawler", "target": "enter"},
        {"source": "crawler", "target": "crawl_method"},
        {"source": "crawler", "target": "playwright"},
        {"source": "web_automation_chains", "target": "crawler"},
        {"source": "crawler", "target": "natbot_chain_module"}
    ],
    "groups": [
        {"id": "crawler_components", "label": "Crawler Internal Components", "nodes": ["go_to_page", "scroll", "click", "type_method", "enter", "crawl_method"]}
    ]
}
-->

```mermaid
graph TD
    crawler[Crawler Class]
    go_to_page[go_to_page(url)]
    scroll[scroll(direction)]
    click[click(id_)]
    type_method[type(id_, text)]
    enter[enter()]
    crawl_method[crawl()]
    playwright(Playwright Library)
    web_automation_chains[Web Automation Chains]
    natbot_chain_module[Natbot Chain Module]

    subgraph Crawler Internal Components
        go_to_page
        scroll
        click
        type_method
        enter
        crawl_method
    end

    crawler --> go_to_page
    crawler --> scroll
    crawler --> click
    crawler --> type_method
    crawler --> enter
    crawler --> crawl_method
    crawler --> playwright
    web_automation_chains --> crawler
    crawler --> natbot_chain_module
```

## Core Functionality

The `Crawler` class provides the following key functionalities:

### `Crawler.__init__()`
Initializes the `Crawler` instance. It ensures that the `playwright` library is installed and starts a headless Chromium browser instance. It also initializes a new page and a buffer for storing page elements.

### `Crawler.go_to_page(url: str)`
Navigates the browser to the specified `url`. It automatically prefixes "http://" if the URL does not contain a scheme. It also initializes a CDP (Chrome DevTools Protocol) session and clears the page element buffer.

### `Crawler.scroll(direction: str)`
Scrolls the current page either "up" or "down" by one viewport height. This is useful for exposing more content on dynamic web pages.

### `Crawler.click(id_: str | int)`
Clicks on a specific element identified by its `id_`. Before clicking, it injects JavaScript to remove `target` attributes from links, ensuring navigation happens within the same tab.

### `Crawler.type(id_: str | int, text: str)`
Types the given `text` into an element identified by `id_`. It first clicks the element and then simulates keyboard input.

### `Crawler.enter()`
Simulates pressing the "Enter" key, often used after typing into an input field to submit a form or trigger an action.

### `Crawler.crawl() -> list[str]`
This is the main method for extracting information from the current page. It captures a DOM snapshot, identifies visible elements within the viewport, and constructs a list of descriptive strings for each element. This includes handling text nodes, input fields, buttons, and links, and consolidating attributes and text content. The method filters out redundant or invisible elements to provide a concise representation of the interactive parts of the page. The security note highlights the potential for arbitrary webpage loading, including local files, and emphasizes the need for access control and minimal permissions. The elements returned are formatted for an agent to interpret and decide on subsequent actions. 

## Usage within the System

The `crawler_module` is integrated into the `classic_chains_specialized.web_automation_chains`. This positions it as a tool for more complex web-based automation tasks, likely used by agents that need to interact with websites to gather information or perform actions. It can be orchestrated by a `natbot_chain_module` or similar agent-driven workflows to automate tasks that require browser interaction. The output of the `crawl()` method provides structured information about the visible elements, which can then be parsed and acted upon by other components of the system, such as decision-making agents or data processing chains.