import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    const { messages } = req.body;
    const lastMessage = messages?.filter(m => m.role === 'user').pop()?.content || '';

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // MINIMAL PROMPT - ONLY TOOL SELECTION
    const systemPrompt = `You are a tool router. Classify the user's message:

1. If message contains "github.com", "gitlab.com", or "bitbucket.org" → call codebase tool
2. If message mentions specific technologies (Express, PostgreSQL, Redis, OAuth2, Lambda, DynamoDB) → call create_architecture_diagram tool  
3. Otherwise → call ask_clarifying_question tool

User message: "${lastMessage}"`;

    const tools = [
      {
        type: "function",
        function: {
          name: "codebase",
          description: "Call this if the message contains github.com, gitlab.com, or bitbucket.org",
          parameters: {
            type: "object",
            properties: { repo_url: { type: "string" } },
            required: ["repo_url"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_architecture_diagram",
          description: "Call this if the message describes a system with specific technologies (Express, PostgreSQL, etc.)",
          parameters: {
            type: "object",
            properties: {
              requirements_summary: { type: "string" },
              architecture_type: { type: "string" }
            },
            required: ["requirements_summary", "architecture_type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "ask_clarifying_question",
          description: "Call this if the message is vague or lacks specific technologies",
          parameters: {
            type: "object",
            properties: {
              question: { type: "string" },
              question_type: { type: "string", enum: ["radio"] },
              options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 }
            },
            required: ["question", "question_type", "options"]
          }
        }
      }
    ];

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      temperature: 0.0,
      tool_choice: "required",
      tools: tools
    });

    let toolName = null;
    let toolArgs = '';

    for await (const chunk of stream) {
      const data = JSON.stringify(chunk);
      res.write(`data: ${data}\n\n`);

      if (chunk.choices?.[0]?.delta?.tool_calls) {
        for (const tc of chunk.choices[0].delta.tool_calls) {
          if (tc.function?.name) toolName = tc.function.name;
          if (tc.function?.arguments) toolArgs += tc.function.arguments;
        }
      }
    }

    // Process tool call
    if (toolName && toolArgs) {
      try {
        const args = JSON.parse(toolArgs);
        
        if (toolName === 'codebase') {
          const { getMermaidDiagramFromDeepWiki } = await import('./deepwiki.ts');
          const mermaid = await getMermaidDiagramFromDeepWiki(args.repo_url).catch(() => 'graph TD\nA[Codebase]');
          res.write(`data: ${JSON.stringify({ type: "diagram_creation", mermaid_diagram: mermaid })}\n\n`);
        } else if (toolName === 'create_architecture_diagram') {
          res.write(`data: ${JSON.stringify({ type: "diagram_creation", message: "Creating diagram" })}\n\n`);
        } else if (toolName === 'ask_clarifying_question') {
          res.write(`data: ${JSON.stringify({ type: "question", question: args.question, options: args.options.map((o, i) => ({ id: `opt${i}`, text: o })) })}\n\n`);
        }
      } catch (e) {
        console.error('Tool processing error:', e);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}



