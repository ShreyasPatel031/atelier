# resolver_factory Module Documentation

The `resolver_factory` module is a crucial component within the `crewai_files_resolution` package, responsible for orchestrating the creation and configuration of `FileResolver` instances. It acts as a factory, abstracting away the complexities of initializing file resolution logic, including considerations for file upload thresholds, caching, and provider-specific constraints.

## Purpose and Core Functionality

The primary purpose of the `resolver_factory` module is to provide a centralized and configurable mechanism for generating `FileResolver` objects. These `FileResolver` instances are then used throughout the system to determine the most efficient method for handling files, whether by inlining small files or uploading larger ones to an external storage.

Its core functionality is encapsulated in the `create_resolver` function, which allows callers to specify various parameters such as:
*   **Provider**: To load default file upload thresholds from predefined constraints.
*   **Upload Preference**: Whether to prefer uploading files over inlining them.
*   **Upload Threshold**: A size limit in bytes, above which files should be uploaded.
*   **Caching**: To enable or disable caching for uploaded files, improving performance and reducing redundant uploads.

By centralizing this logic, `resolver_factory` ensures consistency in how file resolution is configured across different parts of the CrewAI ecosystem and provides flexibility for customization based on specific use cases or external service providers.

## Architecture and Component Relationships

The `resolver_factory` module's architecture is straightforward, primarily revolving around its `create_resolver` function. This function interacts with several key components to construct a fully configured `FileResolver`.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "create_resolver", "label": "create_resolver()", "type": "component", "link": null},
        {"id": "file_resolver", "label": "FileResolver", "type": "external", "link": "crewai_files_resolution.md"},
        {"id": "file_resolver_config", "label": "FileResolverConfig", "type": "external", "link": "crewai_files_resolution.md"},
        {"id": "upload_cache", "label": "UploadCache", "type": "external", "link": "crewai_files_cache.md"},
        {"id": "provider_constraints", "label": "Provider Constraints", "type": "external", "link": "crewai_files_resolution.md"}
    ],
    "edges": [
        {"source": "create_resolver", "target": "file_resolver_config"},
        {"source": "create_resolver", "target": "upload_cache"},
        {"source": "create_resolver", "target": "provider_constraints"},
        {"source": "create_resolver", "target": "file_resolver"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    create_resolver[create_resolver()]
    file_resolver[FileResolver]
    file_resolver_config[FileResolverConfig]
    upload_cache[UploadCache]
    provider_constraints[Provider Constraints]

    create_resolver --> file_resolver_config
    create_resolver --> upload_cache
    create_resolver --> provider_constraints
    create_resolver --> file_resolver
```

### Key Component Interactions:

*   **`create_resolver()`**: The central function that orchestrates the entire process. It takes configuration parameters, retrieves provider-specific constraints, initializes caching, and finally instantiates and returns a `FileResolver`.
*   **`FileResolverConfig`**: An external component (likely defined within `crewai_files_resolution`) that holds the core configuration for a `FileResolver`, such as `prefer_upload` and `upload_threshold_bytes`. `create_resolver` constructs this object.
*   **`UploadCache`**: An external component (from `crewai_files_cache`) responsible for managing cached file uploads. `create_resolver` conditionally initializes this based on the `enable_cache` flag.
*   **`Provider Constraints`**: Represents the logic (e.g., `get_constraints_for_provider` function) that fetches default upload thresholds based on a specified provider. This ensures that `FileResolver` instances can adhere to external service limitations. This component is assumed to reside within `crewai_files_resolution` or a related utility module.
*   **`FileResolver`**: The ultimate output of the factory. This external component (from `crewai_files_resolution`) is the concrete class that performs the actual file resolution logic, utilizing the `FileResolverConfig` and `UploadCache` provided.

## How the Module Fits into the Overall System

The `resolver_factory` module is a foundational piece of the `crewai_files_resolution` package. It ensures that any part of the CrewAI system requiring file handling can obtain a properly configured `FileResolver`. This is critical for:

1.  **Efficient File Management**: By dynamically setting upload thresholds and enabling caching, it optimizes how files are handled, reducing network overhead and improving performance.
2.  **Provider Agnostic Configuration**: It allows for easy integration with different file storage providers by abstracting provider-specific constraints.
3.  **Modularity and Extensibility**: It promotes a clean separation of concerns, allowing the core file resolution logic (`FileResolver`) to focus purely on its task, while `resolver_factory` handles configuration and instantiation.

Modules that need to process files, especially those interacting with external LLMs or storage services, will depend on `resolver_factory` to obtain a `FileResolver` tailored to their specific needs and the overall system configuration. It serves as an entry point for robust and flexible file resolution within the CrewAI framework.
