# Search and Scraping Tools
This module provides a comprehensive suite of tools for web search, content extraction, and specialized data retrieval from various online sources, enabling agents to gather and process information efficiently.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "web_search_providers", "label": "Web Search Providers", "type": "module", "link": "web_search_providers.md"},
        {"id": "web_content_extraction", "label": "Web Content Extraction", "type": "module", "link": "web_content_extraction.md"},
        {"id": "specialized_data_search", "label": "Specialized Data Search", "type": "module", "link": "specialized_data_search.md"}
    ],
    "edges": [
        {"source": "web_search_providers", "target": "web_content_extraction", "label": "provides URLs for"},
        {"source": "web_search_providers", "target": "specialized_data_search", "label": "informs"},
        {"source": "specialized_data_search", "target": "web_content_extraction", "label": "extracts from results"}
    ],
    "groups": [
        {"id": "search_capabilities", "label": "Search Capabilities", "role": "surface", "nodes": ["web_search_providers", "specialized_data_search"]},
        {"id": "data_extraction", "label": "Data Extraction", "role": "analytical", "nodes": ["web_content_extraction"]}
    ]
}
-->

```mermaid
flowchart TD
    subgraph search_capabilities["Search Capabilities"]
        web_search_providers["Web Search Providers"]
        specialized_data_search["Specialized Data Search"]
    end

    subgraph data_extraction["Data Extraction"]
        web_content_extraction["Web Content Extraction"]
    end

    web_search_providers -->|'provides URLs for'| web_content_extraction
    web_search_providers -->|'informs'| specialized_data_search
    specialized_data_search -->|'extracts from results'| web_content_extraction

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class web_search_providers,specialized_data_search surface
    class web_content_extraction analytical

    click web_search_providers "web_search_providers.md"
    click web_content_extraction "web_content_extraction.md"
    click specialized_data_search "specialized_data_search.md"
```