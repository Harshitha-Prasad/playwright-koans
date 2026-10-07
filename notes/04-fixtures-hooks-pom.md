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
