# external_integrations
The `external_integrations` module manages interactions with various external services and configuration files, primarily focusing on AI model providers like Ollama, OpenRouter, and Anthropic through components like Droid, Hermes, and Openclaw.

<!-- DIAGRAM_JSON
{
    "nodes": [
        {
            "id": "external_integrations",
            "label": "external_integrations",
            "type": "module"
        },
        {
            "id": "C_DR",
            "label": "Droid"
        },
        {
            "id": "C_HE",
            "label": "Hermes"
        },
        {
            "id": "C_OC",
            "label": "Openclaw"
        },
        {
            "id": "CF_SET",
            "label": "settings.json"
        },
        {
            "id": "CF_CFG",
            "label": "config.yaml"
        },
        {
            "id": "CF_OCJ",
            "label": "openclaw.json"
        },
        {
            "id": "ES_OLL",
            "label": "Ollama Service"
        },
        {
            "id": "ES_OPR",
            "label": "OpenRouter Service"
        },
        {
            "id": "ES_ANT",
            "label": "Anthropic Service"
        },
        {
            "id": "TU_HTS",
            "label": "HTTP Test Server"
        },
        {
            "id": "OU_CP",
            "label": "ConfirmPrompt"
        },
        {
            "id": "OU_EOI",
            "label": "ensureOpenclawInstalled"
        },
        {
            "id": "TU_STH",
            "label": "setTestHome"
        },
        {
            "id": "TU_WHP",
            "label": "withHermesPlatform"
        },
        {
            "id": "TU_WHO",
            "label": "withHermesOllamaURL"
        },
        {
            "id": "OU_WH",
            "label": "windowsHint"
        },
        {
            "id": "OU_PDS",
            "label": "patchDeviceScopes"
        },
        {
            "id": "OU_EWSP",
            "label": "ensureWebSearchPlugin"
        },
        {
            "id": "OU_RWSP",
            "label": "registerWebSearchPlugin"
        },
        {
            "id": "OU_RCSP",
            "label": "runChannelSetupPreflight"
        },
        {
            "id": "OU_EH",
            "label": "envconfig.Host"
        },
        {
            "id": "OU_EC",
            "label": "exec.Command"
        },
        {
            "id": "vscode_integration",
            "label": "VS Code Extension Integration",
            "type": "module",
            "link": "vscode_integration.md"
        },
        {
            "id": "hermes_integration",
            "label": "Hermes Configuration",
            "type": "module",
            "link": "hermes_integration.md"
        },
        {
            "id": "openclaw_integration",
            "label": "OpenClaw Tool Management",
            "type": "module",
            "link": "openclaw_integration.md"
        },
        {
            "id": "droid_integration",
            "label": "Droid CLI Integration",
            "type": "module",
            "link": "droid_integration.md"
        },
        {
            "id": "opencode_integration",
            "label": "OpenCode Editor Configuration",
            "type": "module",
            "link": "opencode_integration.md"
        },
        {
            "id": "pi_integration",
            "label": "Pi Agent Configuration",
            "type": "module",
            "link": "pi_integration.md"
        }
    ],
    "edges": [
        {
            "source": "C_DR",
            "target": "CF_SET",
            "label": "reads/writes"
        },
        {
            "source": "C_DR",
            "target": "ES_OLL",
            "label": "manages models"
        },
        {
            "source": "C_DR",
            "target": "TU_STH",
            "label": "uses (in tests)"
        },
        {
            "source": "C_HE",
            "target": "CF_CFG",
            "label": "reads/writes"
        },
        {
            "source": "C_HE",
            "target": "ES_OLL",
            "label": "configures provider"
        },
        {
            "source": "C_HE",
            "target": "ES_OPR",
            "label": "configures provider"
        },
        {
            "source": "C_HE",
            "target": "TU_HTS",
            "label": "uses (in tests)"
        },
        {
            "source": "C_HE",
            "target": "TU_STH",
            "label": "uses (in tests)"
        },
        {
            "source": "C_HE",
            "target": "TU_WHP",
            "label": "uses (in tests)"
        },
        {
            "source": "C_HE",
            "target": "TU_WHO",
            "label": "uses (in tests)"
        },
        {
            "source": "C_OC",
            "target": "CF_OCJ",
            "label": "reads/writes"
        },
        {
            "source": "C_OC",
            "target": "ES_OLL",
            "label": "onboards/configures"
        },
        {
            "source": "C_OC",
            "target": "ES_ANT",
            "label": "configures provider"
        },
        {
            "source": "C_OC",
            "target": "OU_CP",
            "label": "uses"
        },
        {
            "source": "C_OC",
            "target": "OU_EOI",
            "label": "uses"
        },
        {
            "source": "C_OC",
            "target": "TU_STH",
            "label": "uses (in tests)"
        },
        {
            "source": "C_OC",
            "target": "OU_WH",
            "label": "uses"
        },
        {
            "source": "C_OC",
            "target": "OU_PDS",
            "label": "uses"
        },
        {
            "source": "C_OC",
            "target": "OU_EWSP",
            "label": "uses"
        },
        {
            "source": "C_OC",
            "target": "OU_RWSP",
            "label": "uses"
        },
        {
            "source": "C_OC",
            "target": "OU_RCSP",
            "label": "uses"
        },
        {
            "source": "C_OC",
            "target": "OU_EH",
            "label": "uses"
        },
        {
            "source": "C_OC",
            "target": "OU_EC",
            "label": "uses"
        },
        {
            "source": "external_integrations",
            "target": "vscode_integration"
        },
        {
            "source": "external_integrations",
            "target": "hermes_integration"
        },
        {
            "source": "external_integrations",
            "target": "openclaw_integration"
        },
        {
            "source": "external_integrations",
            "target": "droid_integration"
        },
        {
            "source": "external_integrations",
            "target": "opencode_integration"
        },
        {
            "source": "external_integrations",
            "target": "pi_integration"
        }
    ],
    "groups": []
}
-->
```mermaid
flowchart TD
    subgraph G_EI [external_integrations]
        C_DR[Droid]
        C_HE[Hermes]
        C_OC[Openclaw]
    end

    subgraph G_OU [Openclaw Utilities]
        OU_CP(ConfirmPrompt)
        OU_EOI(ensureOpenclawInstalled)
        OU_WH(windowsHint)
        OU_PDS(patchDeviceScopes)
        OU_EWSP(ensureWebSearchPlugin)
        OU_RWSP(registerWebSearchPlugin)
        OU_RCSP(runChannelSetupPreflight)
        OU_EH(envconfig.Host)
        OU_EC(exec.Command)
    end

    subgraph G_TU [Test Utilities]
        TU_HTS(HTTP Test Server)
        TU_STH(setTestHome)
        TU_WHP(withHermesPlatform)
        TU_WHO(withHermesOllamaURL)
    end

    subgraph G_CF [Configuration Files]
        CF_SET(settings.json)
        CF_CFG(config.yaml)
        CF_OCJ(openclaw.json)
    end

    subgraph G_ES [External Services]
        ES_OLL(Ollama Service)
        ES_OPR(OpenRouter Service)
        ES_ANT(Anthropic Service)
    end

    C_DR -- "reads/writes" --> CF_SET
    C_DR -- "manages models" --> ES_OLL
    C_DR -- "uses (in tests)" --> TU_STH

    C_HE -- "reads/writes" --> CF_CFG
    C_HE -- "configures provider" --> ES_OLL
    C_HE -- "configures provider" --> ES_OPR
    C_HE -- "uses (in tests)" --> TU_HTS
    C_HE -- "uses (in tests)" --> TU_STH
    C_HE -- "uses (in tests)" --> TU_WHP
    C_HE -- "uses (in tests)" --> TU_WHO

    C_OC -- "reads/writes" --> CF_OCJ
    C_OC -- "onboards/configures" --> ES_OLL
    C_OC -- "configures provider" --> ES_ANT
    C_OC -- "uses" --> OU_CP
    C_OC -- "uses" --> OU_EOI
    C_OC -- "uses (in tests)" --> TU_STH
    C_OC -- "uses" --> OU_WH
    C_OC -- "uses" --> OU_PDS
    C_OC -- "uses" --> OU_EWSP
    C_OC -- "uses" --> OU_RWSP
    C_OC -- "uses" --> OU_RCSP
    C_OC -- "uses" --> OU_EH
    C_OC -- "uses" --> OU_EC
```