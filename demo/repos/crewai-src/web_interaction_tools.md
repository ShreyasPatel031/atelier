# Web Interaction Tools
This module provides a comprehensive suite of tools for interacting with the web, including specialized search engines, advanced scraping utilities, and browser automation capabilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "brave_base", "label": "Brave Search Base", "type": "module"},
        {"id": "brave_local_pois", "label": "Brave Local POIs", "type": "module"},
        {"id": "brave_search", "label": "Brave Web Search", "type": "module"},
        {"id": "brave_llm_headers", "label": "Brave LLM Context Headers", "type": "module"},
        {"id": "brave_local_pois_headers", "label": "Brave Local POIs Headers", "type": "module"},
        {"id": "brave_local_pois_desc_headers", "label": "Brave Local POIs Description Headers", "type": "module"},
        {"id": "brave_video_headers", "label": "Brave Video Search Headers", "type": "module"},
        {"id": "brave_image_headers", "label": "Brave Image Search Headers", "type": "module"},
        {"id": "brave_news_headers", "label": "Brave News Search Headers", "type": "module"},
        {"id": "brave_web_headers", "label": "Brave Web Search Headers", "type": "module"},

        {"id": "brightdata_dataset", "label": "Bright Data Dataset Scraper", "type": "module"},
        {"id": "brightdata_serp", "label": "Bright Data SERP Search", "type": "module"},
        {"id": "brightdata_unlocker", "label": "Bright Data Web Unlocker", "type": "module"},

        {"id": "firecrawl_crawl", "label": "Firecrawl Website Crawler", "type": "module"},
        {"id": "firecrawl_scrape", "label": "Firecrawl Website Scraper", "type": "module"},
        {"id": "firecrawl_search", "label": "Firecrawl Web Search", "type": "module"},

        {"id": "oxylabs_amazon_product", "label": "Oxylabs Amazon Product Scraper", "type": "module"},
        {"id": "oxylabs_amazon_search", "label": "Oxylabs Amazon Search Scraper", "type": "module"},
        {"id": "oxylabs_google_search", "label": "Oxylabs Google Search Scraper", "type": "module"},
        {"id": "oxylabs_universal", "label": "Oxylabs Universal Scraper", "type": "module"},

        {"id": "serply_job_search", "label": "Serply Job Search", "type": "module"},
        {"id": "serply_news_search", "label": "Serply News Search", "type": "module"},
        {"id": "serply_scholar_search", "label": "Serply Scholar Search", "type": "module"},
        {"id": "serply_web_search", "label": "Serply Web Search", "type": "module"},

        {"id": "browserbase_load", "label": "Browserbase Web Loader", "type": "module"},
        {"id": "exa_search", "label": "Exa Web Search", "type": "module"},
        {"id": "hyperbrowser_load", "label": "Hyperbrowser Web Loader", "type": "module"},
        {"id": "jina_scrape", "label": "Jina Scrape Website", "type": "module"},
        {"id": "scrape_element", "label": "Scrape Specific Element", "type": "module"},
        {"id": "scrape_element_schema", "label": "Scrape Element Schema", "type": "module"},
        {"id": "scrape_website", "label": "Scrape Entire Website", "type": "module"},
        {"id": "scrape_website_schema", "label": "Scrape Website Schema", "type": "module"},
        {"id": "scrapegraph_scrape", "label": "Scrapegraph AI Scraper", "type": "module"},
        {"id": "scrapegraph_scrape_schema", "label": "Scrapegraph Scrape Schema", "type": "module"},
        {"id": "scrapfly_scrape", "label": "Scrapfly Website Scraper", "type": "module"},
        {"id": "selenium_scrape", "label": "Selenium Website Scraper", "type": "module"},
        {"id": "selenium_scrape_schema", "label": "Selenium Scrape Schema", "type": "module"},
        {"id": "spider_tool", "label": "Spider Website Scraper/Crawler", "type": "module"},

        {"id": "multion_tool", "label": "Multion Browser Automation", "type": "module"},
        {"id": "parallel_search", "label": "Parallel Web Search", "type": "module"},
        {"id": "stagehand_tool", "label": "Stagehand Web Automation", "type": "module"},
        {"id": "mock_stagehand", "label": "Mock Stagehand (Internal)", "type": "module"},
        {"id": "serpapi_base", "label": "SerpApi Base Tool", "type": "module"},
        {"id": "serper_dev_search", "label": "Serper Dev Web Search", "type": "module"},
        {"id": "serper_scrape_website", "label": "Serper Scrape Website", "type": "module"},
        {"id": "tavily_extractor", "label": "Tavily Content Extractor", "type": "module"},
        {"id": "tavily_search", "label": "Tavily Web Search", "type": "module"}
    ],
    "edges": [
        {"source": "brave_base", "target": "brave_local_pois", "label": "extends"},
        {"source": "brave_base", "target": "brave_search", "label": "implements"},
        {"source": "brave_base", "target": "brave_llm_headers", "label": "uses schema"},
        {"source": "brave_base", "target": "brave_local_pois_headers", "label": "uses schema"},
        {"source": "brave_base", "target": "brave_local_pois_desc_headers", "label": "uses schema"},
        {"source": "brave_base", "target": "brave_video_headers", "label": "uses schema"},
        {"source": "brave_base", "target": "brave_image_headers", "label": "uses schema"},
        {"source": "brave_base", "target": "brave_news_headers", "label": "uses schema"},
        {"source": "brave_base", "target": "brave_web_headers", "label": "uses schema"},

        {"source": "scrape_element", "target": "scrape_element_schema", "label": "uses"},
        {"source": "scrape_website", "target": "scrape_website_schema", "label": "uses"},
        {"source": "scrapegraph_scrape", "target": "scrapegraph_scrape_schema", "label": "uses"},
        {"source": "selenium_scrape", "target": "selenium_scrape_schema", "label": "uses"},
        {"source": "stagehand_tool", "target": "mock_stagehand", "label": "uses in test"}
    ],
    "groups": [
        {
            "id": "brave_search_tools",
            "label": "Brave Search Tools",
            "role": "generative",
            "nodes": [
                "brave_base", "brave_local_pois", "brave_search",
                "brave_llm_headers", "brave_local_pois_headers", "brave_local_pois_desc_headers",
                "brave_video_headers", "brave_image_headers", "brave_news_headers", "brave_web_headers"
            ]
        },
        {
            "id": "brightdata_tools",
            "label": "Bright Data Tools",
            "role": "generative",
            "nodes": [
                "brightdata_dataset", "brightdata_serp", "brightdata_unlocker"
            ]
        },
        {
            "id": "firecrawl_tools",
            "label": "Firecrawl Tools",
            "role": "generative",
            "nodes": [
                "firecrawl_crawl", "firecrawl_scrape", "firecrawl_search"
            ]
        },
        {
            "id": "oxylabs_tools",
            "label": "Oxylabs Tools",
            "role": "generative",
            "nodes": [
                "oxylabs_amazon_product", "oxylabs_amazon_search",
                "oxylabs_google_search", "oxylabs_universal"
            ]
        },
        {
            "id": "serply_tools",
            "label": "Serply Search Tools",
            "role": "generative",
            "nodes": [
                "serply_job_search", "serply_news_search",
                "serply_scholar_search", "serply_web_search"
            ]
        },
        {
            "id": "general_web_scraping_loading",
            "label": "General Web Scraping & Loading",
            "role": "analytical",
            "nodes": [
                "browserbase_load", "exa_search", "hyperbrowser_load", "jina_scrape",
                "scrape_element", "scrape_element_schema", "scrape_website", "scrape_website_schema",
                "scrapegraph_scrape", "scrapegraph_scrape_schema", "scrapfly_scrape",
                "selenium_scrape", "selenium_scrape_schema", "spider_tool"
            ]
        },
        {
            "id": "advanced_automation_search",
            "label": "Advanced Automation & Search",
            "role": "generative",
            "nodes": [
                "multion_tool", "parallel_search", "stagehand_tool", "mock_stagehand",
                "serpapi_base", "serper_dev_search", "serper_scrape_website",
                "tavily_extractor", "tavily_search"
            ]
        }
    ]
}
-->