# `async_cleanup_operations` Module Documentation

## Introduction

The `async_cleanup_operations` module is responsible for asynchronously managing the cleanup of expired files within the CrewAI file cache system. It handles the removal of file entries from the cache and, optionally, their deletion from the associated file storage providers, ensuring efficient resource management and cache integrity.

## Architecture and Component Relationships

This module provides the core asynchronous functions for identifying and removing expired cached files. It leverages concurrency to efficiently delete files from external storage providers when configured.

### Core Components

*   `acleanup_expired_files`: The main asynchronous function that orchestrates the cleanup process. It retrieves expired entries, clears them from the cache, and if `delete_from_provider` is true, concurrently deletes them from the respective providers.
*   `delete_expired`: A helper asynchronous function used by `acleanup_expired_files` to individually delete an expired file from its provider, with built-in concurrency limiting.

### Module Dependencies

*   [`crewai_files_cache`](crewai_files_cache.md): The module interacts with the core cache mechanisms, specifically `UploadCache` for retrieving and clearing expired entries, and `CachedUpload` for representing file metadata.
*   [`cache_cleanup`](cache_cleanup.md): This module depends on functions within `cache_cleanup` (e.g., `_get_providers_from_cache`) to identify active file providers.
*   [`provider_file_management`](provider_file_management.md) or [`crewai_files_uploaders`](crewai_files_uploaders.md): For actually performing file deletions from external storage, the module utilizes functionality to get the appropriate file uploader based on the provider.

## System Integration

The `async_cleanup_operations` module is a critical part of the `crewai_files_cache.cache_cleanup.expired_cache_cleanup` sub-system. It complements the synchronous cleanup operations by providing an asynchronous alternative for scenarios requiring non-blocking file removals and concurrent deletion from external storage. This module ensures that the file cache remains lean and up-to-date, preventing the accumulation of stale or expired data, which is vital for the overall performance and reliability of the CrewAI system.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "acleanup_expired_files", "label": "acleanup_expired_files", "type": "component", "link": null},
        {"id": "delete_expired", "label": "delete_expired", "type": "component", "link": null},
        {"id": "upload_cache", "label": "UploadCache", "type": "external", "link": "crewai_files_cache.md"},
        {"id": "cached_upload", "label": "CachedUpload", "type": "external", "link": "crewai_files_cache.md"},
        {"id": "cache_cleanup_helpers", "label": "cache_cleanup helpers", "type": "external", "link": "cache_cleanup.md"},
        {"id": "file_uploader", "label": "File Uploader (from provider_file_management/crewai_files_uploaders)", "type": "external", "link": "provider_file_management.md"}
    ],
    "edges": [
        {"source": "acleanup_expired_files", "target": "delete_expired"},
        {"source": "acleanup_expired_files", "target": "upload_cache"},
        {"source": "acleanup_expired_files", "target": "cached_upload"},
        {"source": "acleanup_expired_files", "target": "cache_cleanup_helpers"},
        {"source": "delete_expired", "target": "file_uploader"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    acleanup_expired_files[acleanup_expired_files]
    delete_expired[delete_expired]
    upload_cache[UploadCache]
    cached_upload[CachedUpload]
    cache_cleanup_helpers[cache_cleanup helpers]
    file_uploader[File Uploader (from provider_file_management/crewai_files_uploaders)]

    acleanup_expired_files --> delete_expired
    acleanup_expired_files --> upload_cache
    acleanup_expired_files --> cached_upload
    acleanup_expired_files --> cache_cleanup_helpers
    delete_expired --> file_uploader
```
