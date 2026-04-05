# autoformer_models

## Introduction

The `autoformer_models` module provides the implementation for the Autoformer model, specifically tailored for time series prediction tasks. The core component, `AutoformerForPrediction`, enables both training with probabilistic outputs and generating future predictions.

## Architecture and Component Relationships

 The `AutoformerForPrediction` class is the central component of this module. It leverages an internal `AutoformerModel` for sequence processing and integrates a probabilistic head for generating predictions based on various distribution types (Student-T, Normal, Negative Binomial).

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "autoformer_for_prediction", "label": "AutoformerForPrediction", "type": "component", "link": null},
        {"id": "autoformer_model_internal", "label": "AutoformerModel (internal)", "type": "component", "link": null},
        {"id": "output_distribution_layer", "label": "Distribution Output Layer", "type": "component", "link": null},
        {"id": "nll_loss_function", "label": "Negative Log-Likelihood Loss", "type": "component", "link": null},
        {"id": "autoformer_config", "label": "AutoformerConfig", "type": "external", "link": "autoformer_config.md"},
        {"id": "modeling_utilities", "label": "Modeling Utilities", "type": "external", "link": "modeling_utilities.md"}
    ],
    "edges": [
        {"source": "autoformer_for_prediction", "target": "autoformer_model_internal"},
        {"source": "autoformer_for_prediction", "target": "output_distribution_layer"},
        {"source": "autoformer_for_prediction", "target": "nll_loss_function"},
        {"source": "autoformer_for_prediction", "target": "autoformer_config"},
        {"source": "autoformer_for_prediction", "target": "modeling_utilities"},
        {"source": "output_distribution_layer", "target": "autoformer_config"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    autoformer_for_prediction[AutoformerForPrediction]
    autoformer_model_internal[AutoformerModel (internal)]
    output_distribution_layer[Distribution Output Layer]
    nll_loss_function[Negative Log-Likelihood Loss]
    autoformer_config[AutoformerConfig]
    modeling_utilities[Modeling Utilities]

    autoformer_for_prediction --> autoformer_model_internal
    autoformer_for_prediction --> output_distribution_layer
    autoformer_for_prediction --> nll_loss_function
    autoformer_for_prediction --> autoformer_config
    autoformer_for_prediction --> modeling_utilities
    output_distribution_layer --> autoformer_config
```

### `AutoformerForPrediction`

`AutoformerForPrediction` is the primary class for performing time series prediction using the Autoformer architecture. It inherits from `AutoformerPreTrainedModel` (from [modeling_utilities.md](modeling_utilities.md)) and integrates the core `AutoformerModel` to process sequential data. It supports various probabilistic output distributions like Student-T, Normal, and Negative Binomial, configurable via `AutoformerConfig`.

#### Key Functionality:

-   **Initialization**: Configures the underlying `AutoformerModel`, selects the appropriate probabilistic distribution output (e.g., `StudentTOutput`, `NormalOutput`), and sets the loss function (currently supports Negative Log-Likelihood - `nll`).
-   **`forward` method**: Handles the training pass, taking past and future time series values, along with various features (time features, static categorical, static real, observed masks). It passes inputs through the `AutoformerModel`, projects the output to distribution parameters, and calculates the prediction loss.
-   **`generate` method**: Provides an inference mechanism to greedily generate sequences of sample predictions. It uses the trained model to forecast future values based on provided past data and future time features.

#### Parameters for `forward` method:

-   `past_values`: Historical time series data used as context.
-   `past_time_features`: Positional encodings or additional time-based features for past data.
-   `past_observed_mask`: Mask indicating observed vs. missing `past_values`.
-   `static_categorical_features`: Categorical features constant over time.
-   `static_real_features`: Real-valued features constant over time.
-   `future_values`: Future time series data, used as labels during training.
-   `future_time_features`: Positional encodings or additional time-based features for future data.
-   `future_observed_mask`: Mask indicating observed vs. missing `future_values`.

#### Output for `forward` method:

Returns a `Seq2SeqTSPredictionOutput` object containing prediction loss, distribution parameters, hidden states, attentions, and other relevant information.

#### Parameters for `generate` method:

-   `past_values`: Historical time series data to condition predictions.
-   `past_time_features`: Positional encodings or additional time-based features for past data.
-   `future_time_features`: Positional encodings or additional time-based features for the prediction window.
-   `past_observed_mask`: Mask indicating observed vs. missing `past_values`.
-   `static_categorical_features`: Categorical features constant over time.
-   `static_real_features`: Real-valued features constant over time.

#### Output for `generate` method:

Returns a `SampleTSPredictionOutput` object, where the `sequences` tensor contains the generated future samples.

## Integration with the Overall System

The `autoformer_models` module is a specialized component within the Hugging Face Transformers library, focusing on advanced time series forecasting. It integrates with the broader ecosystem by:

-   **Inheriting from `AutoformerPreTrainedModel`**: This ensures compatibility with standard Hugging Face model functionalities, such as `from_pretrained`, `save_pretrained`, and model configuration management.
-   **Leveraging `AutoformerConfig`**: Configuration details are managed through an `AutoformerConfig` object, which is part of the standard configuration system, allowing for easy serialization and loading of model parameters.
-   **Providing `forward` and `generate` methods**: These methods adhere to common patterns in the Transformers library for training and inference, making it straightforward for developers to integrate Autoformer into existing training loops or prediction pipelines.

This module extends the capabilities of the Transformers library to handle complex time series data, offering probabilistic predictions which are crucial for applications requiring uncertainty quantification in forecasts.