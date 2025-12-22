import OpenAI from 'openai';
import { writeFile, appendFile } from 'fs/promises';
import { join } from 'path';

const DEBUG_LOG_PATH = join(process.cwd(), '.cursor', 'debug.log');

export default async function handler(req, res) {
  // #region agent log
  const logEntry = JSON.stringify({location:'api/chat.js:4',message:'Backend: Handler entry',data:{method:req.method,url:req.url,hasBody:!!req.body,bodyType:typeof req.body,contentType:req.headers['content-type']},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
  appendFile(DEBUG_LOG_PATH, logEntry).catch(()=>{});
  // #endregion
  console.log('🚀 Chat API called:', req.method, req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('📡 Handling CORS preflight');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('🔑 Checking API key...');
    // Check for API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      console.log('❌ API key not configured');
      res.status(500).json({ 
        error: 'OpenAI API key not configured',
        message: 'Please set your OpenAI API key in the .env file'
      });
      return;
    }

    console.log('✅ API key found');
    // #region agent log
    const logEntry2 = JSON.stringify({location:'api/chat.js:42',message:'Backend: Before body validation',data:{bodyExists:!!req.body,bodyType:typeof req.body,bodyIsObject:typeof req.body==='object'&&req.body!==null,bodyKeys:req.body?Object.keys(req.body):null,bodyStringPreview:req.body?JSON.stringify(req.body).substring(0,200):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
    appendFile(DEBUG_LOG_PATH, logEntry2).catch(()=>{});
    // #endregion
    
    // Safely destructure with null check
    if (!req.body || typeof req.body !== 'object') {
      console.log('❌ Invalid request body:', typeof req.body);
      console.log('   req.body:', req.body);
      res.status(400).json({ error: 'Request body is required and must be an object', received: typeof req.body });
      return;
    }
    
    // Extract with safe defaults
    const messages = req.body.messages;
    const currentGraph = req.body.currentGraph || { id: "root", children: [], edges: [] };
    const images = Array.isArray(req.body.images) ? req.body.images : [];
    const selectedNodeIds = Array.isArray(req.body.selectedNodeIds) ? req.body.selectedNodeIds : [];
    const selectedEdgeIds = Array.isArray(req.body.selectedEdgeIds) ? req.body.selectedEdgeIds : [];
    
    // #region agent log
    const lastUserMessage = messages?.filter(m => m.role === 'user').pop()?.content || '';
    const logEntry4 = JSON.stringify({location:'api/chat.js:87',message:'User message analysis',data:{lastUserMessage:lastUserMessage.substring(0,200),messageCount:messages?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n';
    appendFile(DEBUG_LOG_PATH, logEntry4).catch(()=>{});
    // #endregion

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    console.log('🤖 Initializing OpenAI client');
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Helper function to get all node IDs recursively
    const getAllNodeIds = (node) => {
      const ids = [node.id];
      if (node.children) {
        node.children.forEach((child) => {
          ids.push(...getAllNodeIds(child));
        });
      }
      return ids;
    };

    // Helper function to find a node by ID in the graph
    const findNodeById = (graph, nodeId) => {
      if (!graph || !nodeId) return null;
      if (graph.id === nodeId) return graph;
      const searchInChildren = (nodes) => {
        for (const node of nodes || []) {
          if (node.id === nodeId) return node;
          if (node.children) {
            const found = searchInChildren(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      return searchInChildren(graph.children);
    };

    // Build selection context (simplified for brevity)
    let selectionContext = '';
    if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
      selectionContext = `USER SELECTION: ${selectedNodeIds.length} nodes, ${selectedEdgeIds.length} edges selected.`;
    }

    // Build current graph state description
    const hasExistingDiagram = currentGraph && currentGraph.children && currentGraph.children.length > 0;
    const nodeCount = hasExistingDiagram ? currentGraph.children.length : 0;
    
    const agentContext = {
      canvas: {
        isEmpty: !hasExistingDiagram,
        nodeCount: nodeCount,
        edgeCount: currentGraph?.edges?.length || 0,
      },
      selection: {
        hasSelection: (selectedNodeIds?.length > 0) || (selectedEdgeIds?.length > 0),
      },
      conversation: {
        hasUnansweredQuestion: false, // Simplified logic
        lastUserMessage: messages.filter(m => m.role === 'user').pop()?.content || null,
      },
      images: {
        hasImages: (images?.length || 0) > 0,
      }
    };
    
    // Check for unanswered questions manually
    const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMsg && (lastAssistantMsg.type === 'question' || (lastAssistantMsg.content && lastAssistantMsg.content.includes('?')))) {
        // Check if the very next message is a user answer
        const assistantIndex = messages.indexOf(lastAssistantMsg);
        if (assistantIndex === messages.length - 1) {
            agentContext.conversation.hasUnansweredQuestion = true;
        }
    }

    // Process messages to include images if provided
    const processedMessages = messages.map(msg => {
      const messageImages = msg.images || (msg.role === 'user' && images ? images : []);
      if (messageImages && messageImages.length > 0) {
        const imageContent = messageImages.map(imageDataUrl => ({
          type: "image_url",
          image_url: { url: imageDataUrl }
        }));
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content },
            ...imageContent
          ]
        };
      }
      return msg;
    });
    
    const modelToUse = 'gpt-4o'; // Use robust model
    
    // ============================================================================
    // STRICT ROUTING PROMPT
    // ============================================================================
    
    const systemPromptContent = `You are a specialized Architecture Diagram Router. Your ONLY job is to classify the user's request into one of three exclusive lanes and call the corresponding tool.

**INPUT CLASSIFICATION RULES:**

**LANE 1: REPOSITORY URL (Highest Priority)**
- **Trigger:** Input contains ANY repository URL (github.com, gitlab.com, bitbucket.org).
- **Action:** You MUST call the \`codebase\` tool.
- **Reasoning:** The user wants to visualize an existing codebase.
- **Examples:** "https://github.com/user/repo", "analyze https://gitlab.com/project"

**LANE 2: EXPLICIT DESCRIPTION OR IMAGE (Medium Priority)**
- **Trigger:** Input describes a system architecture using specific technologies (e.g., "Express", "PostgreSQL", "Redis", "OAuth2", "Lambda", "DynamoDB", "React", "AWS Lambda") OR input includes an image.
- **Action:** You MUST call the \`create_architecture_diagram\` tool.
- **Reasoning:** The user has provided enough detail to draw a diagram.
- **Examples:** "create a REST API with Express and Redis", "add authentication using OAuth2", "build serverless API with Lambda and DynamoDB"

**LANE 3: VAGUE / AMBIGUOUS (Lowest Priority)**
- **Trigger:** Input is high-level, vague, or lacks specific technologies (e.g., "build a chat app", "design a system", "make llm assessor").
- **Action:** You MUST call the \`ask_clarifying_question\` tool.
- **Reasoning:** You need more specific requirements before you can draw.
- **Exceptions:** If Lane 1 or Lane 2 apply, IGNORE Lane 3. "analyze https://github.com/vague/repo" is Lane 1, not Lane 3.

**STRICT PROHIBITIONS:**
- NEVER use \`create_architecture_diagram\` if a repository URL is present.
- NEVER ask a question if a repository URL is present.
- NEVER ask a question if specific technologies are listed (e.g., "Node.js", "Mongo").

**CONTEXT:**
- Canvas Empty: ${agentContext.canvas.isEmpty}
- Has Selection: ${agentContext.selection.hasSelection}
- Has Images: ${agentContext.images.hasImages}
- Unanswered Question: ${agentContext.conversation.hasUnansweredQuestion}

If there is an unanswered question, wait for the user. Otherwise, ROUTE NOW.`;

    console.log('📝 System Prompt Length:', systemPromptContent.length);

    // Define tools with mutually exclusive descriptions - codebase FIRST (order matters)
    const tools = [
        {
          type: "function",
          function: {
            name: "codebase",
            description: "REPOSITORY URL DETECTION: If the user's message contains ANY of these strings: 'github.com', 'gitlab.com', 'bitbucket.org' → You MUST call this tool. Extract repo_url from the message. This is the ONLY tool for repository URLs. Never use create_architecture_diagram or ask_clarifying_question when a URL is present.",
            parameters: {
              type: "object",
              properties: {
                repo_url: {
                  type: "string",
                  description: "The repository URL extracted from the message."
                }
              },
              required: ["repo_url"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_architecture_diagram",
            description: "Call this if the message describes a system with specific technologies (Express, PostgreSQL, Redis, OAuth2, Lambda, DynamoDB). DO NOT call if message contains github.com, gitlab.com, or bitbucket.org.",
            parameters: {
              type: "object",
              properties: {
                requirements_summary: {
                  type: "string",
                  description: "Summary of the architecture requirements."
                },
                architecture_type: {
                  type: "string",
                  description: "Type of architecture (e.g., 'microservices', 'serverless')."
                }
              },
              required: ["requirements_summary", "architecture_type"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "ask_clarifying_question",
            description: "EXECUTE LANE 3: Call this tool IF AND ONLY IF the input is vague, ambiguous, or lacks specific technologies. DO NOT call if a URL is present.",
            parameters: {
              type: "object",
              properties: {
                question: {
                  type: "string",
                  description: "The clarifying question to ask."
                },
                question_type: {
                  type: "string",
                  enum: ["radio"],
                  description: "Always 'radio'."
                },
                options: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 4,
                  maxItems: 4,
                  description: "4 distinct options for the user to choose from."
                }
              },
              required: ["question", "question_type", "options"]
            }
          }
        }
    ];

    const stream = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPromptContent },
        ...processedMessages
      ],
      stream: true,
      temperature: 0.0, // Strict deterministic behavior
      max_tokens: 1024,
      parallel_tool_calls: false, // Force single choice
      tool_choice: "required", // Force a tool call
      tools: tools
    });

    console.log('📦 Starting stream...');
    
    // Set up response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let toolCallDetected = false;
    let currentToolCall = { name: '', args: '', index: null };
    let questionProcessed = false;
    let diagramMessageSent = false;
    let codebaseProcessed = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0].delta;
      
      // Log for debugging
      const chunkData = JSON.stringify(chunk);
      // console.log('Chunk:', chunkData);

      // Handle Tool Calls
      if (delta.tool_calls) {
        toolCallDetected = true;
        for (const tc of delta.tool_calls) {
          if (tc.function?.name) {
            currentToolCall.name = tc.function.name;
            currentToolCall.index = tc.index;
            console.log(`🎯 TOOL SELECTED: ${currentToolCall.name}`);
          }
          if (tc.function?.arguments) {
            currentToolCall.args += tc.function.arguments;
          }
        }
      }

      // Pass through to frontend
      res.write(`data: ${chunkData}\n\n`);
    }

    // End of stream processing
    if (toolCallDetected && currentToolCall.name) {
        console.log(`🔨 Processing Final Tool Call: ${currentToolCall.name}`);
        console.log(`📝 Args: ${currentToolCall.args}`);

        try {
            const args = JSON.parse(currentToolCall.args);

            // HANDLER: Codebase
            if (currentToolCall.name === 'codebase' && !codebaseProcessed) {
                console.log('🔗 Handling Codebase Tool...');
                codebaseProcessed = true;
                
                if (!args.repo_url) throw new Error("Missing repo_url");

                try {
                    const { getMermaidDiagramFromDeepWiki } = await import('./deepwiki.ts');
                    const mermaidDiagram = await getMermaidDiagramFromDeepWiki(args.repo_url);
                    
                    console.log('✅ MERMAID DIAGRAM RECEIVED FROM DEEPWIKI:');
                    console.log('==========================================');
                    console.log(mermaidDiagram);
                    console.log('==========================================');
                    console.log('📊 Mermaid diagram length:', mermaidDiagram.length);
                    
                    const diagramMsg = {
                        type: "diagram_creation",
                        message: "Generating architecture from repository...",
                        requirements: "Convert Mermaid to Canvas",
                        architecture_type: "codebase_architecture",
                        mermaid_diagram: mermaidDiagram
                    };
                    res.write(`data: ${JSON.stringify(diagramMsg)}\n\n`);
                    console.log('✅ Sent Codebase Diagram Message with Mermaid diagram');
                    console.log('📤 Sending Mermaid diagram to diagram agent...');

                } catch (err) {
                    console.error('❌ DeepWiki Error:', err.message);
                    // Fallback to error message or basic diagram
                    const errorMsg = {
                        type: "error",
                        message: `Analysis failed: ${err.message}. Is the backend running?`
                    };
                    res.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
                }
            }

            // HANDLER: Create Diagram
            else if (currentToolCall.name === 'create_architecture_diagram' && !diagramMessageSent) {
                console.log('🏗️ Handling Create Diagram Tool...');
                diagramMessageSent = true;
                
                const diagramMsg = {
                    type: "diagram_creation",
                    message: `Creating ${args.architecture_type}...`,
                    requirements: args.requirements_summary,
                    architecture_type: args.architecture_type
                };
                res.write(`data: ${JSON.stringify(diagramMsg)}\n\n`);
                console.log('✅ Sent Creation Diagram Message');
            }

            // HANDLER: Ask Question
            else if (currentToolCall.name === 'ask_clarifying_question' && !questionProcessed) {
                console.log('❓ Handling Question Tool...');
                questionProcessed = true;
                
                const lastUserMsg = agentContext.conversation.lastUserMessage || messages?.filter(m => m.role === 'user').pop()?.content || 'N/A';
                
                console.log('\n❓ QUESTION ASKED:');
                console.log(`   Question: "${args.question}"`);
                console.log(`   Options:`);
                args.options.forEach((opt, i) => {
                    console.log(`     ${String.fromCharCode(65 + i)}. ${opt}`);
                });
                console.log(`   Tool call: ask_clarifying_question`);
                console.log(`   User message: "${lastUserMsg.substring(0, 100)}"`);
                
                const questionMsg = {
                    type: "question",
                    question_type: "radio-question",
                    question: args.question,
                    options: args.options.map((opt, i) => ({ id: `opt_${i}`, text: opt }))
                };
                res.write(`data: ${JSON.stringify(questionMsg)}\n\n`);
                console.log('✅ Sent Question Message');
            }

        } catch (e) {
            console.error('❌ Error processing tool args:', e);
        }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('🔥 Fatal API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
