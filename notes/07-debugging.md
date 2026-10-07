# 07 · Debugging

Koans: `koans/07-debugging.spec.ts` · Pages: `/locators.html`, `/debug.html` · Run: `npm run koan -- 07-debugging`

The koans in this module are broken the way real tests break, and nothing in them says where. The exercise is the workflow, not the fix.

## The toolbox

| Tool | Start it with | Good for |
| --- | --- | --- |
| UI mode | `npx playwright test --ui` | Running one test, watching each step, time-travelling through DOM snapshots, picking locators |
| Trace viewer | `npx playwright show-report`, click a failed test, open the trace | Failures you did not watch, especially from CI |
| Inspector | `npx playwright test --debug` or `await page.pause()` | Stepping through a test line by line in a headed browser |
| Headed run | `npx playwright test --headed` | A quick look at what the browser is doing |
| VS Code extension | "Playwright Test for VS Code" | Breakpoints, run and debug from the editor |
| Verbose API log | `DEBUG=pw:api npx playwright test` | Seeing every Playwright call in the terminal |

Useful flags: `-g "title"` (one test), `-x` (stop at first failure), `--last-failed`, `--repeat-each=10` (hunt flakiness), `--workers=1` (rule out parallelism).

## What a trace contains

For every action: a DOM snapshot before and after, the **call log** (what Playwright was waiting for), the source line, console messages, network requests with their status and bodies, and any attachments. The trace setting in this repo is `retain-on-failure`; a common CI choice is `on-first-retry`.

## Error messages decoded

| Message | Usually means |
| --- | --- |
| `strict mode violation ... resolved to N elements` | The locator is ambiguous. Narrow it |
| `waiting for getByRole(...)` then timeout | Nothing matches: wrong page, wrong name, inside an iframe, or not rendered yet |
| `element is not visible` | It exists but is hidden: collapsed menu, hover-only item, wrong viewport |
| `<div ...> intercepts pointer events` | Something is on top of it: modal, cookie banner, sticky header, spinner |
| `element is not enabled` | The app has not finished something, or a previous step was skipped |
| `Input of type "checkbox" cannot be filled` | The locator found a different element than you meant |
| `Test timeout of 15000ms exceeded` | One step waited the whole budget. The call log shows which |

## Also worth knowing

- `--debug` is short for `PWDEBUG=1` with `--timeout=0 --max-failures=1 --headed --workers=1`. It can target one test: `npx playwright test example.spec.ts:10 --debug`. ([Command line](https://playwright.dev/docs/test-cli))
- A trace zip opens with `npx playwright show-trace trace.zip`, or by dropping it on [trace.playwright.dev](https://trace.playwright.dev), which runs entirely in the browser. ([Trace viewer](https://playwright.dev/docs/trace-viewer))
- A trace keeps three snapshots per action: before, during (with the click position) and after. ([Trace viewer](https://playwright.dev/docs/trace-viewer))
- More trace settings exist than the common three: `on-all-retries`, `retain-on-first-failure` and `retain-on-failure-and-retries`. ([Test use options](https://playwright.dev/docs/test-use-options))
- `--only-changed=main` runs only the test files changed compared with a branch. ([Command line](https://playwright.dev/docs/test-cli))
- UI mode has a watch toggle per test that re-runs it when its file changes. ([UI mode](https://playwright.dev/docs/test-ui-mode))

## Interviewers ask

**A test fails. What do you do first?**
Read the error and the call log, then open the trace at the failing step and compare the "before" snapshot with what the test expected. Only then change code. Decide which bucket it is: the test (locator, timing, data), the environment (dependency down, configuration) or the product (a real bug).

Source: experience, not documentation.

**A test passes locally but fails in CI. How do you debug it?**
Get the trace from the CI artifacts instead of guessing. Then compare the conditions: headless vs headed, viewport, speed, parallel workers, test data, environment variables. Reproduce with `--repeat-each` and the same number of workers.

Source: [Trace viewer](https://playwright.dev/docs/trace-viewer)

**Trace vs video vs screenshot?**
A screenshot is one moment. A video shows what happened but not why. A trace has the DOM, network, console and call log for every step and can be explored after the fact, which makes it the most useful of the three.

Source: [Trace viewer](https://playwright.dev/docs/trace-viewer)

**How do you find out why a click did nothing?**
Check the Console tab of the trace for a JavaScript error, or collect them in the test with `page.on('pageerror')` and `page.on('console')`. Then the Network tab for a failed request.

Source: [Trace viewer](https://playwright.dev/docs/trace-viewer)

**How do you debug a locator?**
"Pick locator" in UI mode or the Inspector, or `npx playwright codegen <url>`. When the test runs with `PWDEBUG=console` and is paused, `playwright.locator('...')` in the DevTools console lists the matching elements.

Source: [Debugging Tests](https://playwright.dev/docs/debug)
