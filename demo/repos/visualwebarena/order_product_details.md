# `order_product_details` Module Documentation

The `order_product_details` module is a sub-module within the `evaluation_helpers.shopping_order_helpers` module, designed to provide utility functions for extracting specific details about products within a user's order. This module is crucial for evaluation harnesses or any system requiring detailed analysis of order contents, such as verifying product names, quantities, or specific options like color or size.

### Core Functionality

The module offers three primary functions to retrieve product-specific information from an order page:
1.  **`shopping_get_order_product_name_list`**: Retrieves a list of all product names in an order.
2.  **`shopping_get_order_product_quantity`**: Fetches the quantity of a specified product (identified by SKU) within an order.
3.  **`shopping_get_order_product_option`**: Extracts a specific option's value (e.g., "color": "red") for a given product SKU in an order.

### Architecture and Component Relationships

The `order_product_details` module's components primarily interact with an internal helper function, `shopping_get_all_product_order`, to parse the order page and extract relevant product data. This design centralizes the page parsing logic, ensuring consistency and ease of maintenance.

The module itself is a part of the larger `shopping_order_helpers` module, which groups various utilities related to shopping orders. The `shopping_order_helpers` module, in turn, is a part of `evaluation_helpers`, a broader collection of functions used across different evaluation scenarios.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "get_product_name_list", "label": "shopping_get_order_product_name_list", "type": "component", "link": null},
        {"id": "get_product_quantity", "label": "shopping_get_order_product_quantity", "type": "component", "link": null},
        {"id": "get_product_option", "label": "shopping_get_order_product_option", "type": "component", "link": null},
        {"id": "get_all_products_func", "label": "shopping_get_all_product_order (Internal Helper)", "type": "component", "link": null},
        {"id": "shopping_order_helpers", "label": "shopping_order_helpers", "type": "external", "link": "shopping_order_helpers.md"},
        {"id": "evaluation_helpers", "label": "evaluation_helpers", "type": "external", "link": "evaluation_helpers.md"}
    ],
    "edges": [
        {"source": "get_product_name_list", "target": "get_all_products_func"},
        {"source": "get_product_quantity", "target": "get_all_products_func"},
        {"source": "get_product_option", "target": "get_all_products_func"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    get_product_name_list[shopping_get_order_product_name_list]
    get_product_quantity[shopping_get_order_product_quantity]
    get_product_option[shopping_get_order_product_option]
    get_all_products_func[shopping_get_all_product_order (Internal Helper)]
    shopping_order_helpers[shopping_order_helpers]:::external
    evaluation_helpers[evaluation_helpers]:::external

    get_product_name_list --> get_all_products_func
    get_product_quantity --> get_all_products_func
    get_product_option --> get_all_products_func

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### How the Module Fits into the Overall System

The `order_product_details` module provides granular information about products within an order, serving as a vital component for:
*   **Automated Evaluation**: Used by various evaluators to verify if an agent correctly identifies product details from an order page. For example, a system might use `shopping_get_order_product_quantity` to check if the agent correctly reported the number of items ordered.
*   **Data Extraction**: Facilitates the extraction of structured data from web pages, which can then be used for reporting, analytics, or further processing.
*   **Agent Development and Testing**: Helps in creating robust tests for agents that interact with e-commerce platforms, ensuring they can accurately parse and understand order information.

This module is a leaf module within the [evaluation_helpers](evaluation_helpers.md) -> [shopping_order_helpers](shopping_order_helpers.md) hierarchy. Its functions are specialized and directly support the broader goals of accurate information retrieval within the system.

### Core Components

#### `shopping_get_order_product_name_list(page: Page | PseudoPage) -> str`
This function extracts the names of all products listed in an order on the provided `page`. It utilizes the `shopping_get_all_product_order` helper to retrieve all product information and then compiles a string of product names, separated by " |OR| ".

#### `shopping_get_order_product_quantity(page: Page | PseudoPage, sku: str) -> int`
This function determines the quantity of a specific product within an order. It takes the `page` object and the `sku` of the product as input. If multiple SKUs are provided (separated by " |OR| "), it checks for any of them. It parses the quantity string (e.g., "Ordered{qty}") to return an integer. Returns `0` if the product is not found or an error occurs.

#### `shopping_get_order_product_option(page: Page | PseudoPage, sku: str, option_name: str) -> str`
This function retrieves the value of a specific option (e.g., "Color", "Size") for a product identified by its `sku` from the order `page`. It expects the `option_name` (e.g., "color") as input. It returns the option's value as a string. Returns an empty string `""` if the product or option is not found, or in case of an error.