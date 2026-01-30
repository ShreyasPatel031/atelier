# session_state_views Module Documentation

## Introduction

The `session_state_views` module is a crucial part of the client-side application, responsible for rendering the user interface based on the current state of the session (active or stopped). It provides the visual components and interaction points that allow users to start, stop, and interact with an active session by sending text messages.

This module is a sub-module of `session_ui_controls` and plays a key role in the overall [session_management.md](session_management.md) by offering the front-end representation of session states.

## Architecture and Component Relationships

This module encapsulates two primary components: `SessionStopped` and `SessionActive`. These components are mutually exclusive, with only one being displayed at any given time, reflecting whether a session is currently running or not.

### Core Components

*   **`SessionStopped`**: Displays a UI element (a button) to initiate a new session. It manages its own state for indicating a session is in the process of starting.
*   **`SessionActive`**: Displays the UI for an ongoing session, including an input field for sending text messages and buttons to send messages or terminate the session. It manages the message input state.

### Dependencies

The `session_state_views` module relies on several external functions and components to perform its tasks:

*   **Session Control Functions**: It receives `startSession` and `stopSession` callbacks, which are critical for changing the overall session state. These are typically provided by the [session_core.md](session_core.md) module or orchestrated by the main application component in [application_session_integration.md](application_session_integration.md).
*   **Messaging Functionality**: The `SessionActive` component utilizes a `sendTextMessage` callback to dispatch user-generated text messages to the backend or other parts of the system. This function is defined within the [event_creation.md](event_creation.md) module, a sub-module of [event_dispatching.md](event_dispatching.md).
*   **Basic UI Elements**: Both `SessionStopped` and `SessionActive` components make use of the generic `Button` component for user interactions, which is provided by the [basic_ui_elements.md](basic_ui_elements.md) module.

## System Integration

As a direct child of the [session_ui_controls.md](session_ui_controls.md) module, `session_state_views` provides the concrete UI implementations for managing the session lifecycle. It acts as the visual layer for the underlying session logic managed by [session_core.md](session_core.md) and integrated by [application_session_integration.md](application_session_integration.md).

This module's components subscribe to session state changes from the parent components and render themselves accordingly, offering a seamless user experience for starting, interacting with, and stopping sessions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "session_stopped_component", "label": "SessionStopped Component", "type": "component", "link": null},
        {"id": "session_active_component", "label": "SessionActive Component", "type": "component", "link": null},
        {"id": "start_session_func", "label": "startSession()", "type": "external", "link": "session_core.md"},
        {"id": "stop_session_func", "label": "stopSession()", "type": "external", "link": "session_core.md"},
        {"id": "send_text_message_func", "label": "sendTextMessage()", "type": "external", "link": "event_creation.md"},
        {"id": "button_component", "label": "Button Component", "type": "external", "link": "basic_ui_elements.md"}
    ],
    "edges": [
        {"source": "session_stopped_component", "target": "start_session_func"},
        {"source": "session_stopped_component", "target": "button_component"},
        {"source": "session_active_component", "target": "stop_session_func"},
        {"source": "session_active_component", "target": "send_text_message_func"},
        {"source": "session_active_component", "target": "button_component"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    session_stopped_component[SessionStopped Component]
    session_active_component[SessionActive Component]
    start_session_func[startSession()]
    stop_session_func[stopSession()]
    send_text_message_func[sendTextMessage()]
    button_component[Button Component]

    session_stopped_component --> start_session_func
    session_stopped_component --> button_component
    session_active_component --> stop_session_func
    session_active_component --> send_text_message_func
    session_active_component --> button_component
```
