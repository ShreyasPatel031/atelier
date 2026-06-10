# Study command workbench

What study leaders do: monitor KRIs, rebalance field capacity, review escalations, and approve/override autonomous recommendations.

## Groups

- **Primary users**: `role_ops`
- **Decisions**: `task_kri_triage`, `task_capacity`, `task_hitl`, `task_escalation`
- **Agent touchpoints**: `domain_site_enrollment`, `domain_safety_reg_tmf`, `domain_platform_trust_integrations`
- **What they inspect**: `view_sites`, `view_tmf`, `view_platform`

## Flow

- `role_ops` -> `task_kri_triage` (reviews)
- `task_kri_triage` -> `view_sites` (reads)
- `task_kri_triage` -> `domain_site_enrollment` (asks)
- `task_capacity` -> `domain_site_enrollment` (rebalance)
- `task_hitl` -> `domain_platform_trust_integrations` (audit)
- `task_escalation` -> `domain_safety_reg_tmf` (routes)
- `domain_safety_reg_tmf` -> `view_tmf` (surfaces)
- `domain_platform_trust_integrations` -> `view_platform` (monitors)
