# Data Quality & DB Lock

Normalize EDC/lab/device/imaging feeds, govern standards, resolve queries, and clear lock blockers.

## Agents

- `rave-normalization-agent`
- `clinical-ontology-agent`
- `risk-management-agent`
- `data-standard-agent`
- `medical-coding-agent`
- `biostat-agent`
- `device-integration-agent`
- `imaging-agent`
- `lab-reconciliation-agent`
- `query-agent`
- `lock-blocker`

## Functional Edges

- `ext_medidata_rave` -> `rave-normalization-agent` (ODM/ALS)
- `rave-normalization-agent` -> `clinical-ontology-agent` (normalized state)
- `clinical-ontology-agent` -> `data-standard-agent` (semantic rules)
- `data-standard-agent` -> `medical-coding-agent` (standard terms)
- `ext_cluepoints` -> `risk-management-agent` (RBQM signal)
- `risk-management-agent` -> `query-agent` (risk context)
- `ext_central_lab_lims` -> `lab-reconciliation-agent` (lab feed)
- `lab-reconciliation-agent` -> `query-agent` (sample mismatch)
- `ext_central_imaging` -> `imaging-agent` (image status)
- `device-integration-agent` -> `clinical-ontology-agent` (wearable signal)
- `query-agent` -> `lock-blocker` (open query state)
- `biostat-agent` -> `lock-blocker` (SAP/data checks)
- `medical-coding-agent` -> `lock-blocker` (coded terms)
