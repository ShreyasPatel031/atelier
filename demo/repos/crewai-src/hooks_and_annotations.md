# hooks_and_annotations
This module provides a system for defining and managing various types of hooks (before/after LLM calls, before/after tool calls) using decorators and wrapper classes. It enables custom logic injection and filtering based on agents or tools, and offers global management.

<!-- DIAGRAM_JSON
{
    "nodes": [
        {
            "id": "hooks_and_annotations",
            "label": "hooks_and_annotations",
            "type": "module"
        },
        {
            "id": "F1",
            "label": "clear_all_global_hooks"
        },
        {
            "id": "F2",
            "label": "decorator_factory"
        },
        {
            "id": "F3",
            "label": "before_llm_call"
        },
        {
            "id": "F4",
            "label": "after_llm_call"
        },
        {
            "id": "F5",
            "label": "before_tool_call"
        },
        {
            "id": "F6",
            "label": "after_tool_call"
        },
        {
            "id": "F7",
            "label": "register_before_llm_call_hook"
        },
        {
            "id": "F8",
            "label": "register_after_llm_call_hook"
        },
        {
            "id": "F9",
            "label": "register_before_tool_call_hook"
        },
        {
            "id": "F10",
            "label": "register_after_tool_call_hook"
        },
        {
            "id": "F11",
            "label": "clear_all_llm_call_hooks"
        },
        {
            "id": "F12",
            "label": "clear_all_tool_call_hooks"
        },
        {
            "id": "F13",
            "label": "_create_hook_decorator"
        },
        {
            "id": "F14",
            "label": "_copy_method_metadata"
        },
        {
            "id": "C1",
            "label": "BeforeLLMCallHookMethod"
        },
        {
            "id": "C2",
            "label": "AfterLLMCallHookMethod"
        },
        {
            "id": "C3",
            "label": "BeforeToolCallHookMethod"
        },
        {
            "id": "C4",
            "label": "AfterToolCallHookMethod"
        },
        {
            "id": "D1",
            "label": "LLMCallHookContext"
        },
        {
            "id": "D2",
            "label": "ToolCallHookContext"
        },
        {
            "id": "project_annotations",
            "label": "Project Annotations",
            "type": "module",
            "link": "project_annotations.md"
        },
        {
            "id": "hook_management",
            "label": "Hook Management",
            "type": "module",
            "link": "hook_management.md"
        }
    ],
    "edges": [
        {
            "source": "F1",
            "target": "F11",
            "type": "calls"
        },
        {
            "source": "F1",
            "target": "F12",
            "type": "calls"
        },
        {
            "source": "F3",
            "target": "F13",
            "type": "uses"
        },
        {
            "source": "F4",
            "target": "F13",
            "type": "uses"
        },
        {
            "source": "F5",
            "target": "F13",
            "type": "uses"
        },
        {
            "source": "F6",
            "target": "F13",
            "type": "uses"
        },
        {
            "source": "F13",
            "target": "F2",
            "type": "configures"
        },
        {
            "source": "F2",
            "target": "F7",
            "type": "registers"
        },
        {
            "source": "F2",
            "target": "F8",
            "type": "registers"
        },
        {
            "source": "F2",
            "target": "F9",
            "type": "registers"
        },
        {
            "source": "F2",
            "target": "F10",
            "type": "registers"
        },
        {
            "source": "C1",
            "target": "F14",
            "type": "uses"
        },
        {
            "source": "C2",
            "target": "F14",
            "type": "uses"
        },
        {
            "source": "C3",
            "target": "F14",
            "type": "uses"
        },
        {
            "source": "C4",
            "target": "F14",
            "type": "uses"
        },
        {
            "source": "F3",
            "target": "D1",
            "type": "operates on"
        },
        {
            "source": "F4",
            "target": "D1",
            "type": "operates on"
        },
        {
            "source": "C1",
            "target": "D1",
            "type": "operates on"
        },
        {
            "source": "C2",
            "target": "D1",
            "type": "operates on"
        },
        {
            "source": "F5",
            "target": "D2",
            "type": "operates on"
        },
        {
            "source": "F6",
            "target": "D2",
            "type": "operates on"
        },
        {
            "source": "C3",
            "target": "D2",
            "type": "operates on"
        },
        {
            "source": "C4",
            "target": "D2",
            "type": "operates on"
        },
        {
            "source": "F2",
            "target": "D1",
            "type": "filters by"
        },
        {
            "source": "F2",
            "target": "D2",
            "type": "filters by"
        },
        {
            "source": "hooks_and_annotations",
            "target": "project_annotations"
        },
        {
            "source": "hooks_and_annotations",
            "target": "hook_management"
        }
    ],
    "groups": [
        {
            "id": "global_management",
            "label": "Global Hook Management",
            "nodes": [
                "F1",
                "F11",
                "F12"
            ]
        },
        {
            "id": "llm_hooks",
            "label": "LLM Hooks",
            "nodes": [
                "F3",
                "F4",
                "F7",
                "F8",
                "C1",
                "C2",
                "D1"
            ]
        },
        {
            "id": "tool_hooks",
            "label": "Tool Hooks",
            "nodes": [
                "F5",
                "F6",
                "F9",
                "F10",
                "C3",
                "C4",
                "D2"
            ]
        },
        {
            "id": "decorator_internals",
            "label": "Decorator Internals",
            "nodes": [
                "F2",
                "F13",
                "F14"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph Global Hook Management
        F1[clear_all_global_hooks]
        F11[clear_all_llm_call_hooks]
        F12[clear_all_tool_call_hooks]
    end

    subgraph LLM Hooks
        F3[before_llm_call]
        F4[after_llm_call]
        F7[register_before_llm_call_hook]
        F8[register_after_llm_call_hook]
        C1[BeforeLLMCallHookMethod]
        C2[AfterLLMCallHookMethod]
        D1[(LLMCallHookContext)]
    end

    subgraph Tool Hooks
        F5[before_tool_call]
        F6[after_tool_call]
        F9[register_before_tool_call_hook]
        F10[register_after_tool_call_hook]
        C3[BeforeToolCallHookMethod]
        C4[AfterToolCallHookMethod]
        D2[(ToolCallHookContext)]
    end

    subgraph Decorator Internals
        F2[decorator_factory]
        F13[_create_hook_decorator]
        F14[_copy_method_metadata]
    end

    F1 --> F11
    F1 --> F12

    F3 --> F13
    F4 --> F13
    F5 --> F13
    F6 --> F13

    F13 -- configures --> F2

    F2 -- registers --> F7
    F2 -- registers --> F8
    F2 -- registers --> F9
    F2 -- registers --> F10

    C1 --> F14
    C2 --> F14
    C3 --> F14
    C4 --> F14

    F3 -. operates on .-> D1
    F4 -. operates on .-> D1
    C1 -. operates on .-> D1
    C2 -. operates on .-> D1

    F5 -. operates on .-> D2
    F6 -. operates on .-> D2
    C3 -. operates on .-> D2
    C4 -. operates on .-> D2

    F2 -. filters by .-> D1
    F2 -. filters by .-> D2
```