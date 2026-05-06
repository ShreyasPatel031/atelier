# LLM Integration
This module provides robust integrations with various Large Language Models (LLMs) and OpenAI-compatible APIs, offering a unified interface for seamless interaction, function calling, and streaming capabilities across different providers.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_llm_interface", "label": "Base LLM Interface", "type": "module", "link": "llm_base.md"},
        {"id": "native_llm_providers", "label": "Native LLM Providers", "type": "module", "link": "llm_providers.md"},
        {"id": "openai_compatible_apis", "label": "OpenAI Compatible APIs", "type": "module", "link": "llm_compatible.md"},
        {"id": "llm_method_decorators", "label": "LLM Method Decorators", "type": "module", "link": "llm_annotations.md"}
    ],
    "edges": [
        {"source": "base_llm_interface", "target": "native_llm_providers", "label": "extends functionality"},
        {"source": "base_llm_interface", "target": "openai_compatible_apis", "label": "extends functionality"},
        {"source": "llm_method_decorators", "target": "base_llm_interface", "label": "applies to"}
    ],
    "groups": [
        {"id": "llm_foundation", "label": "LLM Foundation", "role": "analytical", "nodes": ["base_llm_interface"]},
        {"id": "llm_integrations", "label": "LLM Integrations", "role": "generative", "nodes": ["native_llm_providers", "openai_compatible_apis"]},
        {"id": "developer_utilities", "label": "Developer Utilities", "role": "surface", "nodes": ["llm_method_decorators"]}
    ]
}
-->