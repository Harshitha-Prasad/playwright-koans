# 04 · Fixtures, hooks and page objects

Koans: `koans/04-fixtures-hooks-pom.spec.ts` · Pages: `/locators.html`, `/login.html`, `/dashboard.html` · Run: `npm run koan -- 04-fixtures`

## The idea in six lines

- A **fixture** is something a test asks for by name: `async ({ page, request }) => ...`. Built-ins include `page`, `context`, `browser`, `request` and `browserName`. Options such as `baseURL` can be requested the same way.
- Every test gets a **fresh browser context**: its own cookies, storage and cache. That isolation is why tests can run in parallel and in any order.
- Custom fixtures come from `test.extend`. Code before `await use(value)` is setup, code after it is teardown, and teardown runs even when the test fails.
- Fixtures are **lazy** (only built when a test or hook asks for them) and **composable** (a fixture can depend on other fixtures).
- Hooks (`beforeEach`, `afterEach`, `beforeAll`, `afterAll`) still exist for simple shared steps inside one file.
- A **page object** wraps the locators and actions of one page behind readable methods. Hand it to tests through a fixture so nobody writes `new MenuPage(page)` twice.

## Shape of a custom fixture

```ts
const test = base.extend<{ order: Order }>({
  order: async ({ request }, use) => {
    const order = await (await request.post('/api/orders', { data })).json(); // setup
    await use(order);                                                        // the test runs here
    await request.delete(`/api/orders/${order.id}`);                         // teardown
  },
});
```

Options worth knowing: `{ scope: 'worker' }` builds the fixture once per worker process (database connections, one account per worker), and `{ auto: true }` runs it for every test without being requested.

## Authentication

Logging in through the UI before every test is slow and adds a second place to fail. Two common alternatives:

- **Storage state**: a setup project logs in once, saves cookies and local storage with `context.storageState({ path })`, and the other projects start already signed in via `use: { storageState: path }` and `dependencies: ['setup']`.
- **API login**: call the login endpoint with `request` and inject the result, which is what the `dashboard` fixture in this module does.

## Also worth knowing

- **Fixture options.** A fixture declared as `['default value', { option: true }]` can be set per project in the config or with `test.use()`. This is how one test file runs against several users or environments. ([Fixture options](https://playwright.dev/docs/test-fixtures#fixtures-options))
- **Global hooks without copy and paste.** A fixture with `{ auto: true }` acts as a `beforeEach` and `afterEach` for every test in every file. ([Adding global hooks](https://playwright.dev/docs/test-fixtures#adding-global-beforeeachaftereach-hooks))
- **Setup projects or `globalSetup`?** The documentation recommends project dependencies: the setup shows up in the HTML report, records a trace and can use fixtures. A setup project can name a `teardown` project that runs after everything depending on it. ([Global setup and teardown](https://playwright.dev/docs/test-global-setup-teardown))
- **One account per worker.** When tests change server-side state, log in once per worker with a different account, chosen by `test.info().parallelIndex`. ([Authentication](https://playwright.dev/docs/auth#moderate-one-account-per-parallel-worker))
- **What storage state holds.** Cookies, local storage and, on request, IndexedDB. Session storage is not saved. ([Authentication](https://playwright.dev/docs/auth))

## Interviewers ask

**Fixtures or `beforeEach`: why prefer fixtures?**
A fixture keeps setup and teardown together, is only run for tests that need it, can be reused across files, composes with other fixtures and is typed. `beforeEach` is fine for a step that every test in one file shares.

Source: [Fixtures](https://playwright.dev/docs/test-fixtures#with-fixtures)

**What is the difference between `browser`, `context` and `page`?**
`browser` is the browser process. A `context` is an isolated session inside it, comparable to an incognito profile. A `page` is one tab in a context. Playwright Test creates a new context and page per test and reuses the browser per worker.

Source: [Fixtures](https://playwright.dev/docs/test-fixtures#built-in-fixtures)

**How do you share a login across tests without sharing state?**
Save the storage state once and load it into each fresh context. Tests stay isolated because each gets its own copy.

Source: [Authentication](https://playwright.dev/docs/auth#basic-shared-account-in-all-tests)

**Test-scoped vs worker-scoped fixtures?**
Test-scoped fixtures are created and torn down for every test. Worker-scoped ones live as long as the worker process and are for expensive, shareable things.

Source: [Fixtures](https://playwright.dev/docs/test-fixtures#worker-scoped-fixtures)

**How do tests run in parallel?**
Test files run in parallel across worker processes. Tests inside one file run in order in a single worker unless `fullyParallel: true` (this repo) or `test.describe.configure({ mode: 'parallel' })`. `mode: 'serial'` makes a group dependent: one failure skips the rest.

Source: [Parallelism](https://playwright.dev/docs/test-parallel#parallelize-tests-in-a-single-file)

**In what order do hooks and fixtures run?**
Automatic worker fixtures, then `beforeAll`, then for each test: automatic test fixtures, `beforeEach`, the test, `afterEach`, fixture teardown in reverse order. Other fixtures are set up lazily, just before the first hook or test that needs them. Note that `beforeAll` runs once **per worker**, and a failed test restarts the worker.

Source: [Fixtures](https://playwright.dev/docs/test-fixtures#execution-order)

**Should assertions live in page objects?**
A common rule: page objects expose actions and locators, tests make the assertions. That keeps the intent of each test visible in the test file. Reusable checks ("is loaded") inside a page object are a reasonable exception.

Source: experience, not documentation.

**How do you run the same test with different data?**
Loop over a data array and call `test()` inside the loop with the value in the title. For different environments or browsers, use projects.

Source: [Parameterize tests](https://playwright.dev/docs/test-parameterize#parameterized-tests)

### Test structure and framework design

**Structure of a test file?**
`test.describe` blocks, `test()` cases, hooks (`beforeAll/afterAll/beforeEach/afterEach`), `test.step` for readable reports, annotations (`test.skip`, `test.fixme`, `test.fail`, `test.only`, `test.slow`), tags (`{ tag: '@smoke' }`), `test.describe.configure({ mode: 'serial' | 'parallel', retries })`.

Source: interview handbook, not checked against documentation.

**How do you design tests that are independent of test data?**
Create what you need per test through the API/DB using builders with unique identifiers; clean up in fixture teardown; never share mutable users across parallel workers; use per-worker accounts if needed (`test.info().parallelIndex`).

Source: interview handbook, not checked against documentation.

**Describe your ideal Playwright framework structure**
```
tests/            feature specs (thin, readable, business language)
pages/            page objects / components (locators + actions, no assertions of business rules)
fixtures/         test.extend with page objects, API clients, data builders, auth
api/              typed API client wrappers
data/             builders, factories, constants
utils/            helpers (dates, random, retry)
config/           environments, playwright.config.ts
.github/ or .gitlab-ci.yml
```

Principles: tests independent and idempotent; no sleeps; assertions in tests (or clearly named page assertions); one behaviour per test; tags for suites (@smoke, @regression); environment via config not code; lint + type-check in CI; traces on failure; reports archived.

Source: interview handbook, not checked against documentation.

**Page Object Model, pros, cons, alternatives?**
POM centralises locators and actions and gives readable tests; risk is bloated god-objects and hidden assertions. Alternatives/complements: component objects, screenplay pattern (actors, tasks, questions), or "app actions" via fixtures. Senior answer expresses judgement: small page objects, composition over inheritance, fixtures for wiring.

Source: interview handbook, not checked against documentation.

**How do you keep a suite fast and trustworthy as it grows?**
Parallelism and sharding, API setup instead of UI, storageState auth, smoke vs regression tagging, quarantining flaky tests with an SLA to fix, flaky-rate dashboards, test ownership, CI time budgets, deleting redundant tests, running the right subset per change (path filters), and periodically reviewing what E2E should move down to API/component tests.

Source: interview handbook, not checked against documentation.

**How do you organise locators in a page object?**
```ts
export class OrdersPage {
  readonly search: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.search = page.getByRole('searchbox', { name: 'Search orders' });
    this.rows = page.getByRole('row');
  }

  row(customer: string): Locator {                     // parameterised locator = method
    return this.rows.filter({ hasText: customer });
  }

  async edit(customer: string) {
    await this.row(customer).getByRole('button', { name: 'Edit' }).click();
  }
}
```

Points to make: locators can be created in the constructor because they are lazy, so nothing is searched until a test uses them; expose `Locator` objects so tests can assert on them with web-first assertions; never store strings and call `page.locator(string)` everywhere; never store the result of `count()` or `textContent()` as a field.

Source: interview handbook, not checked against documentation.

### Parallelism, workers and fixture scopes

These questions often come one after another.

**What exactly is a worker?**
A worker is a separate **Node.js operating-system process** started by the Playwright test runner. Each worker:

- launches **its own browser** and reuses it for every test it runs;
- has its own memory, module state and worker-scoped fixtures;
- runs **one test at a time**.

The main runner process doesn't run tests. It hands tests to workers and collects the results. In the experiment, two workers had different process IDs (`pid=1333`, `pid=1334`) and different browser instances.

Source: interview handbook, not checked against documentation.

**Do tests run in parallel, or do workers?**
**Workers run in parallel. Inside a worker, tests run one after another.** "Parallel tests" really means tests spread across several workers. With 3 workers, at most 3 tests run at the same moment.

Source: interview handbook, not checked against documentation.

**How many workers does Playwright start if you don't set any?**
**Half the machine's logical CPU cores** (`workers` defaults to `50%`). On the 2-core test machine that meant 1 worker, so everything ran in sequence. You can set it:

```ts
export default defineConfig({ workers: process.env.CI ? 2 : undefined });   // or workers: '75%'
```

```bash
npx playwright test --workers=4
```

The config created by `npm init playwright` sets `workers: process.env.CI ? 1 : undefined`. That's safe but slow, so tune it to the size of your CI runner.

Source: interview handbook, not checked against documentation.

**How is work split between workers by default?**
By **file**. Different files run in parallel on different workers, but all the tests in one file run **in order, in the same worker**. From the experiment with 2 workers:

```
worker 0: a1 → a2 → a3        (all of file a)
worker 1: b1 → b2 → b3        (all of file b)
```

So one very large spec file becomes the bottleneck, however many workers you have.

Source: interview handbook, not checked against documentation.

**What does `fullyParallel` change?**
It makes **individual tests** the unit of distribution instead of files. Any test from any file can go to any free worker:

```ts
export default defineConfig({ fullyParallel: true });   // or: npx playwright test --fully-parallel
```

From the experiment with 3 workers: `a1` ran on worker 0, `a2` on worker 1, `a3` on worker 2. The tests from one file were spread across three processes.

The consequences are also common follow-up questions:

- Tests must be **completely independent**. There's no guaranteed order, and no shared in-memory state even between tests in the same file.
- **`beforeAll` runs in every worker that gets a test from that file.** In the experiment, `beforeAll` for file `a` ran **three times** (once per worker process), not once. Never put one-time global setup (such as seeding the database) in `beforeAll`. Use a setup project or `globalSetup` instead.

Source: interview handbook, not checked against documentation.

**How do I run the tests within one file in parallel, without turning it on for everything?**
```ts
test.describe.configure({ mode: 'parallel' });   // at the top of the file, or inside a describe block
```

In the experiment, `e1` and `e2` from the same file ran at the same time in two different processes. The reverse works too: with `fullyParallel: true` globally, `test.describe.configure({ mode: 'default' })` makes one file run in order again.

Source: interview handbook, not checked against documentation.

**How do I run tests serially?**
There are three levels:

- **Whole run in sequence:** `--workers=1` (or `workers: 1`).
- **Tests that depend on each other**, in one file:test.describe.configure({ mode: 'serial' }); test('create order', …); test('pay order', …);      // depends on the previous test test('ship order', …);  Serial mode means: the tests run in order in one worker. **If one fails, the rest are skipped.** In the experiment, `c2` failed and `c3` "did not run". **On retry, the whole group reruns from the start.**
- **Across projects:** `dependencies: ['setup']` runs the setup project first.

Interview framing: serial mode is a code smell to use only as a last resort. Tests that depend on each other can't run in parallel, a single failure hides everything after it, and you can't run one test on its own. The better fix is to make each test create its own data (through the API) so it can run on its own.

Source: interview handbook, not checked against documentation.

**What happens to a worker when a test fails?**
Playwright **throws the worker away and starts a new one** for the remaining tests, so a broken page or browser state can't leak into later tests. In the experiment, `d1` failed on worker 0, and `d2` and `d3` then ran on **worker 1**, with worker fixtures torn down and set up again. That's why:

- `test.info().workerIndex` is a unique ID per worker *process*, and it keeps increasing when workers restart;
- `test.info().parallelIndex` is the stable *slot*, from `0` to `workers - 1` (it stayed `0` after the restart). Use `parallelIndex` to pick per-worker test accounts (`user-${parallelIndex}@test.io`), because it never goes beyond the number of workers.

Source: interview handbook, not checked against documentation.

**Worker vs browser context: why do we need both?**
They solve different problems:

|  | Worker | Browser context |
| --- | --- | --- |
| What it is | An OS process with its own browser | An isolated incognito-like session inside a browser |
| Created | Once per worker (restarted after a failure) | **New for every test** by default |
| Cost | Expensive: starting a browser takes seconds | Cheap: milliseconds |
| Purpose | **Speed** through parallelism | **Isolation**: separate cookies, localStorage, cache, permissions, viewport |

In the experiment, all tests in one worker shared **one browser**, but every test got a **new context**. Neither alone would be enough:

- A new *browser* per test would be isolated but very slow.
- One *context* shared by many tests would be fast, but tests would leak logins and cookies into each other.

Playwright combines both: launch the browser once per worker (fast), and create a fresh context per test (isolated). That's also why two users in one test is simply two contexts in the same browser.

Source: interview handbook, not checked against documentation.

**Test scope vs worker scope?**
```ts
export const test = base.extend<
  { loginPage: LoginPage },                  // test-scoped fixtures
  { apiToken: string }                       // worker-scoped fixtures
>({
  loginPage: async ({ page }, use) => {      // test scope (the default)
    await use(new LoginPage(page));          // set up before EACH test that uses it…
  },                                         // …torn down after that test

  apiToken: [async ({}, use) => {            // worker scope
    const token = await fetchToken();        // set up ONCE per worker…
    await use(token);                        // …shared by every test in that worker
  }, { scope: 'worker' }],                   // …torn down when the worker shuts down
});
```

|  | Test scope (default) | Worker scope |
| --- | --- | --- |
| Lifetime | One test | Entire worker process |
| Set up | Before each test that uses it | Once, when the first test in that worker needs it |
| Shared between tests? | No | Yes, by every test in that worker |
| Built-in examples | `page`, `context`, `request` | `browser`, `browserName`, `playwright` |
| Use for | Pages, page objects, per-test data, anything that holds state | Expensive, read-only things: auth tokens, a DB connection pool, a test account per worker, a started mock server |

The experiment's log confirms it: the test-scoped fixture was set up and torn down **6 times** for 6 tests; the worker-scoped one **once per worker**.

The rules interviewers want to hear:

- A **worker fixture can't depend on a test fixture.** It lives longer than they do, so `page` isn't available to it; use `browser` instead.
- Worker fixtures are **re-created when a worker restarts** after a failure, so they must be safe to set up again.
- Worker fixtures are shared, so they must **not hold per-test state**, or you get order-dependent flakiness.
- Teardown runs in **reverse order** of setup, so a fixture can rely on its dependencies still existing during cleanup.

Source: interview handbook, not checked against documentation.

**What other fixture options are there?**
- **`{ auto: true }`:** runs for every test even if it isn't requested. Examples: attaching console errors, or starting a coverage collector.failOnConsoleErrors: [async ({ page }, use) => {   const errors: string[] = [];   page.on('console', m => m.type() === 'error' && errors.push(m.text()));   await use();   expect(errors, 'console errors').toEqual([]); }, { auto: true }],
- **Option fixtures (`{ option: true }`):** configurable values that each project can override with `use: { … }` in the config. An example is `locale` per project for German and English runs.
- **`{ timeout: 60_000 }`:** gives a slow fixture its own timeout, separate from the test timeout.

Source: interview handbook, not checked against documentation.

**Workers vs sharding?**
Workers are parallel processes on **one machine**. Sharding (`--shard=2/4`) splits the test list across **several machines or CI jobs**, and each shard still uses its own workers. Total parallelism is shards × workers per shard. Sharding splits by test when `fullyParallel` is on, and by file otherwise. Merge the per-shard `blob` reports with `npx playwright merge-reports`. See 7.2 for the GitHub Actions matrix.

Source: interview handbook, not checked against documentation.

**How do you pick the number of workers?**
Start with the number of CPU cores on the CI runner. Each worker runs a browser, so memory is usually the real limit. Measure and increase until run time stops improving or flakiness appears. Also check what the **system under test** can handle: 16 workers hitting a small staging database can cause the flakiness you're trying to avoid. Use `maxFailures` (`--max-failures=10`) to stop a clearly broken run early and save CI minutes.

*Quick-answer summary*

- **Worker:** a separate Node process with its own browser. Workers run in parallel; each runs one test at a time.
- **Default number of workers:** half the logical CPU cores.
- **Default distribution:** files run in parallel; tests inside a file run in order in the same worker.
- **`fullyParallel`:** individual tests are spread across workers. `beforeAll` then runs once per worker.
- **Parallel within one file:** `test.describe.configure({ mode: 'parallel' })`.
- **Serial:** `--workers=1` for the whole run; `mode: 'serial'` for dependent tests (the rest are skipped after a failure, and the group retries as a whole).
- **Worker vs context:** the worker gives speed (one browser per process); the context gives isolation (fresh per test).
- **Test vs worker scope:** set up per test, or once per worker and shared by its tests.

Source: interview handbook, not checked against documentation.
