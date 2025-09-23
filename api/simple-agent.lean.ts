import OpenAI from 'openai';
import { 
  leanSystemPrompt, 
  agentInstruction, 
  modelConfigs, 
  timeoutConfigs 
} from './agentConfig.lean.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    message, 
    conversationHistory = [], 
    currentGraph, 
    referenceArchitecture = "",
    toolOutputs = null,
    previousResponseId = null
  } = req.body;
  
  // Handle two modes: initial conversation start OR tool output continuation
  const isToolOutputContinuation = toolOutputs && previousResponseId;
  
  if (!isToolOutputContinuation && !message) {
    return res.status(400).json({ error: 'Message required for new conversation' });
  }

  console.log('🤖 AGENT: Mode:', isToolOutputContinuation ? 'TOOL_OUTPUT_CONTINUATION' : 'NEW_CONVERSATION');
  if (!isToolOutputContinuation) {
    console.log('🤖 AGENT: Received user message:', message);
    console.log('🔄 AGENT: Conversation history length:', conversationHistory.length);
    console.log('📊 AGENT: Current graph state:', currentGraph ? `${currentGraph.children?.length || 0} nodes` : 'empty');
    console.log('🏗️ AGENT: Reference architecture received:', referenceArchitecture ? referenceArchitecture.substring(0, 100) + '...' : 'NONE');
  } else {
    console.log('🔧 AGENT: Tool output continuation with response ID:', previousResponseId);
    console.log('🔧 AGENT: Tool outputs count:', toolOutputs?.length || 0);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: timeoutConfigs.requestTimeout,
  });

  try {
    // Helper function to get all node IDs recursively
    const getAllNodeIds = (node: any): string[] => {
      const ids = [node.id];
      if (node.children) {
        node.children.forEach((child: any) => {
          ids.push(...getAllNodeIds(child));
        });
      }
      return ids;
    };

    // Build current graph state description - MINIMAL
    const graphStateDescription = currentGraph ? `
CURRENT GRAPH: ${currentGraph.children?.length || 0} nodes, ${currentGraph.edges?.length || 0} edges
${currentGraph.children?.length ? `EXISTING: ${getAllNodeIds(currentGraph).filter(id => id !== 'root').slice(0, 10).join(', ')}${getAllNodeIds(currentGraph).length > 10 ? '...' : ''}` : 'Empty graph'}` : 'Empty graph';

    // LEAN system prompt - no massive examples or icon lists
    const baseMessages = [
      {
        role: 'system',
        content: `${leanSystemPrompt}

${graphStateDescription}

Turn: ${conversationHistory.length + 1}/3${conversationHistory.length >= 2 ? ' (FINAL)' : ''}

${referenceArchitecture ? `Reference: ${referenceArchitecture.substring(0, 300)}...` : ''}`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    let conversationInput: any[];

    if (isToolOutputContinuation) {
      // Tool output continuation mode
      console.log('🔧 AGENT: Preparing tool output continuation...');
      conversationInput = toolOutputs;
    } else {
      // Initial conversation mode
      conversationInput = baseMessages;
    }

    // OpenAI Responses API call
    console.log('🧠 AGENT: Calling OpenAI Responses API for turn', conversationHistory.length + 1);
    if (!isToolOutputContinuation) {
      console.log('📝 AGENT: System prompt length:', conversationInput[0].content.length, 'chars');
    }

    // Build the API request - MINIMAL TOOL DEFINITION
    const apiRequest: any = {
      model: modelConfigs.reasoning.model,
      input: conversationInput,
      tools: [
        {
          type: 'function',
          name: 'batch_update',
          description: 'Execute graph operations. Format: {operations: [{name: "add_node", nodename: "id", parentId: "parent", data: {label: "Name", icon: "icon_name"}}, {name: "group_nodes", nodeIds: ["id1", "id2"], parentId: "parent", groupId: "group", groupIconName: "group_icon"}, {name: "add_edge", edgeId: "e1", sourceId: "source", targetId: "target", label: "action"}]}',
          strict: false,
          parameters: {
            type: 'object',
            properties: {
              operations: {
                type: 'array',
                description: 'Array of operations to execute',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      enum: ['add_node', 'delete_node', 'move_node', 'add_edge', 'delete_edge', 'group_nodes', 'remove_group']
                    },
                    nodename: { type: 'string' },
                    parentId: { type: 'string' },
                    nodeId: { type: 'string' },
                    newParentId: { type: 'string' },
                    edgeId: { type: 'string' },
                    sourceId: { type: 'string' },
                    targetId: { type: 'string' },
                    nodeIds: { type: 'array', items: { type: 'string' } },
                    groupId: { type: 'string' },
                    groupIconName: { type: 'string' },
                    data: { type: 'object' },
                    label: { type: 'string' }
                  },
                  required: ['name']
                }
              }
            },
            required: ['operations']
          }
        }
      ],
      temperature: modelConfigs.reasoning.temperature,
      top_p: modelConfigs.reasoning.top_p,
      max_output_tokens: modelConfigs.reasoning.max_tokens,
      tool_choice: modelConfigs.reasoning.tool_choice,
      parallel_tool_calls: modelConfigs.reasoning.parallel_tool_calls
    };

    // Add reasoning configuration if supported
    if (isReasoningModel(modelConfigs.reasoning.model)) {
      apiRequest.reasoning = modelConfigs.reasoning.reasoning;
    }

    // Add previous response ID for continuation
    if (isToolOutputContinuation && previousResponseId) {
      apiRequest.previous_response_id = previousResponseId;
    }

    console.log('✅ AGENT: OpenAI response received');
    const response = await openai.responses.create(apiRequest);
    
    console.log('🔍 AGENT: Full response:', JSON.stringify(response, null, 2));
    console.log('🔍 AGENT: response.id:', response.id);
    console.log('🔍 AGENT: response.response_id:', (response as any).response_id);
    console.log('🔍 AGENT: response.conversation_id:', (response as any).conversation_id);

    // Extract response ID - try multiple possible fields
    const responseId = response.id || (response as any).response_id || (response as any).conversation_id || `temp_${Date.now()}`;
    console.log('🔍 AGENT: Final extracted response ID:', responseId);
    console.log('🔍 AGENT: responseId type:', typeof responseId);

    // Parse function calls from response
    const functionCalls = response.output?.filter((item: any) => item.type === 'function_call') || [];
    console.log('🔧 AGENT: Found', functionCalls.length, 'function calls to execute');

    if (functionCalls.length === 0) {
      console.log('⚠️ AGENT: No function calls found in response');
      return res.json({
        success: true,
        functionCalls: [],
        count: 0,
        turnNumber: conversationHistory.length + 1,
        isLikelyFinalTurn: true,
        continueMessage: "Architecture complete",
        responseId: responseId,
        hasMoreWork: false
      });
    }

    // Process and validate function calls
    const parsedCalls = functionCalls.map((call: any, index: number) => {
      console.log(`🔍 AGENT: Raw call ${index + 1} - name: "${call.name}"`);
      console.log(`🔍 AGENT: Raw arguments:`, call.arguments);

      let parsedArgs;
      try {
        parsedArgs = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
      } catch (error) {
        console.error(`❌ AGENT: Failed to parse arguments for call ${index + 1}:`, error);
        throw new Error(`Invalid function call arguments: ${error.message}`);
      }

      console.log(`📞 AGENT: Tool ${index + 1}/${functionCalls.length} - ${call.name}:`, parsedArgs);

      if (parsedArgs.operations && parsedArgs.operations.length > 0) {
        console.log('🧪 AGENT: First operation parameter keys:', Object.keys(parsedArgs.operations[0]));
        console.log('🧪 AGENT: First operation sample:', parsedArgs.operations[0]);
      }

      return {
        name: call.name,
        arguments: parsedArgs,
        call_id: call.call_id || call.id || `call_${Date.now()}_${index}`
      };
    });

    console.log('🚀 AGENT: Sending tool calls to frontend for execution');

    // Determine if this is likely the final turn
    const currentTurn = conversationHistory.length + 1;
    const isLikelyFinalTurn = currentTurn >= 3; // Max 3 turns

    console.log('📊 AGENT: Current turn:', currentTurn, 'Likely final:', isLikelyFinalTurn);

    // Check if we have more work to do
    console.log('🔍 AGENT: parsedCalls length:', parsedCalls.length);
    console.log('🔍 AGENT: parsedCalls type:', typeof parsedCalls);
    console.log('🔍 AGENT: parsedCalls array?:', Array.isArray(parsedCalls));
    
    const hasMoreWork = parsedCalls.length > 0;
    console.log('🔍 AGENT: hasMoreWork calculation:', parsedCalls.length, '> 0 =', hasMoreWork);

    const finalResponse = {
      success: true,
      functionCalls: parsedCalls,
      count: parsedCalls.length,
      turnNumber: currentTurn,
      isLikelyFinalTurn: isLikelyFinalTurn,
      continueMessage: isLikelyFinalTurn ? "Architecture complete" : `Continue with turn ${currentTurn + 1}`,
      responseId: responseId,
      hasMoreWork: hasMoreWork
    };

    console.log('🔍 AGENT: Final response payload:', JSON.stringify(finalResponse, null, 2));

    return res.json(finalResponse);

  } catch (error) {
    console.error('❌ AGENT: Error in simple-agent:', error);
    
    // Enhanced error response
    const errorResponse = {
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.stack || 'No stack trace available',
      timestamp: new Date().toISOString()
    };
    
    return res.status(500).json(errorResponse);
  }
}

// Helper function to check if model supports reasoning
function isReasoningModel(model: string): boolean {
  return model.includes('o3') || model.includes('o1') || model.includes('o4');
}
