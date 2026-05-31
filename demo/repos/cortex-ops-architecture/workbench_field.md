# Field execution workbench

What CRAs and monitors do: inspect site risk, follow AI nudges, clear readiness issues, and push follow-up work back into the tower.

## Groups

- **Primary users**: `role_field`
- **What they do**: `task_visit_plan`, `task_site_nudge`, `task_readiness`, `task_followup`
- **Agent touchpoints**: `domain_site_enrollment`, `domain_data_quality_lock`
- **What they inspect**: `view_sites`, `view_queries`

## Flow

- `role_field` -> `task_visit_plan` (starts)
- `task_visit_plan` -> `view_sites` (reads)
- `view_sites` -> `task_site_nudge` (triggers)
- `task_site_nudge` -> `domain_site_enrollment` (uses)
- `task_readiness` -> `domain_site_enrollment` (clears)
- `task_followup` -> `domain_data_quality_lock` (feeds)
- `domain_data_quality_lock` -> `view_queries` (surfaces)
