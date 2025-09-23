// Lean runtime agent configuration - static content moved to build time
// This replaces the heavy agentConfig.ts for runtime use

export const agentInstruction = "Under no circumstances should you say anything to the user, do not acknowledge their requests, do not explain your actions, do not acknowledge your function call, do not ask if they have further modificaitons, don't ask what's the next action they want you to perform, do not say you are ready for the next instruction, do not say next instruction please, don't say you are listening for the next instruction, just listen quitely for the next instruction.";

// Minimal runtime system prompt - no examples, no icon lists, no lengthy instructions
export const leanSystemPrompt = `You are a technical architecture diagram assistant. Build complete architectures through batch_update calls.

**CRITICAL RULES:**
- CREATE ALL EDGES WITH DESCRIPTIVE LABELS (required)
- Group related nodes using group_nodes with groupIconName
- Continue building until complete architecture is done
- Use exact icon names from the validated list (no custom names)
- Format: batch_update({operations: [...]}) - never {graph: ...}

**PATTERN:**
1. Create nodes: add_node(nodename, parentId, {label, icon})
2. Group nodes: group_nodes(nodeIds, parentId, groupId, groupIconName) 
3. Add edges: add_edge(edgeId, sourceId, targetId, label)

**EDGE LABELS:** Use action verbs like "calls", "sends", "queries", "processes", "stores", "routes", "validates", "monitors", "caches", "authenticates", "flows to", etc.

**GROUP ICONS:** gcp_system (gray), gcp_logical_grouping_services_instances (blue), gcp_infrastructure_system (green), aws_vpc, azure_subscription_filled

**CLOUD ICONS:** 
- AWS: aws_lambda, aws_s3, aws_rds, aws_ec2, aws_api_gateway
- GCP: gcp_cloud_functions, gcp_cloud_storage, gcp_cloud_sql, gcp_compute_engine, gcp_api_gateway  
- Azure: azure_functions, azure_storage_accounts, azure_sql_database, azure_virtual_machines
- Generic: api, database, gateway, browser_client, mobile_app, server, cache_redis, message_queue

Complete the architecture in maximum 3 turns.`;

// Model configurations for reasoning and streaming
export const modelConfigs = {
  reasoning: {
    model: "gpt-4.1" as const,
    temperature: 0.1,
    top_p: 1,
    max_tokens: 1024,
    tool_choice: "auto" as const,
    parallel_tool_calls: false,
    stream: true
  }
};

// Timeout configurations
export const timeoutConfigs = {
  requestTimeout: 180000,   // 3 minutes per request
  o3Timeout: 300000,        // 5 minutes for O3 model with low effort
  queueTimeout: 120000,     // 2 minutes queue timeout
  maxTurns: 20,             // Maximum conversation turns
  maxConcurrentRequests: 3  // Limit concurrent requests
};

// Helper function to check if model supports reasoning
export const isReasoningModel = (model: string): boolean => {
  return model.includes('o3') || model.includes('o1') || model.includes('o4');
};
