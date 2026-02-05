# Shopping Helpers Module

The `shopping_helpers` module provides a collection of utility functions designed to interact with shopping websites, primarily for evaluation and data extraction purposes. It offers functionalities to retrieve information related to orders and product reviews, which are crucial for automated testing and analysis within the evaluation harness.

## Architecture Overview

The `shopping_helpers` module is divided into two main sub-modules, each focusing on a distinct area of functionality:

- **Shopping Order Helpers**: Manages the retrieval of order-specific information.
- **Shopping Review Helpers**: Handles the extraction of product review details.

These sub-modules interact with external shopping APIs to fetch the necessary data.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "shopping_order_helpers", "label": "Shopping Order Helpers", "type": "module", "link": "shopping_order_helpers.md"},
        {"id": "shopping_review_helpers", "label": "Shopping Review Helpers", "type": "module", "link": "shopping_review_helpers.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    shopping_order_helpers[Shopping Order Helpers]
    shopping_review_helpers[Shopping Review Helpers]

    click shopping_order_helpers "shopping_order_helpers.md" "View Shopping Order Helpers Documentation"
    click shopping_review_helpers "shopping_review_helpers.md" "View Shopping Review Helpers Documentation"
```

## Sub-modules

### [Shopping Order Helpers](shopping_order_helpers.md)
This sub-module provides utility functions to fetch order-related information, such as the latest order URL, product names, quantities, and options within an order. It primarily interacts with the shopping website's order API.

### [Shopping Review Helpers](shopping_review_helpers.md)
This sub-module offers functions to retrieve product review details and product page URLs from the shopping website. It focuses on extracting information like review author, rating, text, and title for a given product SKU.
