# memory
The `memory` module provides various implementations for managing conversational state, including buffer, window, and entity-based memories, along with different backend stores for entities.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {
      "id": "BM",
      "label": "BaseMemory",
      "type": "abstract"
    },
    {
      "id": "BCM",
      "label": "BaseChatMemory",
      "type": "abstract"
    },
    {
      "id": "BES",
      "label": "BaseEntityStore",
      "type": "abstract"
    },
    {
      "id": "CBM",
      "label": "ConversationBufferMemory"
    },
    {
      "id": "CSBM",
      "label": "ConversationStringBufferMemory"
    },
    {
      "id": "CBWM",
      "label": "ConversationBufferWindowMemory"
    },
    {
      "id": "CEM",
      "label": "ConversationEntityMemory"
    },
    {
      "id": "RES",
      "label": "RedisEntityStore"
    },
    {
      "id": "IMES",
      "label": "InMemoryEntityStore"
    },
    {
      "id": "URES",
      "label": "UpstashRedisEntityStore"
    },
    {
      "id": "SLES",
      "label": "SQLiteEntityStore"
    },
    {
      "id": "BCMH",
      "label": "BaseChatMessageHistory",
      "type": "inferred"
    },
    {
      "id": "BLM",
      "label": "BaseLanguageModel",
      "type": "inferred"
    }
  ],
  "edges": [
    {
      "source": "BCM",
      "target": "BM",
      "type": "inheritance"
    },
    {
      "source": "CBM",
      "target": "BCM",
      "type": "inheritance"
    },
    {
      "source": "CSBM",
      "target": "BM",
      "type": "inheritance"
    },
    {
      "source": "CBWM",
      "target": "BCM",
      "type": "inheritance"
    },
    {
      "source": "CEM",
      "target": "BCM",
      "type": "inheritance"
    },
    {
      "source": "RES",
      "target": "BES",
      "type": "inheritance"
    },
    {
      "source": "IMES",
      "target": "BES",
      "type": "inheritance"
    },
    {
      "source": "URES",
      "target": "BES",
      "type": "inheritance"
    },
    {
      "source": "SLES",
      "target": "BES",
      "type": "inheritance"
    },
    {
      "source": "BCM",
      "target": "BCMH",
      "type": "composition",
      "label": "chat_memory"
    },
    {
      "source": "CEM",
      "target": "BES",
      "type": "composition",
      "label": "entity_store"
    },
    {
      "source": "CEM",
      "target": "BLM",
      "type": "composition",
      "label": "llm"
    }
  ],
  "groups": [
    {
      "id": "Core Memory Abstractions",
      "nodes": [
        "BM",
        "BCM",
        "BES"
      ]
    },
    {
      "id": "Memory Implementations",
      "nodes": [
        "CBM",
        "CSBM",
        "CBWM",
        "CEM"
      ]
    },
    {
      "id": "Entity Store Implementations",
      "nodes": [
        "RES",
        "IMES",
        "URES",
        "SLES"
      ]
    },
    {
      "id": "External Dependencies",
      "nodes": [
        "BCMH",
        "BLM"
      ]
    }
  ]
}
-->
```
```mermaid
flowchart TD
    subgraph "Core Memory Abstractions"
        BM[BaseMemory]
        BCM[BaseChatMemory]
        BES[BaseEntityStore]
    end

    subgraph "Memory Implementations"
        CBM[ConversationBufferMemory]
        CSBM[ConversationStringBufferMemory]
        CBWM[ConversationBufferWindowMemory]
        CEM[ConversationEntityMemory]
    end

    subgraph "Entity Store Implementations"
        RES[RedisEntityStore]
        IMES[InMemoryEntityStore]
        URES[UpstashRedisEntityStore]
        SLES[SQLiteEntityStore]
    end

    subgraph "External Dependencies"
        BCMH[BaseChatMessageHistory]
        BLM[BaseLanguageModel]
    end

    BCM -->|"inherits"| BM
    CBM -->|"inherits"| BCM
    CSBM -->|"inherits"| BM
    CBWM -->|"inherits"| BCM
    CEM -->|"inherits"| BCM

    RES -->|"inherits"| BES
    IMES -->|"inherits"| BES
    URES -->|"inherits"| BES
    SLES -->|"inherits"| BES

    BCM --> BCMH
    CEM --> BES
    CEM --> BLM
```