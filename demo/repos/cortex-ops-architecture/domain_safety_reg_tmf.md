# Safety, Regulatory & TMF

Detect safety/deviation signals, control TMF quality, prepare inspections, and draft regulatory content.

## Agents

- `protocol-deviation-agent`
- `safety-signal-agent`
- `tmf-quality-agent`
- `tmf-sentinel`
- `audit-readiness-agent`
- `protocol-agent`
- `medical-writing-agent`
- `translation-agent`
- `cfr-compliance-agent`
- `pharmacy-agent`

## Functional Edges

- `protocol-deviation-agent` -> `safety-signal-agent` (deviation context)
- `pharmacy-agent` -> `safety-signal-agent` (IP accountability)
- `safety-signal-agent` -> `ext_oracle_argus` (SAE case)
- `ext_veeva_vault` -> `tmf-quality-agent` (TMF docs)
- `tmf-quality-agent` -> `tmf-sentinel` (quality finding)
- `tmf-sentinel` -> `audit-readiness-agent` (inspection package)
- `audit-readiness-agent` -> `cfr-compliance-agent` (audit trail)
- `protocol-agent` -> `medical-writing-agent` (amendment impact)
- `medical-writing-agent` -> `translation-agent` (localized docs)
- `cfr-compliance-agent` -> `ext_gxp_change_control` (PaaR record)
- `ext_irt_rtsm` -> `pharmacy-agent` (supply/accountability)
