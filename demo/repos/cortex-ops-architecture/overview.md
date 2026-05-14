# Cortex Ops — users, agents, and data sources


Architecture view derived from data/dummyData.ts: 41 systemAgents, UserRole personas, React + geminiService entry path, integrationConnectors, and agent→external heuristics.

## How To Read

- **Root canvas** follows the app flow: select a **role**, see role-specific **tabs**, use **agents**, and read/write **data sources**.
- **Legend colors only mean three things**: users/roles, agents, and data sources.
- **Every diagram** stays capped: at most four sibling groups and at most four nodes per group. Open module tiles for deeper detail.

<!-- DIAGRAM_JSON
{
  "direction": "LR",
  "nodes": [
    {
      "id": "role_field",
      "label": "Field users\nCRA \u00b7 Study Monitor",
      "type": "module",
      "link": "role_field_flow.md"
    },
    {
      "id": "role_ops",
      "label": "Ops leaders\nStudy/Regional/Portfolio",
      "type": "module",
      "link": "role_ops_flow.md"
    },
    {
      "id": "role_data_reg",
      "label": "Data + regulatory\nData Lead \u00b7 CRO Lead",
      "type": "module",
      "link": "role_data_reg_flow.md"
    },
    {
      "id": "role_platform",
      "label": "AI/platform\nAI Lead",
      "type": "module",
      "link": "role_platform_flow.md"
    },
    {
      "id": "ui_tabs_field",
      "label": "Field tabs\nOverview \u00b7 Visits \u00b7 Queries",
      "type": "module",
      "link": "role_field_tabs.md"
    },
    {
      "id": "ui_tabs_ops",
      "label": "Ops tabs\nCommand \u00b7 portfolio \u00b7 HITL",
      "type": "module",
      "link": "role_ops_tabs.md"
    },
    {
      "id": "ui_tabs_data",
      "label": "Data/CRO tabs\nCommand \u00b7 governance",
      "type": "module",
      "link": "role_data_reg_tabs.md"
    },
    {
      "id": "ui_tabs_platform",
      "label": "AI tabs\norchestration \u00b7 observability",
      "type": "module",
      "link": "role_platform_tabs.md"
    },
    {
      "id": "domain_site_enrollment",
      "label": "Site & Enrollment Ops",
      "type": "module",
      "link": "domain_site_enrollment.md"
    },
    {
      "id": "domain_data_quality_lock",
      "label": "Data Quality & DB Lock",
      "type": "module",
      "link": "domain_data_quality_lock.md"
    },
    {
      "id": "domain_safety_reg_tmf",
      "label": "Safety, Regulatory & TMF",
      "type": "module",
      "link": "domain_safety_reg_tmf.md"
    },
    {
      "id": "domain_platform_trust_integrations",
      "label": "Platform, Trust & Integrations",
      "type": "module",
      "link": "domain_platform_trust_integrations.md"
    },
    {
      "id": "ext_veeva_vault",
      "label": "Veeva Vault (CTMS / eTMF)\n[CONN-VEEVA]",
      "type": "external",
      "link": null
    },
    {
      "id": "ext_medidata_rave",
      "label": "Medidata Rave (EDC)\n[CONN-MEDI]",
      "type": "external",
      "link": null
    },
    {
      "id": "ext_saama_lsac",
      "label": "Saama LSAC / SDQ\n[CONN-SAAMA]",
      "type": "external",
      "link": null
    },
    {
      "id": "tile_external_hub",
      "label": "All data sources\nexternal catalog",
      "type": "module",
      "link": "external_systems.md"
    }
  ],
  "edges": [
    {
      "source": "role_field",
      "target": "ui_tabs_field",
      "label": "selects role"
    },
    {
      "source": "role_ops",
      "target": "ui_tabs_ops",
      "label": "selects role"
    },
    {
      "source": "role_data_reg",
      "target": "ui_tabs_data",
      "label": "selects role"
    },
    {
      "source": "role_platform",
      "target": "ui_tabs_platform",
      "label": "selects role"
    },
    {
      "source": "ui_tabs_field",
      "target": "domain_site_enrollment",
      "label": "uses"
    },
    {
      "source": "ui_tabs_field",
      "target": "domain_data_quality_lock",
      "label": "follows up"
    },
    {
      "source": "ui_tabs_ops",
      "target": "domain_site_enrollment",
      "label": "directs"
    },
    {
      "source": "ui_tabs_ops",
      "target": "domain_safety_reg_tmf",
      "label": "escalates"
    },
    {
      "source": "ui_tabs_data",
      "target": "domain_data_quality_lock",
      "label": "queries/lock"
    },
    {
      "source": "ui_tabs_data",
      "target": "domain_safety_reg_tmf",
      "label": "evidence"
    },
    {
      "source": "ui_tabs_platform",
      "target": "domain_platform_trust_integrations",
      "label": "operates"
    },
    {
      "source": "domain_site_enrollment",
      "target": "ext_veeva_vault",
      "label": "CTMS/eTMF"
    },
    {
      "source": "domain_data_quality_lock",
      "target": "ext_medidata_rave",
      "label": "EDC"
    },
    {
      "source": "domain_data_quality_lock",
      "target": "ext_saama_lsac",
      "label": "lake"
    },
    {
      "source": "domain_safety_reg_tmf",
      "target": "ext_veeva_vault",
      "label": "TMF"
    },
    {
      "source": "domain_platform_trust_integrations",
      "target": "tile_external_hub",
      "label": "connectors"
    },
    {
      "source": "role_field",
      "target": "role_ops",
      "label": "field signals"
    },
    {
      "source": "role_ops",
      "target": "role_data_reg",
      "label": "data/TMF escalations"
    },
    {
      "source": "role_data_reg",
      "target": "role_platform",
      "label": "governance requests"
    },
    {
      "source": "ui_tabs_field",
      "target": "ui_tabs_ops",
      "label": "site rollup"
    },
    {
      "source": "ui_tabs_ops",
      "target": "ui_tabs_data",
      "label": "quality/escalation review"
    },
    {
      "source": "ui_tabs_data",
      "target": "ui_tabs_platform",
      "label": "audit/connector review"
    },
    {
      "source": "domain_site_enrollment",
      "target": "domain_data_quality_lock",
      "label": "site query feed"
    },
    {
      "source": "domain_data_quality_lock",
      "target": "domain_safety_reg_tmf",
      "label": "lock evidence"
    },
    {
      "source": "domain_safety_reg_tmf",
      "target": "domain_platform_trust_integrations",
      "label": "audit controls"
    },
    {
      "source": "ext_veeva_vault",
      "target": "ext_saama_lsac",
      "label": "CTMS/TMF feed"
    },
    {
      "source": "ext_medidata_rave",
      "target": "ext_saama_lsac",
      "label": "EDC feed"
    },
    {
      "source": "tile_external_hub",
      "target": "ext_veeva_vault",
      "label": "catalogs"
    },
    {
      "source": "tile_external_hub",
      "target": "ext_medidata_rave",
      "label": "catalogs"
    },
    {
      "source": "tile_external_hub",
      "target": "ext_saama_lsac",
      "label": "catalogs"
    }
  ],
  "groups": [
    {
      "id": "g1_users",
      "label": "1 \u00b7 Users / selectable roles",
      "nodes": [
        "role_field",
        "role_ops",
        "role_data_reg",
        "role_platform"
      ]
    },
    {
      "id": "g2_tabs",
      "label": "2 \u00b7 Tabs after role selection",
      "nodes": [
        "ui_tabs_field",
        "ui_tabs_ops",
        "ui_tabs_data",
        "ui_tabs_platform"
      ]
    },
    {
      "id": "g3_agents",
      "label": "3 \u00b7 Agents / agent domains",
      "nodes": [
        "domain_site_enrollment",
        "domain_data_quality_lock",
        "domain_safety_reg_tmf",
        "domain_platform_trust_integrations"
      ]
    },
    {
      "id": "g4_data_sources",
      "label": "4 \u00b7 Data sources",
      "nodes": [
        "ext_veeva_vault",
        "ext_medidata_rave",
        "ext_saama_lsac",
        "tile_external_hub"
      ]
    }
  ]
}
-->
