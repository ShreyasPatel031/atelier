# File-Based Tools
This module provides a comprehensive suite of tools for interacting with various file types, directories, databases, and online content, enabling capabilities like semantic search within documents, directory listing, and file writing.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "file_content_search", "label": "Search File Content", "type": "module", "link": "file_content_search.md"},
        {"id": "directory_operations", "label": "Manage Directories", "type": "module", "link": "directory_operations.md"},
        {"id": "online_content_search", "label": "Search Online Content", "type": "module", "link": "online_content_search.md"},
        {"id": "file_management", "label": "Write Files", "type": "module", "link": "file_management.md"},
        {"id": "database_search", "label": "Search Databases", "type": "module", "link": "database_search.md"},
        {"id": "file_system", "label": "Local File System", "type": "external"},
        {"id": "external_apis", "label": "External APIs", "type": "external"},
        {"id": "database_system", "label": "Database System", "type": "external"}
    ],
    "edges": [
        {"source": "file_content_search", "target": "file_system", "label": "reads files"},
        {"source": "directory_operations", "target": "file_system", "label": "accesses directories"},
        {"source": "file_management", "target": "file_system", "label": "writes files"},
        {"source": "online_content_search", "target": "external_apis", "label": "queries external services"},
        {"source": "database_search", "target": "database_system", "label": "queries database"}
    ],
    "groups": [
        {"id": "data_access_and_search", "label": "Data Access & Search", "role": "analytical", "nodes": ["file_content_search", "directory_operations", "online_content_search", "database_search"]},
        {"id": "local_storage", "label": "Local Storage Interaction", "role": "data", "nodes": ["file_management"]}
    ]
}
-->