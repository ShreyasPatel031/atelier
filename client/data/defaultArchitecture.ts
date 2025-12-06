/**
 * Complex default architecture for testing ELK layout with LOCK mode.
 * 
 * Structure:
 * - root: The entire canvas (FREE, not rendered as a visual element)
 *   - group_1: Main visible group containing the architecture (LOCK mode for ELK routing)
 *     - All nodes and nested groups
 */
export const DEFAULT_ARCHITECTURE = {
  "id": "root",
  "mode": "FREE",  // Root is always FREE per FIGJAM_REFACTOR.md
  "children": [
    {
      "id": "group_1",
      "labels": [{ "text": "GCP Architecture" }],
      "mode": "LOCK",  // LOCK mode for ELK edge routing
      "data": {
        "label": "GCP Architecture",
        "isGroup": true,
        "groupIcon": "gcp_logo"
      },
      "children": [
        {
          "id": "external_clients",
          "labels": [{ "text": "External Clients" }],
          "mode": "LOCK",
          "data": { "isGroup": true },
          "children": [
            {
              "id": "external_client",
              "labels": [{ "text": "Browser Client" }],
              "children": [],
              "edges": [],
              "data": { "icon": "browser_client" }
            }
          ],
          "edges": []
        },
        {
          "id": "gcp_env",
          "labels": [{ "text": "GCP Environment" }],
          "mode": "LOCK",
          "data": { "isGroup": true, "groupIcon": "gcp_logo" },
          "children": [
            {
              "id": "api_gateway",
              "labels": [{ "text": "API Gateway" }],
              "mode": "LOCK",
              "data": { "isGroup": true },
              "children": [
                {
                  "id": "cloud_lb",
                  "labels": [{ "text": "Cloud Load Balancer" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_cloud_load_balancing" }
                },
                {
                  "id": "cloud_armor",
                  "labels": [{ "text": "Cloud Armor" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_cloud_armor" }
                },
                {
                  "id": "cloud_cdn",
                  "labels": [{ "text": "Cloud CDN" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_cloud_cdn" }
                }
              ],
              "edges": [
                {
                  "id": "edge_cdn_lb",
                  "sources": ["cloud_cdn"],
                  "targets": ["cloud_lb"],
                  "labels": [{ "text": "caches" }]
                },
                {
                  "id": "edge_armor_lb",
                  "sources": ["cloud_armor"],
                  "targets": ["cloud_lb"],
                  "labels": [{ "text": "protects" }]
                }
              ]
            },
            {
              "id": "compute_services",
              "labels": [{ "text": "Compute Services" }],
              "mode": "LOCK",
              "data": { "isGroup": true },
              "children": [
                {
                  "id": "gke_cluster",
                  "labels": [{ "text": "GKE Cluster" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_kubernetes_engine" }
                },
                {
                  "id": "cloud_run",
                  "labels": [{ "text": "Cloud Run" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_cloud_run" }
                },
                {
                  "id": "cloud_functions",
                  "labels": [{ "text": "Cloud Functions" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_cloud_functions" }
                }
              ],
              "edges": [
                {
                  "id": "edge_gke_run",
                  "sources": ["gke_cluster"],
                  "targets": ["cloud_run"],
                  "labels": [{ "text": "triggers" }]
                },
                {
                  "id": "edge_run_functions",
                  "sources": ["cloud_run"],
                  "targets": ["cloud_functions"],
                  "labels": [{ "text": "invokes" }]
                }
              ]
            },
            {
              "id": "data_services",
              "labels": [{ "text": "Data Services" }],
              "mode": "LOCK",
              "data": { "isGroup": true },
              "children": [
                {
                  "id": "cloud_sql",
                  "labels": [{ "text": "Cloud SQL" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_cloud_sql" }
                },
                {
                  "id": "cloud_storage",
                  "labels": [{ "text": "Cloud Storage" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_cloud_storage" }
                },
                {
                  "id": "bigquery",
                  "labels": [{ "text": "BigQuery" }],
                  "children": [],
                  "edges": [],
                  "data": { "icon": "gcp_bigquery" }
                }
              ],
              "edges": [
                {
                  "id": "edge_sql_storage",
                  "sources": ["cloud_sql"],
                  "targets": ["cloud_storage"],
                  "labels": [{ "text": "backs up" }]
                },
                {
                  "id": "edge_storage_bq",
                  "sources": ["cloud_storage"],
                  "targets": ["bigquery"],
                  "labels": [{ "text": "feeds" }]
                }
              ]
            }
          ],
          "edges": [
            {
              "id": "edge_lb_gke",
              "sources": ["cloud_lb"],
              "targets": ["gke_cluster"],
              "labels": [{ "text": "routes to" }]
            },
            {
              "id": "edge_gke_sql",
              "sources": ["gke_cluster"],
              "targets": ["cloud_sql"],
              "labels": [{ "text": "queries" }]
            },
            {
              "id": "edge_functions_storage",
              "sources": ["cloud_functions"],
              "targets": ["cloud_storage"],
              "labels": [{ "text": "writes to" }]
            }
          ]
        },
        {
          "id": "users",
          "labels": [{ "text": "Users" }],
          "mode": "LOCK",
          "data": { "isGroup": true },
          "children": [
            {
              "id": "web_client",
              "labels": [{ "text": "Web Client" }],
              "children": [],
              "edges": [],
              "data": { "icon": "browser_client" }
            },
            {
              "id": "mobile_client",
              "labels": [{ "text": "Mobile Client" }],
              "children": [],
              "edges": [],
              "data": { "icon": "mobile_client" }
            }
          ],
          "edges": []
        }
      ],
      "edges": [
        {
          "id": "edge_client_lb",
          "sources": ["external_client"],
          "targets": ["cloud_lb"],
          "labels": [{ "text": "requests" }]
        },
        {
          "id": "edge_web_gke",
          "sources": ["web_client"],
          "targets": ["gke_cluster"],
          "labels": [{ "text": "connects to" }]
        },
        {
          "id": "edge_mobile_gke",
          "sources": ["mobile_client"],
          "targets": ["gke_cluster"],
          "labels": [{ "text": "connects to" }]
        }
      ]
    }
  ],
  "edges": []
};
