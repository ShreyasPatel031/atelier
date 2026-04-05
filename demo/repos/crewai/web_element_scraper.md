# web_element_scraper Module Documentation

## Introduction

The `web_element_scraper` module provides the functionality to precisely extract content from specific HTML elements on a given webpage. It is a specialized tool within the CrewAI framework designed for targeted data extraction, making it highly effective for scenarios where only particular parts of a webpage's content are relevant.

## Architecture and Component Relationships

The `web_element_scraper` module primarily consists of two core components: `ScrapeElementFromWebsiteTool` and `ScrapeElementFromWebsiteToolSchema`.

### ScrapeElementFromWebsiteTool

-   **Purpose**: This class is a specialized tool used by agents to scrape content from a specific HTML element identified by a CSS selector on a given website URL. It handles the web request, HTML parsing, and element extraction.
-   **Functionality**:
    -   Inherits from `BaseTool` from the [crewai_tool_base](crewai_tool_base.md) module, integrating seamlessly into the CrewAI ecosystem.
    -   Uses the `requests` library to fetch the HTML content of the target URL.
    -   Leverages the `BeautifulSoup` library for robust HTML parsing and selecting the desired element using a CSS selector.
    -   Automatically includes a set of default HTTP headers to mimic a web browser, ensuring better scraping success.
    -   Supports optional cookies for scraping websites that require session management or authentication.
    -   Can be initialized with a fixed `website_url` and `css_element` or receive them as arguments during its `_run` method.
-   **Dependencies**:
    -   `ScrapeElementFromWebsiteToolSchema`: Used to validate the input parameters for the tool.
    -   `BaseTool`: Provides the foundational structure for CrewAI tools.
    -   `requests`: An external library for making HTTP requests.
    -   `beautifulsoup4`: An external library for parsing HTML and XML documents.

### ScrapeElementFromWebsiteToolSchema

-   **Purpose**: This Pydantic schema defines the mandatory input parameters for the `ScrapeElementFromWebsiteTool`.
-   **Functionality**:
    -   Ensures that both `website_url` (the URL of the website to scrape) and `css_element` (the CSS selector for the element to be scraped) are provided when the tool is invoked.
    -   Inherits from `FixedScrapeElementFromWebsiteToolSchema` (not detailed in this document, but implies a base for fixed-parameter tools).

## How the Module Fits into the Overall System

The `web_element_scraper` module is a crucial part of the `crewai_tools_web_scraping` package, specifically residing within the `basic_web_scraping.element_scraping` submodule. It provides a granular web scraping capability that complements broader scraping tools.

It enables CrewAI agents to perform precise data extraction tasks, such as fetching a specific piece of information (e.g., a product price, an article's main body, a news headline) from a complex web page without needing to process the entire document. This focused approach improves efficiency and reduces computational overhead compared to full-page scraping when only a specific element is needed. It integrates with the larger CrewAI framework as a standard tool, allowing agents to utilize its functionality within their tasks and processes.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "scrape_element_from_website_tool", "label": "ScrapeElementFromWebsiteTool", "type": "component", "link": null},
        {"id": "scrape_element_from_website_tool_schema", "label": "ScrapeElementFromWebsiteToolSchema", "type": "component", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "requests_lib", "label": "requests (Library)", "type": "external", "link": null},
        {"id": "beautifulsoup_lib", "label": "BeautifulSoup (Library)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "scrape_element_from_website_tool", "target": "scrape_element_from_website_tool_schema"},
        {"source": "scrape_element_from_website_tool", "target": "base_tool"},
        {"source": "scrape_element_from_website_tool", "target": "requests_lib"},
        {"source": "scrape_element_from_website_tool", "target": "beautifulsoup_lib"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    scrape_element_from_website_tool[ScrapeElementFromWebsiteTool]
    scrape_element_from_website_tool_schema[ScrapeElementFromWebsiteToolSchema]
    base_tool[BaseTool]:::external
    requests_lib[requests (Library)]:::external
    beautifulsoup_lib[BeautifulSoup (Library)]:::external

    scrape_element_from_website_tool --> scrape_element_from_website_tool_schema
    scrape_element_from_website_tool --> base_tool
    scrape_element_from_website_tool --> requests_lib
    scrape_element_from_website_tool --> beautifulsoup_lib

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```
