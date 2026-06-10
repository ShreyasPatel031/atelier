# Data + AI governance workbench

What data/regulatory/platform owners do: clean data, drive DB lock, audit prompts/decisions, watch connector health, and enforce trust boundaries.

## Groups

- **Primary users**: `role_data_reg`, `role_platform`
- **Work queues**: `task_query_review`, `task_lock_path`, `task_prompt_audit`, `task_connector_health`
- **Agent touchpoints**: `domain_data_quality_lock`, `domain_safety_reg_tmf`, `domain_platform_trust_integrations`
- **What they inspect**: `view_queries`, `view_tmf`, `view_platform`

## Flow

- `role_data_reg` -> `task_query_review` (owns)
- `role_data_reg` -> `task_lock_path` (owns)
- `role_platform` -> `task_prompt_audit` (owns)
- `role_platform` -> `task_connector_health` (owns)
- `task_query_review` -> `domain_data_quality_lock` (uses)
- `task_lock_path` -> `domain_data_quality_lock` (prioritizes)
- `task_lock_path` -> `domain_safety_reg_tmf` (evidence)
- `task_prompt_audit` -> `domain_platform_trust_integrations` (audits)
- `task_connector_health` -> `domain_platform_trust_integrations` (monitors)
- `domain_data_quality_lock` -> `view_queries` (surfaces)
- `domain_safety_reg_tmf` -> `view_tmf` (surfaces)
- `domain_platform_trust_integrations` -> `view_platform` (surfaces)
