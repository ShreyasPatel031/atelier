# website_scraper Module Documentation

The `website_scraper` module provides a specialized tool for scraping website content using the Firecrawl v2 API. It encapsulates the functionality required to interact with the Firecrawl service, allowing other CrewAI components, particularly agents, to programmatically extract information from webpages.

## Purpose and Core Functionality

The primary purpose of this module is to offer a robust and configurable web scraping capability. Its core component, `FirecrawlScrapeWebsiteTool`, integrates directly with the Firecrawl API, enabling the extraction of formatted content (e.g., Markdown) from specified URLs.

### `FirecrawlScrapeWebsiteTool`

This class is a `BaseTool` (inherited from the [crewai_tool_base](crewai_tool_base.md) module) designed for web scraping. It allows users to:
*   **Scrape Webpages:** Provide a URL and retrieve its content, processed by the Firecrawl API.
*   **Configure Scraping Behavior:** Control various aspects of the scraping process through a `config` dictionary, including:
    *   `formats`: Desired output formats (e.g., `["markdown"]`).
    *   `only_main_content`: Option to extract only the main content of the page, excluding headers, footers, etc.
    *   `include_tags`, `exclude_tags`: Specific HTML tags to include or exclude.
    *   `max_age`: Caching duration for scraped content.
    *   `headers`: Custom HTTP headers for the request.
    *   `mobile`: Emulate mobile device scraping.
    *   `block_ads`: Enable ad and cookie popup blocking.
    *   `proxy`: Specify proxy type for requests.
    *   And many more, as detailed in the Firecrawl v2 API documentation.
*   **Dependency Management:** It automatically prompts the user to install the `firecrawl-py` package if it's not found, ensuring a smooth setup process.
*   **API Key Management:** Requires a `FIRECRAWL_API_KEY` to authenticate with the Firecrawl service, which can be provided during initialization or via environment variables.

## Architecture and Component Relationships

The `website_scraper` module is a leaf module within the [firecrawl_integration](firecrawl_integration.md) hierarchy. Its main component, `FirecrawlScrapeWebsiteTool`, leverages the `firecrawl-py` library to perform the actual API calls to Firecrawl. It adheres to the `BaseTool` interface provided by the [crewai_tool_base](crewai_tool_base.md) module, making it seamlessly integratable into the CrewAI framework.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "firecrawl_scrape_website_tool", "label": "FirecrawlScrapeWebsiteTool", "type": "component", "link": null},
        {"id": "crewai_tool_base_module", "label": "crewai_tool_base", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "firecrawl_py_lib", "label": "FirecrawlApp (firecrawl-py library)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "firecrawl_scrape_website_tool", "target": "crewai_tool_base_module"},
        {"source": "firecrawl_scrape_website_tool", "target": "firecrawl_py_lib"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    firecrawl_scrape_website_tool[FirecrawlScrapeWebsiteTool]
    crewai_tool_base_module[crewai_tool_base]
    firecrawl_py_lib[FirecrawlApp (firecrawl-py library)]

    firecrawl_scrape_website_tool --> crewai_tool_base_module
    firecrawl_scrape_website_tool --> firecrawl_py_lib
```