/**
 * Simple default architecture - a basic serverless API setup
 * This is a clean, minimal example that users can start with
 * 
 * Structure:
 * - root: The entire canvas (FREE, not rendered as a visual element)
 *   - group_1: Main visible group containing the architecture (LOCK mode for ELK routing)
 *     - All nodes and nested groups
 */
export const SIMPLE_DEFAULT_ARCHITECTURE = {
  "id": "root",
  "mode": "FREE",  // Root is always FREE per FIGJAM_REFACTOR.md
  "children": [
    {
      "id": "group_1",
      "labels": [{ "text": "Serverless API" }],
      "mode": "LOCK",  // LOCK mode for ELK edge routing
      "data": {
        "label": "Serverless API",
        "isGroup": true,
        "groupIcon": "aws_logo"
      },
  "children": [
    {
      "id": "client",
      "labels": [{ "text": "Client" }],
      "children": [],
      "edges": [],
      "data": { "icon": "browser_client" }
    },
    {
      "id": "aws_env",
      "labels": [{ "text": "AWS Environment" }],
          "mode": "LOCK",
          "data": { "isGroup": true, "groupIcon": "aws_logo" },
      "children": [
        {
          "id": "api_gateway",
          "labels": [{ "text": "API Gateway" }],
          "children": [],
          "edges": [],
          "data": { "icon": "aws_api_gateway" }
        },
        {
          "id": "lambda",
          "labels": [{ "text": "Lambda Function" }],
          "children": [],
          "edges": [],
          "data": { "icon": "aws_lambda" }
        },
        {
          "id": "dynamodb",
          "labels": [{ "text": "DynamoDB" }],
          "children": [],
          "edges": [],
          "data": { "icon": "aws_dynamodb" }
        }
      ],
      "edges": [
        {
          "id": "e_internal_gateway_lambda",
          "sources": ["api_gateway"],
          "targets": ["lambda"],
          "labels": [{ "text": "invokes" }]
        },
        {
          "id": "e_internal_lambda_db",
          "sources": ["lambda"],
          "targets": ["dynamodb"],
          "labels": [{ "text": "queries" }]
        }
      ]
    }
  ],
  "edges": [
    {
      "id": "e_client_gateway",
      "sources": ["client"],
      "targets": ["api_gateway"],
      "labels": [{ "text": "requests" }]
    }
  ]
    }
  ],
  "edges": []
};
