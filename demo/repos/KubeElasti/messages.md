# Messages Module

## Introduction

The `messages` module in the `pkg` package defines the fundamental data structures used for inter-service communication within the system. It primarily provides definitions for message formats related to operator requests and host information. These structures are crucial for ensuring consistent data exchange between different components, particularly between the `operator` and `resolver` modules.

## Core Components

### RequestCount

The `RequestCount` component (`pkg.messages.operator.RequestCount`) is a data structure used to convey information about the number of requests for a specific service within a namespace. This is typically used by the `operator` module to track and manage service scaling based on demand.

```go
type RequestCount struct {
	Count     int    `json:"count"`
	Svc       string `json:"svc"`
	Namespace string `json:"namespace"`
}
```

- **`Count`**: An integer representing the total number of requests.
- **`Svc`**: A string representing the name of the service.
- **`Namespace`**: A string representing the Kubernetes namespace where the service resides.

### Host

The `Host` component (`pkg.messages.host.Host`) defines a comprehensive data structure for encapsulating information about hosts involved in network traffic. This is essential for the `resolver` module to manage and route traffic efficiently, especially when dealing with traffic policies and host-level communication.

```go
type Host struct {
	IncomingHost   string
	Namespace      string
	SourceService  string
	TargetService  string
	SourceHost     string
	TargetHost     string
	TrafficAllowed bool
}
```

- **`IncomingHost`**: The hostname of the incoming request.
- **`Namespace`**: The Kubernetes namespace associated with the hosts.
- **`SourceService`**: The name of the service initiating the traffic.
- **`TargetService`**: The name of the service receiving the traffic.
- **`SourceHost`**: The hostname of the source of the traffic.
- **`TargetHost`**: The hostname of the target for the traffic.
- **`TrafficAllowed`**: A boolean indicating whether traffic is permitted between the source and target.
