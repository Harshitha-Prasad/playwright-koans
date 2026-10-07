# 21 · AI for QA

No koans here. There are two sides: using AI to test, and testing systems that contain AI. Interviewers ask about both, and they are wary of candidates who let an assistant write the tests unchecked. Show judgement. For Playwright's own AI tooling, see note 15.

## Interviewers ask

### LLM fundamentals

**What is an LLM and how does it generate text?**
A neural network trained to predict the next token over huge text corpora, then refined (fine-tuning, RLHF) to follow instructions. Output is probabilistic, so the same prompt can give different answers (temperature controls how much). It has no ground truth, only patterns.

Source: [Glossary](https://platform.claude.com/docs/en/about-claude/glossary)

**Tokens, context window, temperature?**
Tokens: sub-word units (roughly 3.5 to 4 characters in English, depending on the model). Context window: maximum tokens of input + output the model can reference; anything outside is not "known". Temperature: randomness control, low for repeatable tasks (test generation), higher for brainstorming. Even at 0 the output is not guaranteed to be identical.

Source: [Glossary](https://platform.claude.com/docs/en/about-claude/glossary), [Key concepts](https://developers.openai.com/api/docs/concepts)

**What is hallucination and why does it matter for testing?**
Fluent output that is factually wrong or inconsistent with the given context: invented APIs, non-existent locators, wrong expected values. Consequence: an AI-written test can pass while asserting the wrong thing. Every generated assertion must be verified against the spec or real behaviour.

Source: [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)

**RAG, fine-tuning, function/tool calling, agents?**
RAG: retrieve relevant documents at run time and put them in the prompt (grounding). Fine-tuning: further training of a pretrained model on your data (rarely needed for QA). Tool calling: the model emits structured calls that the application executes (run a query, click a button) and then gets the result back. Agent: a loop of model ↔ tools pursuing a goal with intermediate reasoning, e.g. an agent that explores a web app through Playwright MCP and drafts tests.

Source: [Glossary](https://platform.claude.com/docs/en/about-claude/glossary), [How tool use works](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)

**What is MCP (Model Context Protocol)?**
An open-source standard for connecting AI applications to external systems. MCP servers expose tools, resources and prompts to MCP clients. Playwright MCP exposes browser navigation, an accessibility-tree snapshot, clicks/fills, screenshots and network inspection to any MCP client (VS Code, Cursor, Claude Code, Claude Desktop). Impact for QA: agents can explore the real app, generate locators from the accessibility tree, reproduce bugs and repair failing tests.

Source: [What is the Model Context Protocol (MCP)?](https://modelcontextprotocol.io/docs/getting-started/intro), [Playwright MCP](https://playwright.dev/docs/getting-started-mcp)

**Prompt engineering basics that matter for QA work?**
Give role and context, the spec or acceptance criteria, constraints (framework, style, locator strategy), examples of good tests from your repo, explicit output format, ask for assumptions and edge cases listed separately; iterate; keep prompts in the repo (e.g. `AGENTS.md`, `CLAUDE.md` or `.github/copilot-instructions.md`) so the whole team gets consistent output.

Source: [Adding repository custom instructions for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions), [How Claude remembers your project](https://code.claude.com/docs/en/memory)

### Using AI in the QA workflow

**Where does AI add value in testing today?**
- Test design: enumerating edge cases, equivalence classes, negative scenarios from requirements; reviewing acceptance criteria for gaps.
- Test generation: drafting Playwright/API tests from a spec or a recorded flow; converting manual cases to automation skeletons.
- Test maintenance: repairing broken locators, refactoring, migrating (WebdriverIO → Playwright).
- Analysis: summarising failures from traces/logs, clustering flaky tests, RCA hypotheses from Logs Explorer output, log parsing.
- Data: generating realistic synthetic test data and fixtures.
- Exploratory support: agents that crawl an app and report anomalies, accessibility issues, console errors.
- Documentation: test plans, bug reports, release notes drafts.

Source: experience, not documentation.

**Where does it fail or add risk?**
Hallucinated assertions/locators, tests that only mirror the implementation (no oracle), duplicated/low-value tests inflating suites, leaked secrets/data in prompts, licensing/IP of generated code, over-reliance eroding skills, non-determinism in "AI-in-the-loop" tests, cost/latency.

Source: experience, not documentation.

**How do you keep AI-generated tests trustworthy?**
Human review with the same bar as any PR; run new tests repeatedly (`--repeat-each`) to catch flakiness; mutation-style sanity check (break the feature, see the test fail); assertions traced to requirements; no `any`, no sleeps; enforce your locator strategy via prompt rules and lint; track a metric of "AI-drafted tests that survived review".

Source: [Command line](https://playwright.dev/docs/test-cli)

**Self-healing tests, what are they really, and what's the catch?**
When a locator fails, an engine (rule-based or LLM) finds the most similar element and continues, optionally rewriting the locator. Catch: it can silently "heal" onto the wrong element, hiding real UI regressions. Require healed locators to be reported and reviewed, and prefer robust role/test-id locators so healing is rarely needed.

Source: experience, not documentation.

**What is agentic test repair, and how does it work with Playwright MCP?**
Structure the answer: trigger (failing test in CI) → agent reads failure + trace → opens the app via MCP → inspects the accessibility snapshot → proposes locator/flow change → re-runs the test until it passes or a guardrail stops it → opens a PR → you review. Mention guardrails: read-only credentials for the agent, staging only, diff limits, no changes to assertions without explicit approval.

Source: [Agents](https://playwright.dev/docs/test-agents), [Playwright MCP](https://playwright.dev/docs/getting-started-mcp)

**What AI testing tools/categories do you know?**
Copilots and assistants (Claude, Claude Code, GitHub Copilot, Cursor) with Playwright MCP; Playwright's built-in test agents (planner, generator, healer) and `playwright-cli` skills; commercial AI test platforms (e.g. testRigor, mabl, Functionize, Autify, Tricentis Testim, Applitools Eyes for visual AI); LLM-eval frameworks (DeepEval, Promptfoo, Ragas); red-teaming tools (garak, PyRIT) for security testing of LLM apps. You don't need all, know the categories and one example each, and be honest about what you've used.

Source: [Agents](https://playwright.dev/docs/test-agents), [Coding agents](https://playwright.dev/docs/getting-started-cli), [Intro | Promptfoo](https://www.promptfoo.dev/docs/intro/), [garak, the LLM vulnerability scanner](https://github.com/NVIDIA/garak)

### Testing AI-powered features

**How is testing an LLM feature different from testing a classic feature?**
Non-deterministic output → no exact-match oracle; correctness is graded, not binary; failures include hallucination, toxicity, prompt injection, data leakage, bias, latency, cost. Test strategy shifts to datasets, metrics, thresholds and monitoring.

Source: experience, not documentation.

**What is an evaluation ("eval") and how do you build one?**
A dataset of inputs with expected properties (golden answers, rubrics, must/must-not contain), a scoring method (exact/regex, semantic similarity, LLM-as-judge with a rubric, human review sample), thresholds, and a run in CI on every prompt/model change, regression testing for prompts.

Source: [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)

**Metrics to know?**
Accuracy/precision/recall for classification; faithfulness and answer (response) relevancy for RAG; hallucination rate; refusal rate; toxicity; latency P95; cost per request; task success rate for agents.

Source: [List of available metrics - Ragas](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)

**What is prompt injection and how do you test for it?**
Input that alters the model's behaviour in unintended ways ("ignore previous instructions…"). Direct injection comes from the user's own prompt, indirect injection from external content such as retrieved documents or web pages. Test with adversarial datasets, indirect injection via documents, and verify sensitive tools require confirmation. Related: jailbreaks, data exfiltration, PII leakage. Reference: OWASP Top 10 for LLM Applications, where it is entry LLM01.

Source: [LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

**How would you test a chatbot that uses RAG over company documents?**
Layers: unit-test chunking/embedding pipeline; retrieval tests (does the right document come back for known questions, recall@k); generation evals (faithfulness to retrieved context, no answer when context is empty); safety tests (injection in documents, PII); UI/API tests for the conversation flow with a mocked model for determinism; production monitoring with sampled human review and user feedback loops.

Source: experience, not documentation.

**How do you make CI deterministic when the product calls an LLM?**
Mock/stub the model at the boundary for functional UI/API tests (record-replay of responses); run real-model evals separately with tolerance thresholds and set temperature 0 where supported (this reduces variation but does not remove it); snapshot prompts; pin model versions and treat model upgrades as releases needing eval runs.

Source: [Glossary](https://platform.claude.com/docs/en/about-claude/glossary)
