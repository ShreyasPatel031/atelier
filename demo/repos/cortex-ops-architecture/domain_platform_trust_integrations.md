# Platform, Trust & Integrations

Orchestrate the swarm, ingest platform deltas, enforce identity/security, scale infra, and manage supply/sustainability.

## Agents

- `system-orchestrator`
- `veeva-pulse-agent`
- `saama-strategic-agent`
- `iam-governance-agent`
- `cyber-sentinel-agent`
- `deployment-architect-agent`
- `enterprise-scaler-agent`
- `iam-agent`
- `supply-chain-agent`
- `sustainability-agent`

## Functional Edges

- `ext_veeva_vault` -> `veeva-pulse-agent` (audit trail)
- `veeva-pulse-agent` -> `system-orchestrator` (Vault delta)
- `ext_saama_lsac` -> `saama-strategic-agent` (LSAC/SDQ)
- `saama-strategic-agent` -> `system-orchestrator` (tactical sync)
- `system-orchestrator` -> `iam-governance-agent` (access check)
- `iam-governance-agent` -> `iam-agent` (policy graph)
- `cyber-sentinel-agent` -> `iam-governance-agent` (threat revoke)
- `deployment-architect-agent` -> `enterprise-scaler-agent` (scale plan)
- `enterprise-scaler-agent` -> `system-orchestrator` (capacity signal)
- `supply-chain-agent` -> `system-orchestrator` (supply alert)
- `sustainability-agent` -> `deployment-architect-agent` (cost/carbon)
- `system-orchestrator` -> `ext_gemini_vertex` (LLM call)
- `deployment-architect-agent` -> `ext_gcp_cloud` (run/GKE)
