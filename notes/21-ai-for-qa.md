# 21 · AI for QA

No koans here. There are two sides: using AI to test, and testing systems that contain AI. Interviewers ask about both, and they are wary of candidates who let an assistant write the tests unchecked. Show judgement. For Playwright's own AI tooling, see note 15.

## Interviewers ask

### LLM fundamentals

**What is an LLM and how does it generate text?**
A neural network trained to predict the next token over huge text corpora, then tuned (instruction tuning, RLHF) to follow instructions. Output is probabilistic, same prompt can give different answers (temperature). It has no ground truth, only patterns.

Source: interview handbook, not checked against documentation.

**Tokens, context window, temperature?**
Tokens: sub-word units (≈ 4 characters in English). Context window: maximum tokens of input + output the model considers; anything outside is not "known". Temperature: randomness control, low for deterministic tasks (test generation), higher for brainstorming.

Source: interview handbook, not checked against documentation.

**What is hallucination and why does it matter for testing?**
Confident, fluent, wrong output, invented APIs, non-existent locators, wrong expected values. Consequence: an AI-written test can pass while asserting the wrong thing. Every generated assertion must be verified against the spec or real behaviour.

Source: interview handbook, not checked against documentation.

**RAG, fine-tuning, function/tool calling, agents?**
RAG: retrieve relevant documents and put them in the prompt (grounding). Fine-tuning: further training on your data (rarely needed for QA). Tool calling: the model emits structured calls that software executes (run a query, click a button). Agent: a loop of model ↔ tools pursuing a goal with intermediate reasoning, e.g. an agent that explores a web app through Playwright MCP and drafts tests.

Source: interview handbook, not checked against documentation.

**What is MCP (Model Context Protocol)?**
An open standard for connecting AI models to tools and data sources via servers exposing capabilities. Playwright MCP exposes browser navigation, an accessibility-tree snapshot, clicks/fills, screenshots and network to any MCP-capable client (Claude, Cursor, VS Code Copilot). Impact for QA: agents can explore the real app, generate locators from the accessibility tree, reproduce bugs and repair failing tests.

Source: interview handbook, not checked against documentation.

**Prompt engineering basics that matter for QA work?**
Give role and context, the spec or acceptance criteria, constraints (framework, style, locator strategy), examples of good tests from your repo, explicit output format, ask for assumptions and edge cases listed separately; iterate; keep prompts in the repo (e.g. `AGENTS.md`/`CLAUDE.md`/Copilot instructions) so the whole team gets consistent output.

Source: interview handbook, not checked against documentation.

### Using AI in the QA workflow

**Where does AI add value in testing today?**
- Test design: enumerating edge cases, equivalence classes, negative scenarios from requirements; reviewing acceptance criteria for gaps.
- Test generation: drafting Playwright/API tests from a spec or a recorded flow; converting manual cases to automation skeletons.
- Test maintenance: repairing broken locators, refactoring, migrating (WebdriverIO → Playwright).
- Analysis: summarising failures from traces/logs, clustering flaky tests, RCA hypotheses from Logs Explorer output, log parsing.
- Data: generating realistic synthetic test data and fixtures.
- Exploratory support: agents that crawl an app and report anomalies, accessibility issues, console errors.
- Documentation: test plans, bug reports, release notes drafts.

Source: interview handbook, not checked against documentation.

**Where does it fail or add risk?**
Hallucinated assertions/locators, tests that only mirror the implementation (no oracle), duplicated/low-value tests inflating suites, leaked secrets/data in prompts, licensing/IP of generated code, over-reliance eroding skills, non-determinism in "AI-in-the-loop" tests, cost/latency.

Source: interview handbook, not checked against documentation.

**How do you keep AI-generated tests trustworthy?**
Human review with the same bar as any PR; run new tests repeatedly (`--repeat-each`) to catch flakiness; mutation-style sanity check (break the feature, see the test fail); assertions traced to requirements; no `any`, no sleeps; enforce your locator strategy via prompt rules and lint; track a metric of "AI-drafted tests that survived review".

Source: interview handbook, not checked against documentation.

**Self-healing tests, what are they really, and what's the catch?**
When a locator fails, an engine (rule-based or LLM) finds the most similar element and continues, optionally rewriting the locator. Catch: it can silently "heal" onto the wrong element, hiding real UI regressions. Require healed locators to be reported and reviewed, and prefer robust role/test-id locators so healing is rarely needed.

Source: interview handbook, not checked against documentation.

**What is agentic test repair, and how does it work with Playwright MCP?**
Structure the answer: trigger (failing test in CI) → agent reads failure + trace → opens the app via MCP → inspects the accessibility snapshot → proposes locator/flow change → runs the test → opens a PR → you review. Mention guardrails: read-only credentials for the agent, staging only, diff limits, no changes to assertions without explicit approval.

Source: interview handbook, not checked against documentation.

**What AI testing tools/categories do you know?**
Copilots and assistants (Claude, Claude Code, GitHub Copilot, Cursor) with Playwright MCP; Playwright's built-in agents/skills; commercial AI test platforms (e.g. testRigor, mabl, Functionize, Autify, Testim, Applitools Eyes for visual AI); LLM-eval frameworks (DeepEval, Promptfoo, Ragas); guardrail/fuzzing tools (Garak, PyRIT) for security testing of LLM apps. You don't need all, know the categories and one example each, and be honest about what you've used.

Source: interview handbook, not checked against documentation.

### Testing AI-powered features

**How is testing an LLM feature different from testing a classic feature?**
Non-deterministic output → no exact-match oracle; correctness is graded, not binary; failures include hallucination, toxicity, prompt injection, data leakage, bias, latency, cost. Test strategy shifts to datasets, metrics, thresholds and monitoring.

Source: interview handbook, not checked against documentation.

**What is an evaluation ("eval") and how do you build one?**
A dataset of inputs with expected properties (golden answers, rubrics, must/must-not contain), a scoring method (exact/regex, semantic similarity, LLM-as-judge with a rubric, human review sample), thresholds, and a run in CI on every prompt/model change, regression testing for prompts.

Source: interview handbook, not checked against documentation.

**Metrics to know?**
Accuracy/precision/recall for classification; faithfulness and answer relevance for RAG; hallucination rate; refusal rate; toxicity; latency P95; cost per request; task success rate for agents.

Source: interview handbook, not checked against documentation.

**What is prompt injection and how do you test for it?**
Untrusted input (user text, retrieved documents, web pages) that manipulates the model's instructions ("ignore previous instructions…"). Test with adversarial datasets, indirect injection via documents, and verify sensitive tools require confirmation. Related: jailbreaks, data exfiltration, PII leakage, reference OWASP Top 10 for LLM Applications.

Source: interview handbook, not checked against documentation.

**How would you test a chatbot that uses RAG over company documents?**
Layers: unit-test chunking/embedding pipeline; retrieval tests (does the right document come back for known questions, recall@k); generation evals (faithfulness to retrieved context, no answer when context is empty); safety tests (injection in documents, PII); UI/API tests for the conversation flow with a mocked model for determinism; production monitoring with sampled human review and user feedback loops.

Source: interview handbook, not checked against documentation.

**How do you make CI deterministic when the product calls an LLM?**
Mock/stub the model at the boundary for functional UI/API tests (record-replay of responses); run real-model evals separately with tolerance thresholds and set temperature 0 where supported; snapshot prompts; pin model versions and treat model upgrades as releases needing eval runs.

Source: interview handbook, not checked against documentation.
