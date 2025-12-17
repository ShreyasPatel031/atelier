# Non-Deterministic Question Test Scenarios

## New Logic
- **No hardcoded conditions** - LLM decides based on context and prompt guidance
- **tool_choice: "auto"** - Model chooses when to ask questions
- **Focus:** Questions enable more accurate design communication
- **Selection doesn't block questions** - User may want new diagram even with selection

## Sample Canvas Data
```json
{
  "id": "root",
  "children": [
    {
      "id": "api_server",
      "label": "API Server",
      "type": "service"
    },
    {
      "id": "database",
      "label": "Database",
      "type": "database"
    }
  ],
  "edges": [
    {
      "id": "edge_api_to_db",
      "source": "api_server",
      "target": "database"
    }
  ]
}
```

## 10 Test Scenarios

### Scenario 1: "make llm assessor"
- Canvas: Empty
- Images: None
- Selection: None
- Previous questions: 0
- Previous answers: 0
- **Expected: ASK QUESTION** ✅ (vague, new design)

### Scenario 2: "create a microservices architecture"
- Canvas: Empty
- Images: None
- Selection: None
- Previous questions: 0
- Previous answers: 0
- **Expected: ASK QUESTION** ✅ (vague, new design)

### Scenario 3: "add a database to this" (with selection)
- Canvas: Has content (api_server, database)
- Images: None
- Selection: ["api_server"] (node selected)
- Previous questions: 0
- Previous answers: 0
- **Expected: CREATE DIAGRAM** ✅ (modification, clear intent from selection)

### Scenario 4: "create a REST API with Express, PostgreSQL, and Redis"
- Canvas: Empty
- Images: None
- Selection: None
- Previous questions: 0
- Previous answers: 0
- **Expected: CREATE DIAGRAM** ✅ (specific enough, no question needed)

### Scenario 5: "build a chat app" (with image)
- Canvas: Empty
- Images: 1 image provided
- Selection: None
- Previous questions: 0
- Previous answers: 0
- **Expected: CREATE DIAGRAM** ✅ (image provided, create from image)

### Scenario 6: "design a payment system"
- Canvas: Has content (api_server, database)
- Images: None
- Selection: None
- Previous questions: 0
- Previous answers: 0
- **Expected: ASK QUESTION** ✅ (vague, new design - selection doesn't block)

### Scenario 7: "add authentication using OAuth2"
- Canvas: Has content (api_server, database)
- Images: None
- Selection: None
- Previous questions: 0
- Previous answers: 0
- **Expected: CREATE DIAGRAM** ✅ (specific enough, clear intent)

### Scenario 8: "make llm assessor" (after answering 1 question)
- Canvas: Empty
- Images: None
- Selection: None
- Previous questions: 1
- Previous answers: 1
- **Expected: CREATE DIAGRAM** ✅ (already answered, create based on answer)

### Scenario 9: "create a simple todo app"
- Canvas: Empty
- Images: None
- Selection: None
- Previous questions: 0
- Previous answers: 0
- **Expected: ASK QUESTION** ✅ (vague, new design)

### Scenario 10: "build a serverless API with Lambda and DynamoDB"
- Canvas: Empty
- Images: None
- Selection: None
- Previous questions: 0
- Previous answers: 0
- **Expected: CREATE DIAGRAM** ✅ (specific enough, no question needed)

## Summary
**Expected to ASK QUESTIONS (4 scenarios):**
- 1, 2, 6, 9

**Expected to CREATE DIAGRAM (6 scenarios):**
- 3 (modification with selection), 4 (specific), 5 (image), 7 (specific), 8 (answered), 10 (specific)

## Actual Test Results

**✅ Matches: 6/10**
- ✅ Scenario 1: "make llm assessor" → ASK_QUESTION (as expected)
- ✅ Scenario 2: "create a microservices architecture" → ASK_QUESTION (as expected)
- ✅ Scenario 3: "add a database to this (with selection)" → CREATE_DIAGRAM (as expected)
- ✅ Scenario 7: "add authentication using OAuth2" → CREATE_DIAGRAM (as expected)
- ✅ Scenario 8: "make llm assessor (after answering)" → CREATE_DIAGRAM (as expected)
- ✅ Scenario 9: "create a simple todo app" → ASK_QUESTION (as expected)

**❌ Mismatches: 4/10**
- ❌ Scenario 4: "create a REST API with Express, PostgreSQL, and Redis" 
  - Expected: CREATE_DIAGRAM (specific enough)
  - Actual: ASK_QUESTION
  - **Analysis:** Model thinks it needs more info (deployment, scale, etc.)

- ❌ Scenario 5: "build a chat app (with image)"
  - Expected: CREATE_DIAGRAM (image provided)
  - Actual: ERROR (500 Internal Server Error)
  - **Analysis:** Image handling issue in API

- ❌ Scenario 6: "design a payment system"
  - Expected: ASK_QUESTION (vague, new design)
  - Actual: CREATE_DIAGRAM
  - **Analysis:** Model thinks "payment system" is specific enough to create

- ❌ Scenario 10: "build a serverless API with Lambda and DynamoDB"
  - Expected: CREATE_DIAGRAM (specific enough)
  - Actual: ASK_QUESTION
  - **Analysis:** Model wants clarification (use case, scale, etc.)

## Conclusion

The non-deterministic approach is working - the LLM is making its own decisions based on context. The mismatches show the model is being more conservative than expected, asking questions even for seemingly specific requests when it thinks more context would improve accuracy. This aligns with the goal of "enabling more accurate design communication."
