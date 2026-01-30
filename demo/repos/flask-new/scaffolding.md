# Module: `scaffolding`

The `scaffolding` module in `flask_sansio` provides the foundational `Scaffold` class, which encapsulates common behaviors and mechanisms shared between Flask applications (`App`) and Blueprints (`Blueprint`). This module is crucial for setting up core functionalities like routing, static file handling, template loading, and request/error handling decorators in a framework-agnostic manner within the sans-IO (input/output) context of Flask.

## Core Functionality

The `Scaffold` class serves as a robust base for any Flask-like object that needs to manage URL rules, static files, templates, and various request lifecycle hooks. It provides decorators and methods for:

*   **Routing**: Defining URL rules and associating them with view functions, including shortcuts for common HTTP methods (GET, POST, PUT, DELETE, PATCH).
*   **Static Files**: Configuring and serving static assets.
*   **Templating**: Integrating with Jinja2 for template loading.
*   **Request Hooks**: Registering functions to run before, after, or at the teardown of a request.
*   **Context Processors**: Adding variables to the template rendering context.
*   **URL Processors**: Modifying URL values before routing or when generating URLs.
*   **Error Handling**: Registering handlers for specific HTTP error codes or exceptions.

By centralizing these core features in `Scaffold`, `flask_sansio` ensures a consistent and extensible base for both full applications and modular blueprints, promoting code reuse and a clear separation of concerns.

## Architecture and Component Relationships

The `Scaffold` class is a fundamental building block within the `flask_sansio` ecosystem. It is designed to be inherited or composed by higher-level components like the sans-IO `App` (application core) and `Blueprint` classes, providing them with a standardized set of features.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "scaffold_class", "label": "Scaffold Class", "type": "component", "link": null},
        {"id": "app_module", "label": "Application Core (App)", "type": "external", "link": "application_core.md"},
        {"id": "blueprint_module", "label": "Blueprint Main (Blueprint)", "type": "external", "link": "blueprint_main.md"},
        {"id": "werkzeug_routing", "label": "Werkzeug Routing", "type": "external", "link": null},
        {"id": "werkzeug_exceptions", "label": "Werkzeug Exceptions", "type": "external", "link": null},
        {"id": "jinja2_loader", "label": "Jinja2 Loader", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "app_module", "target": "scaffold_class", "label": "inherits/uses"},
        {"source": "blueprint_module", "target": "scaffold_class", "label": "inherits/uses"},
        {"source": "scaffold_class", "target": "werkzeug_routing", "label": "uses Rule"},
        {"source": "scaffold_class", "target": "werkzeug_exceptions", "label": "uses HTTPException, default_exceptions"},
        {"source": "scaffold_class", "target": "jinja2_loader", "label": "uses FileSystemLoader"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    app_module[Application Core (App)]
    blueprint_module[Blueprint Main (Blueprint)]
    scaffold_class[Scaffold Class]
    werkzeug_routing[Werkzeug Routing]
    werkzeug_exceptions[Werkzeug Exceptions]
    jinja2_loader[Jinja2 Loader]

    app_module -- "inherits/uses" --> scaffold_class
    blueprint_module -- "inherits/uses" --> scaffold_class
    scaffold_class -- "uses Rule" --> werkzeug_routing
    scaffold_class -- "uses HTTPException, default_exceptions" --> werkzeug_exceptions
    scaffold_loader -- "uses FileSystemLoader" --> jinja2_loader
```

The `Scaffold` class directly manages several internal dictionaries for storing view functions, error handlers, and various request lifecycle callbacks. It interacts with:

*   **[Application Core](application_core.md)**: The `App` class, representing the main Flask application, builds upon `Scaffold` to provide application-wide functionality.
*   **[Blueprint Main](blueprint_main.md)**: The `Blueprint` class, used for organizing application modules, also extends `Scaffold` to define routes and handlers specific to that blueprint.
*   **Werkzeug Routing**: Utilizes `werkzeug.routing.Rule` for defining and matching URL patterns.
*   **Werkzeug Exceptions**: Leverages `werkzeug.exceptions.HTTPException` for standardized HTTP error handling and `default_exceptions` for mapping HTTP status codes to exception classes.
*   **Jinja2**: Uses `jinja2.loaders.FileSystemLoader` to load templates from the specified `template_folder`.

## How the Module Fits into the Overall System

The `scaffolding` module is a core infrastructural component within `flask_sansio`. It provides the essential "scaffolding" or framework upon which both the main application and its modular extensions (blueprints) are built. Its role is to standardize the setup and management of common web application concerns without tying them to a specific WSGI server or asynchronous framework, adhering to the "sans-IO" philosophy.

By providing decorators for routing and hooks, it allows developers to define the behavior of their application or blueprint declaratively. Any object that needs to handle HTTP requests, manage static files, or render templates can inherit from or utilize `Scaffold`, ensuring a consistent API and behavior across different parts of a Flask application. This modular design enhances maintainability and testability by separating core logical components from the surrounding I/O mechanisms.