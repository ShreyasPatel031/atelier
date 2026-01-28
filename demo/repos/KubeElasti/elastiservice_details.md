The `elastiservice_details` module defines the core data structures for the desired state (`ElastiServiceSpec`) and the observed status (`ElastiServiceStatus`) of an `ElastiService` Custom Resource within the operator's API. These definitions are fundamental for configuring and monitoring the autoscaling behavior of services managed by the operator.

### ElastiServiceSpec

The `ElastiServiceSpec` defines the desired configuration for an `ElastiService` resource. It specifies how and when a target resource should be scaled.

**Core Fields:**

*   **`ScaleTargetRef`**: (Type: [scale_target_ref](scaling_definitions.md)) Specifies the Kubernetes resource to be scaled, including its API version, kind, and name.
*   **`Service`**: (Type: `string`) The name of the service associated with the target resource.
*   **`MinTargetReplicas`**: (Type: `int32`, Default: `1`, Minimum: `1`) The minimum number of replicas the target resource should maintain.
*   **`CooldownPeriod`**: (Type: `int32`, Default: `900`, Minimum: `0`, Maximum: `604800`) The duration in seconds that a target resource can remain idle before being scaled down.
*   **`Triggers`**: (Type: `[]ScaleTrigger`, Minimum Items: `1`) A list of conditions that trigger scaling actions. These triggers define the metrics and thresholds for autoscaling.
*   **`Autoscaler`**: (Type: [autoscaler_spec](scaling_definitions.md)) Optional specification for advanced autoscaler settings.

### ElastiServiceStatus

The `ElastiServiceStatus` reflects the current observed state of an `ElastiService` resource. It provides insights into the last reconciliation, scaling events, and the operational mode of the service.

**Core Fields:**

*   **`LastReconciledTime`**: (Type: `metav1.Time`) The timestamp of the last successful reconciliation of the `ElastiService` resource by the operator.
*   **`LastScaledUpTime`**: (Type: `*metav1.Time`) The timestamp of the last time the target resource was scaled up.
*   **`Mode`**: (Type: `string`) Indicates the current operating mode of the `ElastiService`.
    *   `"proxy"`: The `ScaleTargetRef` is scaled to `0` replicas, implying the service is idle or proxied.
    *   `"serve"`: The `ScaleTargetRef` is scaled to at least `1` replica, meaning the service is actively serving requests.

### Architecture Diagram

The following diagram illustrates the components within `elastiservice_details` and its relationships with external types defined in other modules.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "elastiservice_spec_node", "label": "ElastiServiceSpec", "type": "component", "link": null},
        {"id": "elastiservice_status_node", "label": "ElastiServiceStatus", "type": "component", "link": null},
        {"id": "scale_target_ref_ext", "label": "ScaleTargetRef", "type": "external", "link": "scaling_definitions.md"},
        {"id": "scale_trigger_ext", "label": "ScaleTrigger", "type": "external", "link": "scaling_definitions.md"},
        {"id": "autoscaler_spec_ext", "label": "AutoscalerSpec", "type": "external", "link": "scaling_definitions.md"}
    ],
    "edges": [
        {"source": "elastiservice_spec_node", "target": "scale_target_ref_ext"},
        {"source": "elastiservice_spec_node", "target": "scale_trigger_ext"},
        {"source": "elastiservice_spec_node", "target": "autoscaler_spec_ext"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    elastiservice_spec_node[ElastiServiceSpec]
    elastiservice_status_node[ElastiServiceStatus]
    scale_target_ref_ext[ScaleTargetRef]:::external
    scale_trigger_ext[ScaleTrigger]:::external
    autoscaler_spec_ext[AutoscalerSpec]:::external

    elastiservice_spec_node --> scale_target_ref_ext
    elastiservice_spec_node --> scale_trigger_ext
    elastiservice_spec_node --> autoscaler_spec_ext

    linkStyle 2 stroke-width:0;
    linkStyle 3 stroke-width:0;
    linkStyle 4 stroke-width:0;

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```