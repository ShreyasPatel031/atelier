# Conversational Retrieval Chains

The `conversational_retrieval_chains` module provides tools for building conversational agents that can retrieve information from documents based on a chat history. It focuses on enabling question-answering capabilities within a conversational context, allowing the system to understand and respond to user queries that might refer to previous turns in the conversation.

## Architecture Overview

This module orchestrates the interaction between chat history, new user questions, document retrieval, and language model (LLM) processing to generate relevant answers. It primarily consists of chains designed to contextualize questions and combine retrieved documents with the conversational flow.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "conversational_retrieval_chain_impl", "label": "Conversational Retrieval Chain", "type": "module", "link": "conversational_retrieval_chain_impl.md"},
        {"id": "chat_vector_db_chain_impl", "label": "Chat VectorDB Chain (Deprecated)", "type": "module", "link": "chat_vector_db_chain_impl.md"}
    ],
    "edges": [
        {"source": "conversational_retrieval_chain_impl", "target": "chat_vector_db_chain_impl"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    conversational_retrieval_chain_impl[Conversational Retrieval Chain]
    chat_vector_db_chain_impl[Chat VectorDB Chain (Deprecated)]

    conversational_retrieval_chain_impl --> chat_vector_db_chain_impl

    click conversational_retrieval_chain_impl "conversational_retrieval_chain_impl.md" "View Conversational Retrieval Chain Documentation"
    click chat_vector_db_chain_impl "chat_vector_db_chain_impl.md" "View Chat VectorDB Chain Documentation"
```

## Sub-modules

*   ### [Conversational Retrieval Chain](conversational_retrieval_chain_impl.md)
    Implements the core logic for conversational retrieval by combining chat history, new questions, and retrieved documents.

*   ### [Chat VectorDB Chain (Deprecated)](chat_vector_db_chain_impl.md)
    Provides an interface for conversational interactions with a vector database, though it is now deprecated.
