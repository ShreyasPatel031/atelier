// Simple default architecture - a basic serverless API setup
// This is a clean, minimal example that users can start with
export const SIMPLE_DEFAULT_ARCHITECTURE = {
  "id": "root",
  "mode": "FREE",
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
};

