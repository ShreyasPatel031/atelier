The `search-agents` repository provides a comprehensive framework for developing, testing, and evaluating search-based agents. It orchestrates the entire lifecycle from environment setup and agent action execution to prompt construction for Large Language Models (LLMs) and detailed performance evaluation. The repository integrates with various web platforms for data extraction and offers tools for analyzing agent success rates across different scenarios.

### Architecture Diagram

```mermaid
graph TD
    execution_and_testing[Execution and Testing]
    prompt_construction[Prompt Construction]
    evaluation_helpers[Evaluation Helper Functions]
    evaluators[Evaluation Logic]
    llm_integrations[LLM Integrations]
    success_rate_calculation[Success Rate Calculation]

    execution_and_testing --> prompt_construction
    execution_and_testing --> evaluation_helpers
    execution_and_testing --> evaluators
    execution_and_testing --> llm_integrations
    evaluators --> evaluation_helpers
    prompt_construction --> llm_integrations

    click execution_and_testing "execution_and_testing.md" "View Execution and Testing Module"
    click prompt_construction "prompt_construction.md" "View Prompt Construction Module"
    click evaluation_helpers "evaluation_helpers.md" "View Evaluation Helper Functions Module"
    click evaluators "evaluators.md" "View Evaluation Logic Module"
    click llm_integrations "llm_integrations.md" "View LLM Integrations Module"
    click success_rate_calculation "success_rate_calculation.md" "View Success Rate Calculation Module"
```