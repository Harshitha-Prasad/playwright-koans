# 06 · Error handling, retries and polling

Koans: `koans/06-error-handling-retries.spec.ts` · Run: `npm run koan -- 06-error`

## The idea in six lines

- A failing test should say **why**. Most "error handling" in test code is about not hiding that reason.
- `expect.soft(...)` records a failure and keeps going, so one run shows every mismatch. The test still fails at the end.
- `expect.poll(fn)` retries a function until its return value matches. `expect(async () => {...}).toPass()` retries a whole block until nothing in it throws.
- **Retries** (`retries` in the config, `--retries=2`, or `test.describe.configure({ retries })`) re-run a failed test from scratch in a new worker. A test that passes on retry is reported as **flaky**, not passed.
- A `try/catch` that returns a default value turns a clear error into a wrong result somewhere else. Catch only when you can do something useful, and prefer `finally` for cleanup.
- Test the unhappy paths on purpose: wrong password, invalid input, server down.

## Choosing the right tool

| Situation | Use |
| --- | --- |
| Several independent checks on one screen | `expect.soft` |
| Waiting for a value that is not in the DOM (API status, file, counter) | `expect.poll` |
| A sequence of steps that only succeeds after a few attempts | `toPass` (pass a `timeout`; without one it keeps trying until the test timeout) |
| Explaining an assertion in the report | `expect(value, 'cart should hold two drinks')` |
| A known bug you want tracked, not hidden | `test.fail()` (passes while the bug exists) or `test.fixme()` (skipped) |
| Not applicable in this browser or environment | `test.skip(condition, 'reason')` |
| A legitimately slow test | `test.slow()` (triples the timeout) |
| An overlay that may appear at any moment | `page.addLocatorHandler(overlay, dismiss)` |

## Also worth knowing

- `toPass` has a default timeout of 0 and ignores the `expect` timeout from the config, so always pass one. `expect.poll` defaults to 5 seconds. Both accept `intervals`. ([Assertions](https://playwright.dev/docs/test-assertions))
- `expect.configure({ timeout: 10_000 })` returns an `expect` with its own defaults, for example a slower one for a known slow area. ([Assertions](https://playwright.dev/docs/test-assertions))
- `expect.extend({ ... })` adds your own matchers, such as `toHaveAmount`. ([Assertions](https://playwright.dev/docs/test-assertions))
- `failOnFlakyTests` in the config, or `--fail-on-flaky-tests`, makes a run fail when a test only passed on retry. Useful in CI once the suite is stable. ([TestConfig](https://playwright.dev/docs/api/class-testconfig#test-config-fail-on-flaky-tests))
- `maxFailures` or `--max-failures=10` stops the run after that many failures. ([Parallelism](https://playwright.dev/docs/test-parallel#limit-failures-and-fail-fast))
- `addLocatorHandler` accepts `times` to limit how often the handler runs. The handler changes focus and mouse position, so keep it small. ([Page.addLocatorHandler](https://playwright.dev/docs/api/class-page#page-add-locator-handler))

## Interviewers ask

**How do you handle flaky tests?**
Find the cause before reaching for retries: open the trace of the failed attempt and classify it as a test problem (race, missing wait, shared data), an environment problem (slow or unavailable dependency) or a product bug. Fix test problems at the source, mock or isolate unstable dependencies, report product bugs. Use retries so the pipeline keeps moving, and watch the flaky count as a metric, because a "flaky" label that nobody reads is a failure nobody fixes.

Source: experience, not documentation.

**What exactly is re-run on a retry?**
The whole test, including `beforeEach` and its fixtures, in a fresh worker process, so `beforeAll` runs again as well. `testInfo.retry` tells you which attempt you are in, and `trace: 'on-first-retry'` records a trace only when it is needed.

Source: [Retries](https://playwright.dev/docs/test-retries#retries)

**Soft vs hard assertions?**
A hard assertion stops the test at the first failure, which is right when later steps make no sense without it. Soft assertions suit independent checks where you want the full picture in one run.

Source: [Assertions](https://playwright.dev/docs/test-assertions)

**`expect.poll` vs `toPass`?**
`poll` retries one function and applies a matcher to its return value. `toPass` retries an arbitrary block containing several steps and assertions. Use `poll` when you are waiting for a value, `toPass` when you are waiting for a procedure to succeed.

Source: [Assertions](https://playwright.dev/docs/test-assertions)

**Is `try/catch` in a test a code smell?**
When it swallows an error to keep the test green, yes. It is fine for cleanup in `finally`, or for turning a low-level error into a clearer message that is thrown again.

Source: experience, not documentation.

**`test.fail` vs `test.fixme` vs `test.skip`?**
`fail`: runs the test and expects it to fail, so you notice when the bug is fixed. `fixme`: does not run it, marks it as needing work. `skip`: does not run it because it does not apply, ideally with a condition and a reason.

Source: [Annotations](https://playwright.dev/docs/test-annotations)
