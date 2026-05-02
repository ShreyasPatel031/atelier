# Advanced Prediction Strategies
This module offers advanced prediction strategies, including an agentic framework for iterative task accomplishment with tool use, and a mechanism for comparing and synthesizing results from multiple prediction chains to achieve robust outputs.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "avatar_agent", "label": "Avatar Agent", "type": "module", "link": "avatar_agent.md"},
        {"id": "multi_chain_consensus", "label": "Multi-Chain Consensus", "type": "module", "link": "multi_chain_consensus.md"}
    ],
    "edges": [],
    "groups": [
        {"id": "agentic_framework", "label": "Agentic Framework", "role": "generative", "nodes": ["avatar_agent"]},
        {"id": "comparison_strategies", "label": "Comparison Strategies", "role": "analytical", "nodes": ["multi_chain_consensus"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph agentic_framework["Agentic Framework"]
        avatar_agent["Avatar Agent"]
    end
    subgraph comparison_strategies["Comparison Strategies"]
        multi_chain_consensus["Multi-Chain Consensus"]
    end

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class avatar_agent generative
    class multi_chain_consensus analytical

    click avatar_agent "avatar_agent.md"
    click multi_chain_consensus "multi_chain_consensus.md"
```