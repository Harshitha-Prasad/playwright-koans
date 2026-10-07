# 15 · Playwright and AI: codegen, MCP and test agents

No koans here. This page covers the tools that write or drive tests for you: the recorder, the two interfaces that let an AI agent control a browser, and the three Playwright Test Agents.

## The idea in six lines

- **Codegen** records your actions in a browser and writes test code. It picks locators by role, text and test id first, and refines a locator until it identifies one element.
- **Playwright MCP** is a server that gives an AI assistant browser tools through the Model Context Protocol. It works on the accessibility tree, not on pixels, so no vision model is needed.
- **`playwright-cli`** offers the same kind of browser control as command-line commands. The documentation recommends it for coding agents because it uses fewer tokens.
- **Playwright Test Agents** are three agent definitions: the **planner** explores the app and writes a Markdown test plan, the **generator** turns the plan into test files, the **healer** runs the tests and repairs failing ones.
- The agents start from a **seed test**, which runs your global setup, project dependencies, fixtures and hooks, and serves as the example for generated tests.
- Agent definitions are collections of instructions and MCP tools, created by `npx playwright init-agents`. Regenerate them whenever Playwright is updated.

## Cheat sheet

```bash
# Recorder
npx playwright codegen demo.playwright.dev/todomvc
npx playwright codegen --device="iPhone 13" playwright.dev
npx playwright codegen github.com/microsoft/playwright --save-storage=auth.json
npx playwright codegen --load-storage=auth.json github.com/microsoft/playwright

# Test agents: write the agent definitions for your AI tool
npx playwright init-agents --loop=vscode      # or claude, codex, opencode

# Playwright MCP, added to Claude Code
claude mcp add playwright npx @playwright/mcp@latest

# playwright-cli
npm install -g @playwright/cli@latest
playwright-cli open https://demo.playwright.dev/todomvc/ --headed
playwright-cli snapshot
playwright-cli click e15
```

| | Playwright MCP | `playwright-cli` |
| --- | --- | --- |
| Package | `@playwright/mcp` | `@playwright/cli` |
| Used by | any MCP client, for example VS Code, Cursor or Claude Desktop | coding agents such as Claude Code or GitHub Copilot |
| Browser by default | headed (`--headless` to change) | headless (`--headed` to change) |
| Profile by default | persistent, login state is kept between sessions | in memory, lost when the browser closes |
| Best for, per the docs | agentic loops that need persistent state and reasoning over page structure | token-efficient, skill-based workflows |

## Interviewers ask

**What is codegen, and what do you do with the code it produces?**
`npx playwright codegen <url>` opens a browser window and the Playwright Inspector, and writes test code while you click and type. From the toolbar you can also record assertions for visibility, text and value. The documentation presents it as a quick way to get started: you copy the result into your editor, inspect it and improve it by hand where needed. The VS Code extension offers the same recorder with "Record new", "Record at cursor" and "Pick locator".

Source: [Test generator](https://playwright.dev/docs/codegen#recording-a-test)

**How do you record a test for pages behind a login?**
Record the login once with `--save-storage=auth.json`, which saves cookies, localStorage and IndexedDB data when the session ends. Later recordings start signed in with `--load-storage=auth.json`. The file contains sensitive information: the documentation says to use it only locally, and to add it to `.gitignore` or delete it when you have finished.

Source: [Test generator](https://playwright.dev/docs/codegen#preserve-authenticated-state)

**What is Playwright MCP, and how does the model "see" the page?**
It is a server that exposes browser automation as tools over the Model Context Protocol, for clients such as VS Code, Cursor or Claude Code. When a tool runs, it returns a structured snapshot of the accessibility tree: elements with their roles, text and a reference such as `ref=e5`. The model uses those references to click or type. The tools cover navigation, clicking and typing, screenshots, dialogs, tabs, network inspection and mocking, and saving and restoring storage state.

Source: [Playwright MCP](https://playwright.dev/docs/getting-started-mcp#accessibility-snapshots)

**Playwright MCP or `playwright-cli`: when would you use which?**
The documentation recommends `playwright-cli` for coding agents such as Claude Code or GitHub Copilot. Its commands avoid loading large tool schemas and verbose accessibility trees into the model context, which leaves room for the codebase. MCP is described as best for specialised agentic loops that benefit from persistent state and iterative reasoning over page structure, such as exploratory automation or long-running autonomous workflows.

Source: [Coding agents](https://playwright.dev/docs/getting-started-cli#playwright-cli-vs-playwright-mcp)

**What are the Playwright Test Agents?**
Three agent definitions that ship with Playwright since version 1.56: planner, generator and healer. They can be used on their own, one after another, or chained in an agentic loop. `npx playwright init-agents --loop=<tool>` writes the definitions into the project for VS Code, Claude Code, Codex or opencode. They are collections of instructions and MCP tools, and should be regenerated after every Playwright update.

Source: [Agents](https://playwright.dev/docs/test-agents#introduction)

**What does each agent take as input and produce as output?**
The planner takes a request such as "Generate a plan for guest checkout", a seed test and optionally a requirements document, and saves a Markdown plan under `specs/`. The generator takes that plan and writes test files under `tests/`, checking selectors and assertions live while it performs the scenario. The healer takes the name of a failing test and returns a passing test, or a skipped test if it believes the functionality itself is broken.

Source: [Agents](https://playwright.dev/docs/test-agents)

**What is a seed test, and why does the planner need it?**
It is a normal test, for example `seed.spec.ts`, that sets up the environment needed to interact with the app, often through your own fixtures. The planner runs it to execute the global setup, project dependencies, fixtures and hooks, so that it starts from a ready page. It also uses the seed test as the example for all generated tests.

Source: [Agents](https://playwright.dev/docs/test-agents#seed-tests-seedspects)

**What exactly does the healer change, and what should you check afterwards?**
It replays the failing steps, inspects the current UI to find equivalent elements or flows, suggests a patch and re-runs the test until it passes or until guardrails stop the loop. The patch examples in the documentation are a locator update, a wait adjustment and a data fix. The documentation also says that generated tests may contain initial errors and that the healer skips a test when it believes the feature is broken. So both outcomes need a look: a healed test and a skipped test.

Source: [Agents](https://playwright.dev/docs/test-agents)

**What are the security points when an AI agent drives a browser?**
The MCP tool `browser_run_code_unsafe` runs arbitrary JavaScript in the Playwright server process. The documentation calls it equivalent to remote code execution and says to enable it only for trusted MCP clients. The default MCP profile is persistent, so login state and cookies stay between sessions. `--isolated` starts every session fresh, and `--extension` connects the agent to your existing browser tabs, so choose the profile mode deliberately.

Source: [Playwright MCP](https://playwright.dev/docs/getting-started-mcp#running-playwright-code)

**How stable is all this?**
The pages for agents, MCP and `playwright-cli` do not label these tools experimental, but they change with almost every release, and this page matches version 1.63. The agents arrived in 1.56. Version 1.59 added `npx playwright test --debug=cli` and `npx playwright trace` so that coding agents can debug tests and read traces from the command line. Version 1.62 bundled the MCP server and the CLI into Playwright as `npx playwright mcp` and `npx playwright cli`.

Source: [Release notes](https://playwright.dev/docs/release-notes#version-162)
