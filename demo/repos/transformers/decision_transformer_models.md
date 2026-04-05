# Decision Transformer Models

## Introduction

The `decision_transformer_models` module provides the implementation for the Decision Transformer model, a model designed for autoregressive prediction of actions in an offline Reinforcement Learning (RL) setting. It adapts the GPT-2 architecture to model trajectories as sequences of states, actions, and returns-to-go, allowing it to generate actions that lead to a desired return.

## Core Functionality

The primary component of this module is `DecisionTransformerModel`.

### `DecisionTransformerModel`

`DecisionTransformerModel` is a transformer-based model that takes a sequence of states, actions, rewards, returns-to-go, and timesteps as input. It processes these inputs through embedding layers and a GPT-2-like encoder to predict future states, actions, and returns. This model is particularly useful for offline reinforcement learning, where it can learn policies from fixed datasets of expert trajectories.

**Key Features:**
-   **Trajectory Modeling**: Models entire trajectories (state, action, return-to-go) as a single sequence.
-   **Autoregressive Prediction**: Predicts actions autoregressively based on preceding states, returns, and actions.
-   **GPT-2 Architecture Base**: Leverages a modified GPT-2 architecture for sequence processing, with positional embeddings handled internally.
-   **Modality-Specific Embeddings**: Uses separate linear layers and an embedding table for states, actions, returns-to-go, and timesteps to project them into a common hidden space.

## Architecture and Component Relationships

The `DecisionTransformerModel` integrates several internal components for embedding and prediction, and builds upon a base class from the `modeling_utilities` module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "decision_transformer_model", "label": "DecisionTransformerModel", "type": "component", "link": null},
        {"id": "encoder", "label": "DecisionTransformerGPT2Model (Encoder)", "type": "component", "link": null},
        {"id": "embed_timestep", "label": "Embed Timestep", "type": "component", "link": null},
        {"id": "embed_return", "label": "Embed Return", "type": "component", "link": null},
        {"id": "embed_state", "label": "Embed State", "type": "component", "link": null},
        {"id": "embed_action", "label": "Embed Action", "type": "component", "link": null},
        {"id": "embed_ln", "label": "Layer Normalization", "type": "component", "link": null},
        {"id": "predict_state", "label": "Predict State", "type": "component", "link": null},
        {"id": "predict_action", "label": "Predict Action", "type": "component", "link": null},
        {"id": "predict_return", "label": "Predict Return", "type": "component", "link": null},
        {"id": "modeling_utilities", "label": "Modeling Utilities", "type": "external", "link": "modeling_utilities.md"}
    ],
    "edges": [
        {"source": "decision_transformer_model", "target": "encoder"},
        {"source": "decision_transformer_model", "target": "embed_timestep"},
        {"source": "decision_transformer_model", "target": "embed_return"},
        {"source": "decision_transformer_model", "target": "embed_state"},
        {"source": "decision_transformer_model", "target": "embed_action"},
        {"source": "decision_transformer_model", "target": "embed_ln"},
        {"source": "decision_transformer_model", "target": "predict_state"},
        {"source": "decision_transformer_model", "target": "predict_action"},
        {"source": "decision_transformer_model", "target": "predict_return"},
        {"source": "modeling_utilities", "target": "decision_transformer_model", "label": "inherits from"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    decision_transformer_model[DecisionTransformerModel]
    encoder[DecisionTransformerGPT2Model (Encoder)]
    embed_timestep[Embed Timestep]
    embed_return[Embed Return]
    embed_state[Embed State]
    embed_action[Embed Action]
    embed_ln[Layer Normalization]
    predict_state[Predict State]
    predict_action[Predict Action]
    predict_return[Predict Return]
    modeling_utilities[Modeling Utilities]

    decision_transformer_model --> encoder
    decision_transformer_model --> embed_timestep
    decision_transformer_model --> embed_return
    decision_transformer_model --> embed_state
    decision_transformer_model --> embed_action
    decision_transformer_model --> embed_ln
    decision_transformer_model --> predict_state
    decision_transformer_model --> predict_action
    decision_transformer_model --> predict_return
    modeling_utilities --> decision_transformer_model

    style modeling_utilities fill:#f9f,stroke:#333,stroke-width:2px
```

## How it Fits into the Overall System

The `decision_transformer_models` module is a specialized component within the larger Transformers ecosystem, focusing on offline reinforcement learning. It allows for the training and deployment of Decision Transformer models, enabling sequence modeling approaches to control tasks. By using a causal transformer architecture, it provides a powerful mechanism for learning optimal policies from pre-collected trajectory data, without direct interaction with an environment during training.

Its integration means that developers can leverage the existing utilities and abstractions provided by the Transformers library, such as `PreTrainedModel` capabilities (via [modeling_utilities.md](modeling_utilities.md)), for model loading, saving, and inference.

## Usage Examples

```python
>>> from transformers import DecisionTransformerModel
>>> import torch

>>> model = DecisionTransformerModel.from_pretrained("edbeeching/decision-transformer-gym-hopper-medium")
>>> # evaluation
>>> model = model.to(device)
>>> model.eval()

>>> env = gym.make("Hopper-v3")
>>> state_dim = env.observation_space.shape[0]
>>> act_dim = env.action_space.shape[0]

>>> state = env.reset()
>>> states = torch.from_numpy(state).reshape(1, 1, state_dim).to(device=device, dtype=torch.float32)
>>> actions = torch.zeros((1, 1, act_dim), device=device, dtype=torch.float32)
>>> rewards = torch.zeros(1, 1, device=device, dtype=torch.float32)
>>> target_return = torch.tensor(TARGET_RETURN, dtype=torch.float32).reshape(1, 1)
>>> timesteps = torch.tensor(0, device=device, dtype=torch.long).reshape(1, 1)
>>> attention_mask = torch.zeros(1, 1, device=device, dtype=torch.float32)

>>> # forward pass
>>> with torch.no_grad():
...     state_preds, action_preds, return_preds = model(
...         states=states,
...         actions=actions,
...         rewards=rewards,
...         returns_to_go=target_return,
...         timesteps=timesteps,
...         attention_mask=attention_mask,
...         return_dict=False,
...     )
```