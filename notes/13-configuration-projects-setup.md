# 13 · Configuration, projects and global setup

No koans here. This page covers `playwright.config.ts`: what goes where, how projects split a run, and how setup that must happen once is organised.

## The idea in six lines

- The config is a `playwright.config.ts` file that exports `defineConfig({...})`. **Test runner options are top-level**: `testDir`, `fullyParallel`, `forbidOnly`, `retries`, `workers`, `reporter`, `timeout`, `expect`. They do not belong in `use`.
- `use` holds the options for the browser and the browser context: `baseURL`, `storageState`, emulation, network and recording options. They can be set globally, per project, and per file or `describe` block with `test.use()`.
- A **project** is a logical group of tests that run with the same configuration. Projects give you several browsers and devices, several environments, or a subset of files selected with `testMatch` and `testIgnore`.
- Setup that must run once before everything else can be done in two ways. **Project dependencies** are the recommended one, because the setup is written as ordinary tests. The `globalSetup` config option is the other.
- `webServer` starts your local server before the tests and waits until it answers. `reuseExistingServer: !process.env.CI` reuses a server that is already running on your machine.
- With `baseURL` set, tests navigate with paths: `page.goto('/login')`. `page.route`, `page.waitForURL`, `page.waitForRequest` and `page.waitForResponse` take the base URL into account as well.
- A custom option declared with `{ option: true }` in `test.extend` can be given a different value in the `use` section of each project.

## Cheat sheet

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',                          // runner options: top level
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  globalTimeout: 3_600_000,                  // limit for the whole run, off by default
  expect: { timeout: 5000 },

  use: {                                     // browser and context options
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'setup db', testMatch: /global\.setup\.ts/, teardown: 'cleanup db' },
    { name: 'cleanup db', testMatch: /global\.teardown\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup db'] },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] }, dependencies: ['setup db'] },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

| You want to | Use |
| --- | --- |
| Run one project | `npx playwright test --project=chromium` |
| Skip dependencies and teardowns | `npx playwright test --no-deps` |
| Use another config file | `npx playwright test -c <file>` |
| Override an option for a file or `describe` block | `test.use({ locale: 'fr-FR' })` |
| Go back to the value from the config | `test.use({ baseURL: undefined })` |

## Interviewers ask

**What belongs at the top level of `playwright.config.ts`, and what belongs in `use`?**
Options for the test runner are top-level: where the tests are, parallelism, retries, workers, reporters, timeouts, the `expect` settings, `projects` and `webServer`. `use` is for the browser and the context: `baseURL`, `storageState`, viewport, locale, permissions, `headless`, and the `trace`, `screenshot` and `video` settings. The documentation says it directly: runner options are top-level, do not put them into the `use` section.

Source: [Configuration](https://playwright.dev/docs/test-configuration#introduction)

**The same option is set in the config, in a project and with `test.use()`. Which one applies?**
The narrowest scope. An option in the global `use` applies to all tests, a project's `use` overrides it for that project, and `test.use()` in a file or `describe` block overrides it for those tests. Passing `undefined`, as in `test.use({ baseURL: undefined })`, resets the option to the value from the config file.

Source: [Configuration (use)](https://playwright.dev/docs/test-use-options#configuration-scopes)

**What is a project, and what would you use projects for besides browsers?**
A project is a logical group of tests that run with the same configuration. Besides browsers and emulated devices, the documentation shows projects for environments (a `staging` project with its own `baseURL` and two retries, a `production` project with none) and for splitting the suite (a `Smoke` project selected with `testMatch`, and a default project that ignores those files). All projects run by default, and `--project` selects one.

Source: [Projects](https://playwright.dev/docs/test-projects#configure-projects-for-multiple-environments)

**Global setup: project dependencies or `globalSetup`?**
Both run before all the tests. Project dependencies are the recommended way: the setup is written as ordinary tests, so it appears in the HTML report as its own project, a trace is recorded, fixtures work, and config options such as `headless` or `testIdAttribute` are applied. `globalSetup` is a file that exports one function. It is not shown in the report, has no trace or fixtures, and you launch the browser yourself. Data from it reaches the tests through `process.env`.

Source: [Global setup and teardown](https://playwright.dev/docs/test-global-setup-teardown#introduction)

**In what order do setup, dependent and teardown projects run, and what happens if setup fails?**
A dependency always runs first. Once all its tests have passed, the projects that depend on it run, in parallel by default and within the worker limit. Several dependencies of one project run first and in parallel with each other. If the tests of a dependency fail, the projects that rely on it are not run. A project named in the setup project's `teardown` property runs after all dependent projects have finished.

Source: [Projects](https://playwright.dev/docs/test-projects#running-sequence)

**You run a single test with `--grep`. Does the setup project still run?**
Yes. Filters such as `--grep`, `--shard`, a file location on the command line or `test.only()` select the primary tests. If those tests belong to a project with dependencies, all tests from the dependencies run too. `--no-deps` ignores dependencies and teardowns, so only the projects you selected run.

Source: [Projects](https://playwright.dev/docs/test-projects#test-filtering)

**What does `webServer` do, and when would you not use it?**
It runs a shell command that starts your local server before the tests, and it can take an array to start several, for example a frontend and a backend. The documentation describes it as ideal while you write tests during development and when there is no staging or production URL to test against. For a deployed environment, the documented pattern is a project with that environment's `baseURL`.

Source: [Web server](https://playwright.dev/docs/test-webserver#introduction)

**How does Playwright decide that the web server is ready?**
It requests `url` until the server answers with a 2xx, 3xx, 400, 401, 402 or 403 status, for at most `timeout` milliseconds (60000 by default). Alternatively, `wait` takes a regular expression for the server's `stdout` or `stderr`, and a named capture group in it is stored in an environment variable. `port` is deprecated in favour of `url`. With `reuseExistingServer: false`, Playwright throws if something is already listening on that URL.

Source: [Web server](https://playwright.dev/docs/test-webserver#configuring-a-web-server)

**How do you run the same tests with a different value per project, for example a different user?**
Declare an option in `test.extend` with a default value: `person: ['John', { option: true }]`. Tests and fixtures receive it by name, like any fixture. Each project then sets its own value in `use`, for example `use: { person: 'Alice' }`, and `defineConfig<TestOptions>` keeps the config type-checked.

Source: [Parameterize tests](https://playwright.dev/docs/test-parameterize#parameterized-projects)

**Two tests change the same account setting and fail only when they run in parallel. What does Playwright offer?**
Since version 1.63, a test can declare a named lock: `test('rename user', { lock: 'user-settings' }, ...)`. Tests that share a lock name never run at the same time, across files, workers and projects, and everything else stays parallel. A test can hold several locks, and `test.describe` accepts a lock for a whole group. In the default and serial modes a lock on any test is held for the duration of the whole file.

Source: [Parallelism](https://playwright.dev/docs/test-parallel#test-locks)
