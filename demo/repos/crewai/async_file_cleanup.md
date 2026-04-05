# `async_file_cleanup` Module

## Introduction

The `async_file_cleanup` module is responsible for asynchronously managing and cleaning up files associated with various providers within the CrewAI system. It provides functionalities to delete files from specific providers, clear uploaded files from the cache, and ensure efficient resource management. This module plays a crucial role in maintaining data hygiene and optimizing storage by removing stale or unneeded files.

## Architecture and Component Relationships

This module's core functionality revolves around two main asynchronous cleanup functions and a helper function for single file deletion.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "acleanup_provider_files", "label": "acleanup_provider_files", "type": "component", "link": null},
        {"id": "acleanup_uploaded_files", "label": "acleanup_uploaded_files", "type": "component", "link": null},
        {"id": "delete_one", "label": "delete_one", "type": "component", "link": null},
        {"id": "crewai_files_cache", "label": "crewai_files_cache", "type": "external", "link": "crewai_files_cache.md"},
        {"id": "crewai_files_uploaders", "label": "crewai_files_uploaders", "type": "external", "link": "crewai_files_uploaders.md"},
        {"id": "cache_cleanup", "label": "cache_cleanup (Parent Module)", "type": "external", "link": "cache_cleanup.md"}
    ],
    "edges": [
        {"source": "acleanup_provider_files", "target": "crewai_files_cache"},
        {"source": "acleanup_provider_files", "target": "crewai_files_uploaders"},
        {"source": "acleanup_uploaded_files", "target": "crewai_files_cache"},
        {"source": "acleanup_uploaded_files", "target": "crewai_files_uploaders"},
        {"source": "acleanup_uploaded_files", "target": "cache_cleanup"},
        {"source": "acleanup_uploaded_files", "target": "delete_one"},
        {"source": "delete_one", "target": "crewai_files_uploaders"},
        {"source": "delete_one", "target": "crewai_files_cache"},
        {"source": "delete_one", "target": "cache_cleanup"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    acleanup_provider_files[acleanup_provider_files]
    acleanup_uploaded_files[acleanup_uploaded_files]
    delete_one[delete_one]
    crewai_files_cache[crewai_files_cache]
    crewai_files_uploaders[crewai_files_uploaders]
    cache_cleanup[cache_cleanup (Parent Module)]

    acleanup_provider_files --> crewai_files_cache
    acleanup_provider_files --> crewai_files_uploaders
    acleanup_uploaded_files --> crewai_files_cache
    acleanup_uploaded_files --> crewai_files_uploaders
    acleanup_uploaded_files --> cache_cleanup
    acleanup_uploaded_files --> delete_one
    delete_one --> crewai_files_uploaders
    delete_one --> crewai_files_cache
    delete_one --> cache_cleanup
```

### Core Components

*   `acleanup_provider_files(provider: ProviderType, *, cache: UploadCache | None = None, delete_all_from_provider: bool = False, max_concurrency: int = 10) -> int`
    *   **Purpose:** Asynchronously cleans up files associated with a specific `provider`. It can either delete all files directly from the provider or remove files that are referenced in an `UploadCache`.
    *   **Functionality:** It retrieves an appropriate `uploader` for the given `provider`, lists files (if `delete_all_from_provider` is true) or gets uploads from the cache, and then asynchronously deletes them with a controlled concurrency using a semaphore. It also updates the cache if files were deleted based on cache entries.
    *   **Dependencies:** Relies on the [crewai_files_uploaders](crewai_files_uploaders.md) module to obtain `FileUploader` instances and the [crewai_files_cache](crewai_files_cache.md) module for `UploadCache` interactions.

*   `acleanup_uploaded_files(cache: UploadCache, *, delete_from_provider: bool = True, providers: list[ProviderType] | None = None, max_concurrency: int = 10) -> int`
    *   **Purpose:** Asynchronously cleans up files that have been uploaded and are referenced in the `UploadCache`. It can optionally delete these files from their respective providers as well.
    *   **Functionality:** It first gathers all cached uploads, optionally filtering by specific providers. If `delete_from_provider` is true, it concurrently deletes these files from their remote storage using `_asafe_delete` (a helper function from the [cache_cleanup](cache_cleanup.md) module) and a semaphore. Finally, it clears all entries from the `UploadCache`.
    *   **Dependencies:** Interacts heavily with the [crewai_files_cache](crewai_files_cache.md) for cache management and [crewai_files_uploaders](crewai_files_uploaders.md) to get `FileUploader` instances. It also uses helper functions from the parent [cache_cleanup](cache_cleanup.md) module.

*   `delete_one(file_uploader: FileUploader, cached: CachedUpload) -> bool`
    *   **Purpose:** An internal asynchronous helper function, primarily used by `acleanup_uploaded_files`, to delete a single file from a provider with semaphore limiting.
    *   **Functionality:** It wraps a call to `_asafe_delete` (from the [cache_cleanup](cache_cleanup.md) module) ensuring that the deletion operation respects the maximum concurrency limit set by the calling function.
    *   **Dependencies:** Depends on `FileUploader` from [crewai_files_uploaders](crewai_files_uploaders.md) and `CachedUpload` from [crewai_files_cache](crewai_files_cache.md), and the `_asafe_delete` helper from the parent [cache_cleanup](cache_cleanup.md) module.

## How the Module Fits into the Overall System

The `async_file_cleanup` module is a crucial part of the `crewai_files_cache` subsystem, specifically within the `cache_cleanup` and `provider_file_management` hierarchy. It ensures that files uploaded and cached by the CrewAI system are properly removed when no longer needed. This prevents accumulation of unnecessary files, manages storage costs, and maintains system efficiency.

It works in conjunction with:

*   **[crewai_files_cache](crewai_files_cache.md):** Provides the `UploadCache` mechanism to track and manage uploaded files, which `async_file_cleanup` uses to identify files for deletion.
*   **[crewai_files_uploaders](crewai_files_uploaders.md):** Supplies the necessary `FileUploader` implementations for different cloud providers, allowing `async_file_cleanup` to interact with various storage services.
*   **[cache_cleanup](cache_cleanup.md):** This module is a sibling to `sync_cleanup_operations` and contains common cleanup utilities including helper functions like `_asafe_delete` and `_get_providers_from_cache` that are utilized by the asynchronous cleanup processes here. This ensures a consistent approach to file deletion logic across synchronous and asynchronous operations.

By centralizing asynchronous file cleanup logic, this module contributes to the robustness and maintainability of the CrewAI file management system. 