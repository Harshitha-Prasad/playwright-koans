# 08 · Reporting and CI

Koans: `koans/08-reporting.spec.ts` · Config: `playwright.config.ts` · Workflow: `.github/workflows/ci.yml` · Run: `npm run koan -- 08-reporting`

## The idea in six lines

- Reporters are configured in `playwright.config.ts` as `[name, options]` pairs, and several can run at once. Built in: `list`, `line`, `dot`, `html`, `json`, `junit`, `blob`, `github`.
- The **HTML report** (`npx playwright show-report`) shows steps, errors, screenshots, videos and a link to the trace for each test.
- Tests make the report useful: `test.step` for structure, `testInfo.attach` for evidence, annotations for links to tickets, tags for selection, custom `expect` messages for intent.
- Artifacts are controlled in `use`: `trace`, `screenshot`, `video`. Raw files land in `test-results/`, the HTML report in `playwright-report/`.
- A custom reporter is a class with hooks such as `onBegin`, `onTestEnd` and `onEnd`. This repo has a small one: `support/progress-reporter.ts`.
- In CI: install the browsers, run the tests, and upload the report **even when the tests fail**.

## Reading this repo's workflow

`.github/workflows/ci.yml` has two jobs:

1. **Solutions** runs `npm run typecheck` and `npm run solutions`. This is the real quality gate: it proves every koan has a working answer against the current Playwright version.
2. **Koans progress** runs the koans with `continue-on-error`, so your fork shows how many are green on the run's summary page without failing the build while you are still learning.

Both upload `playwright-report/` as an artifact with `if: ${{ !cancelled() }}`, so the report is there precisely when you need it.

## Scaling a pipeline

```bash
npx playwright test --grep @smoke          # run a tagged subset
npx playwright test --shard=1/4            # split one run across four machines
npx playwright merge-reports ./blob-report # combine blob reports from the shards into one HTML report
```

Typical CI settings: `forbidOnly: !!process.env.CI` (a stray `test.only` fails the build), `retries: process.env.CI ? 2 : 0`, `trace: 'on-first-retry'`, and a fixed `workers` count that matches the runner.

## Interviewers ask

**Which reporters have you used, and why?**
Name the audience for each: `list` or `line` for the terminal, `html` for people investigating failures, `junit` for CI systems that display test results, `blob` for merging shards. Third-party reporters such as Allure plug in the same way (`allure-playwright`).

**How do you get one report from a sharded run?**
Each shard writes a `blob` report and uploads it. A final job downloads them all and runs `npx playwright merge-reports --reporter html`.

**How do you keep execution time down?**
Parallel workers and `fullyParallel`, sharding across machines, splitting jobs by tag or project, setting up data and login through the API instead of the UI, reusing storage state, mocking slow third parties, and running a smoke subset on every commit with the full suite on a schedule.

**What do you attach to a failed test?**
The trace first. Then whatever makes triage faster: a screenshot, the API response the UI was built from, relevant ids for searching the logs. Attachments belong in a fixture or `afterEach` so every test gets them.

**How do you tag tests and run a smoke suite?**
`test('title', { tag: '@smoke' }, ...)` and `--grep @smoke`, or a dedicated project with `grep` in the config.

**How do you publish the report so the team can open it?**
Upload it as a build artifact, or deploy `playwright-report/` to static hosting such as GitHub Pages or a bucket. Mind what is in it: traces contain page content and network payloads.
