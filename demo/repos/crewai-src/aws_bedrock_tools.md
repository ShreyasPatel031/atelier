# AWS Bedrock Tools
This module integrates AWS Bedrock services, providing tools for invoking agents, retrieving information from knowledge bases, and creating specialized toolkits for browser and code interpretation functionalities.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "bedrock_agents", "label": "Invoke Bedrock Agents", "type": "module", "link": "bedrock_agents.md"},
        {"id": "bedrock_knowledge_base", "label": "Query Bedrock Knowledge Bases", "type": "module", "link": "bedrock_knowledge_base.md"},
        {"id": "bedrock_toolkits", "label": "Create Bedrock Toolkits", "type": "module", "link": "bedrock_toolkits.md"},
        {"id": "aws_bedrock_service", "label": "AWS Bedrock Service", "type": "external"},
        {"id": "tool_users", "label": "Tool Users (Agents)", "type": "external"}
    ],
    "edges": [
        {"source": "bedrock_agents", "target": "aws_bedrock_service", "label": "invokes agent"},
        {"source": "bedrock_knowledge_base", "target": "aws_bedrock_service", "label": "retrieves data"},
        {"source": "bedrock_toolkits", "target": "tool_users", "label": "provides tools"},
        {"source": "tool_users", "target": "bedrock_agents", "label": "uses"},
        {"source": "tool_users", "target": "bedrock_knowledge_base", "label": "uses"}
    ],
    "groups": [
        {"id": "bedrock_interaction", "label": "Bedrock Interaction", "role": "generative", "nodes": ["bedrock_agents", "bedrock_knowledge_base"]},
        {"id": "tool_provisioning", "label": "Tool Provisioning", "role": "surface", "nodes": ["bedrock_toolkits"]},
        {"id": "external_aws", "label": "External AWS", "role": "data", "nodes": ["aws_bedrock_service"]},
        {"id": "consumers", "label": "Consumers", "role": "analytical", "nodes": ["tool_users"]}
    ]
}
-->