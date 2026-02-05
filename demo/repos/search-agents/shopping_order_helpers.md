The `shopping_order_helpers` module provides a set of utility functions designed to facilitate interaction with and extraction of specific information from shopping order data. It is a crucial component within the `evaluation_helpers` suite, specifically focusing on order-related data retrieval for evaluation purposes.

### Purpose and Core Functionality

The primary purpose of this module is to abstract the complexities of accessing and parsing shopping order details, offering simple functions to retrieve key information such as the latest order URL, product names within an order, quantities of specific products, and various product options. This module plays a vital role in scenarios requiring automated verification or extraction of order details from a shopping platform.

### Architecture and Component Relationships

The `shopping_order_helpers` module is composed of several independent functions, each designed for a specific data retrieval task. These functions often depend on broader `shopping_helpers` for common functionalities like authentication tokens, base URLs, or general product order fetching mechanisms. They also interface with page objects (`Page | PseudoPage`) to extract information directly from rendered web pages in some cases.

The module's architecture is straightforward, with each function serving a distinct role without complex internal sub-component interactions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "get_latest_order_url", "label": "shopping_get_latest_order_url", "type": "component", "link": null},
        {"id": "get_order_product_name_list", "label": "shopping_get_order_product_name_list", "type": "component", "link": null},
        {"id": "get_order_product_quantity", "label": "shopping_get_order_product_quantity", "type": "component", "link": null},
        {"id": "get_order_product_option", "label": "shopping_get_order_product_option", "type": "component", "link": null},
        {"id": "shopping_helpers", "label": "shopping_helpers", "type": "external", "link": "shopping_helpers.md"},
        {"id": "page_types", "label": "Page | PseudoPage Types", "type": "external", "link": null},
        {"id": "requests_lib", "label": "requests (External Library)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "get_latest_order_url", "target": "shopping_helpers"},
        {"source": "get_latest_order_url", "target": "requests_lib"},
        {"source": "get_order_product_name_list", "target": "shopping_helpers"},
        {"source": "get_order_product_name_list", "target": "page_types"},
        {"source": "get_order_product_quantity", "target": "shopping_helpers"},
        {"source": "get_order_product_quantity", "target": "page_types"},
        {"source": "get_order_product_option", "target": "shopping_helpers"},
        {"source": "get_order_product_option", "target": "page_types"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    get_latest_order_url[shopping_get_latest_order_url]
    get_order_product_name_list[shopping_get_order_product_name_list]
    get_order_product_quantity[shopping_get_order_product_quantity]
    get_order_product_option[shopping_get_order_product_option]
    shopping_helpers[shopping_helpers]:::external
    page_types[Page | PseudoPage Types]:::external
    requests_lib[requests (External Library)]:::external

    get_latest_order_url --> shopping_helpers
    get_latest_order_url --> requests_lib
    get_order_product_name_list --> shopping_helpers
    get_order_product_name_list --> page_types
    get_order_product_quantity --> shopping_helpers
    get_order_product_quantity --> page_types
    get_order_product_option --> shopping_helpers
    get_order_product_option --> page_types

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### How the Module Fits into the Overall System

The `shopping_order_helpers` module is nested under `evaluation_helpers` and `shopping_helpers`. This placement indicates its role as a specialized helper within the broader evaluation harness. It provides specific functionalities required for testing and evaluating scenarios that involve interacting with or verifying information related to shopping orders.

It integrates with the system by:
*   **Providing Order Details:** Enabling the evaluation system to programmatically fetch order-specific data, such as the latest order URL, product lists, quantities, and options.
*   **Supporting Automated Testing:** Serving as a foundational layer for tests that validate order placement, order status, or details displayed on order confirmation pages.
*   **Reducing Redundancy:** Centralizing common order-related data extraction logic, preventing duplication across various evaluation scripts.

For more general shopping-related helper functions, refer to the [shopping_helpers module documentation](shopping_helpers.md).

### Core Components

#### `shopping_get_latest_order_url`

This function retrieves the URL of the most recently placed order on the shopping website. It makes an authenticated API call to the shopping backend, sorts orders by creation date in descending order, and picks the first item to construct the URL.

#### `shopping_get_order_product_name_list`

Given a `Page` or `PseudoPage` object representing an order view, this function extracts and returns a concatenated string of all product names present in the order, separated by " |OR| ". It relies on the `shopping_get_all_product_order` helper to retrieve product details.

#### `shopping_get_order_product_quantity`

This function determines the quantity of a specific SKU (or one of several SKUs) within an order represented by a `Page` or `PseudoPage` object. It iterates through the products in the order, matching the SKU(s) and parsing the quantity from the product data.

#### `shopping_get_order_product_option`

For a given `Page` or `PseudoPage` object, SKU, and option name, this function retrieves the value of that specific option for the specified product within the order. It helps in verifying product configurations (e.g., color, size).