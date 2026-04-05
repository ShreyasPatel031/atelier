# arxiv_paper_tool Module Documentation

The `arxiv_paper_tool` module provides a specialized tool, `ArxivPaperTool`, designed to interact with the Arxiv API. This tool allows agents to search for academic papers based on a query, retrieve their metadata, and optionally download the corresponding PDF files. It streamlines the process of accessing and managing research papers directly within a CrewAI application.

## Core Functionality

The primary component of this module is the `ArxivPaperTool` class, which extends the [crewai_tool_base](crewai_tool_base.md)'s `BaseTool`. This tool encapsulates the logic for querying Arxiv and handling the retrieved data.

### `ArxivPaperTool` Class

The `ArxivPaperTool` class offers the following key functionalities:

-   **Search and Metadata Retrieval**: It can execute a search query against the Arxiv API and retrieve essential metadata for academic papers, including title, authors, publication date, summary, and PDF URL.
-   **PDF Download**: Optionally, the tool can download the PDF versions of the found papers to a specified local directory. It also provides an option to use the paper's title as the filename for better organization.
-   **Configurable Options**: Users can configure the maximum number of results to fetch, the directory for saving PDFs, and whether to use titles as filenames.
-   **Robust Error Handling**: Includes mechanisms to catch and report errors during API calls and file download operations.

### Key Methods:

-   `_run(self, search_query: str, max_results: int = 5) -> str`: The main entry point for executing the tool. It orchestrates the fetching, optional downloading, and formatting of Arxiv paper results.
-   `fetch_arxiv_data(self, search_query: str, max_results: int) -> list[dict[str, Any]]`: Handles the direct interaction with the Arxiv API to retrieve paper information in XML format and parses it into a list of dictionaries.
-   `download_pdf(self, pdf_url: str, save_path: str) -> None`: Downloads a PDF from a given URL to a specified local path.
-   `_extract_pdf_url(self, entry: ET.Element) -> str | None`: Extracts the PDF download URL from an XML entry of an Arxiv paper.
-   `_format_paper_result(self, paper: dict[str, Any]) -> str`: Formats the extracted paper metadata into a human-readable string for tool output.

## Architecture and Component Relationships

The `arxiv_paper_tool` module primarily interacts with the Arxiv API and the local file system. It leverages standard Python libraries for HTTP requests, XML parsing, and file system operations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "arxiv_paper_tool", "label": "ArxivPaperTool", "type": "component", "link": null},
        {"id": "arxiv_api", "label": "Arxiv API", "type": "external", "link": null},
        {"id": "file_system", "label": "Local File System", "type": "external", "link": null},
        {"id": "urllib_module", "label": "urllib (Python Lib)", "type": "external", "link": null},
        {"id": "xml_parser", "label": "XML Parser (Python Lib)", "type": "external", "link": null},
        {"id": "crewai_tool_base", "label": "crewai_tool_base", "type": "external", "link": "crewai_tool_base.md"}
    ],
    "edges": [
        {"source": "arxiv_paper_tool", "target": "arxiv_api"},
        {"source": "arxiv_paper_tool", "target": "file_system"},
        {"source": "arxiv_paper_tool", "target": "urllib_module"},
        {"source": "arxiv_paper_tool", "target": "xml_parser"},
        {"source": "arxiv_paper_tool", "target": "crewai_tool_base"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    arxiv_paper_tool[ArxivPaperTool]
    arxiv_api[Arxiv API]
    file_system[Local File System]
    urllib_module[urllib (Python Lib)]
    xml_parser[XML Parser (Python Lib)]
    crewai_tool_base[crewai_tool_base]
    arxiv_paper_tool --> arxiv_api
    arxiv_paper_tool --> file_system
    arxiv_paper_tool --> urllib_module
    arxiv_paper_tool --> xml_parser
    arxiv_paper_tool --> crewai_tool_base
```

## Integration with CrewAI

The `ArxivPaperTool` integrates seamlessly into the CrewAI ecosystem as a specialized tool. By inheriting from `BaseTool`, it adheres to the standard tool interface, allowing it to be easily incorporated into an agent's toolkit. Agents can call this tool to perform research tasks involving academic papers, enhancing their ability to gather information and process research-oriented requests.
