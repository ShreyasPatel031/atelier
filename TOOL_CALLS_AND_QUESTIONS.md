# Tool Calls and Questions Log

This document shows what tool calls are made and what questions are asked.

## When you see these logs in the server console:

### Tool Calls:
- `🎯 TOOL CALLED: {name}` - Shows which tool was called
- `❓ QUESTION TOOL CALLED: ask_clarifying_question` - Question tool was called
- `🔗 CODEBASE TOOL CALLED` - Codebase tool was called  
- `🏗️ DIAGRAM TOOL CALLED: create_architecture_diagram` - Diagram tool was called

### Questions:
- `❓ QUESTION ASKED:` - Shows the actual question text and options
- `📋 PARSED QUESTION TOOL ARGUMENTS:` - Shows the question details from tool call

### Text Responses (no tool):
- `💬 AGENT CHOSE TEXT (no tool call)` - Agent responded with text instead of calling a tool

## Example Output:

```
🎯 TOOL CALLED: ask_clarifying_question (index: 0)
   User message: "make llm assessor"

📋 PARSED QUESTION TOOL ARGUMENTS:
   Question: "What type of LLM assessor system do you want to create?"
   Question type: radio
   Options: ["A. Real-time evaluation system", "B. Batch processing system", "C. Hybrid system", "D. Custom solution"]

❓ QUESTION ASKED:
   Question: "What type of LLM assessor system do you want to create?"
   Options: A. Real-time evaluation system, B. Batch processing system, C. Hybrid system, D. Custom solution
   Tool call: ask_clarifying_question
   User message: "make llm assessor"
```

## Current Behavior (from test results):

**Questions being asked:**
- ✅ "make llm assessor" → asks question
- ✅ "create a microservices architecture" → asks question

**Diagrams being created:**
- ✅ "create a REST API with Express, PostgreSQL, and Redis" → creates diagram
- ✅ "add authentication using OAuth2" → creates diagram
- ✅ "build a serverless API with Lambda and DynamoDB" → creates diagram

**Codebase tool calls:**
- ❌ Repository URLs → should call codebase tool, but currently creating diagrams instead

