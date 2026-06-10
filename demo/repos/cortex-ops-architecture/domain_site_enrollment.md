# Site & Enrollment Ops

Find patients, nudge sites, manage readiness, vendors, contracts, payments, and training.

## Agents

- `recruitment-hunter`
- `recruitment-marketing-agent`
- `diversity-inclusion-agent`
- `patient-engagement-agent`
- `site-nudge`
- `training-compliance-agent`
- `ethics-committee-agent`
- `contract-negotiation-agent`
- `payment-automation-agent`
- `vendor-performance-agent`

## Functional Edges

- `ext_site_ehr_fhir` -> `recruitment-hunter` (FHIR match)
- `recruitment-hunter` -> `recruitment-marketing-agent` (candidate supply)
- `recruitment-marketing-agent` -> `diversity-inclusion-agent` (campaign mix)
- `diversity-inclusion-agent` -> `site-nudge` (site targeting)
- `site-nudge` -> `patient-engagement-agent` (retention loop)
- `ext_patient_engagement_apps` -> `patient-engagement-agent` (engagement feed)
- `site-nudge` -> `training-compliance-agent` (readiness blockers)
- `training-compliance-agent` -> `ethics-committee-agent` (activation evidence)
- `ethics-committee-agent` -> `contract-negotiation-agent` (startup gate)
- `contract-negotiation-agent` -> `payment-automation-agent` (milestone terms)
- `ext_vendor_portals` -> `vendor-performance-agent` (SLA feed)
- `vendor-performance-agent` -> `contract-negotiation-agent` (risk clauses)
- `ext_training_lms` -> `training-compliance-agent` (training records)
