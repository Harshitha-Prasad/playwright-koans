# 09 · Why Playwright, and how it compares with Selenium

No koans here. This is the page for "why Playwright?" and "why not?".

Both tools change quickly. Treat this as a map of the main differences and check the current documentation before quoting a detail in an interview.

## Side by side

| | Playwright | Selenium WebDriver |
| --- | --- | --- |
| How it drives the browser | The test process talks to the browser over a persistent connection: the DevTools protocol for Chromium, and Playwright's own patched builds of Firefox and WebKit | Client libraries send W3C WebDriver commands to a browser-specific driver; Selenium 4 adds the bidirectional WebDriver BiDi protocol |
| Languages | TypeScript/JavaScript, Python, Java, .NET | Java, Python, C#, Ruby, JavaScript and more |
| Browsers | Chromium, Firefox, WebKit, plus installed Chrome and Edge | Every major browser, including real Safari |
| Waiting | Built in: actionability checks and retrying assertions | You add explicit waits; an implicit wait exists |
| Test runner | Included (Playwright Test): fixtures, parallelism, retries, reporters | Bring your own (JUnit, TestNG, pytest, ...) |
| Parallel runs | Worker processes and sharding out of the box | Selenium Grid plus your runner's parallelism |
| Tabs, windows, iframes | Each tab is a `Page`; `frameLocator` for iframes | Window handles and `switchTo()` |
| Network control | `page.route` to mock, modify or block | Not part of classic WebDriver; possible through BiDi or DevTools |
| API testing | `request` fixture | Use a separate HTTP library |
| Debugging | Trace viewer, UI mode, Inspector | Depends on your stack |
| Mobile | Device emulation in desktop browsers, plus experimental Android support (Chrome for Android and WebView) | Real devices through the Appium ecosystem |

## What makes Playwright stand out

1. **Auto-waiting and retrying assertions by default.** The safe behaviour is the default, not something you add (module 02).
2. **Locators that are re-resolved and strict.** No stale elements, and ambiguity is an error, not a silent wrong click (module 01).
3. **Browser contexts.** A fresh, isolated session per test in milliseconds, which makes parallel runs and multi-user scenarios cheap (module 04).
4. **One package for the whole job.** Runner, fixtures, parallelism, API client, network mocking, reports (modules 04, 05, 08).
5. **The trace viewer.** A CI failure can be replayed step by step with DOM, network and console (module 07).

## Where it is weaker

- **WebKit is not Safari.** Playwright ships its own WebKit build. It catches most engine-level issues, but it is not the browser on a real iPhone or Mac.
- **No native apps and no real iOS devices.** Mobile is mostly emulation. Android support (Chrome for Android and WebView) exists but is experimental.
- **Bundled browser builds.** You test against the versions that ship with your Playwright version, which may be ahead of or behind what your users have (installed Chrome and Edge can be used through `channel`).
- **Younger ecosystem.** Selenium has two decades of integrations, grid providers and people who know it.
- **Legacy browsers.** If a customer contract says Internet Explorer mode, Selenium is the answer.

## Interviewers ask

**Why would you choose Playwright for a new project?**
Lower flakiness by default, fast isolated tests in parallel, API and UI in one tool, and strong debugging. Tie it to a cost: less time spent triaging false failures.

Source: experience, not documentation.

**When would you not choose it?**
When the product must be verified on real Safari or real mobile devices, when the team and its infrastructure are deeply invested in Selenium and a migration would not pay for itself, or when legacy browsers are in scope.

Source: [Browsers](https://playwright.dev/docs/browsers)

**How would you migrate a Selenium suite?**
Not as a rewrite. Run both in parallel, write new tests in Playwright, migrate the flakiest and most valuable flows first, and retire Selenium tests as their counterparts prove stable. Rethink the design while migrating: fixtures in place of base classes, role-based locators in place of XPath, no explicit waits.

Source: experience, not documentation.

**Is Playwright only for end-to-end tests?**
No. It covers API tests through `request`, visual comparisons with `toHaveScreenshot`, accessibility checks together with axe, and component tests through the built-in `mount` fixture.

Source: [API testing](https://playwright.dev/docs/api-testing)

### WebdriverIO and Playwright

**How do WebdriverIO and Playwright differ?**
|  | WebdriverIO | Playwright |
| --- | --- | --- |
| Protocol | WebDriver BiDi by default, and classic WebDriver (W3C); DevTools access through Puppeteer | DevTools protocol for Chromium; patched Firefox and WebKit builds |
| Browsers | Any browser with a driver, including real Safari and cloud grids (BrowserStack, Sauce Labs) | Bundled Chromium, Firefox and WebKit builds (and branded Chrome/Edge) |
| Mobile | **Native mobile apps through Appium** (major strength) | Mobile web emulation; no native apps |
| Waiting | Auto-waits on element actions; `waitForDisplayed` and other `waitFor*` commands for the rest | Auto-waiting on every action + web-first assertions |
| Test runner | WDIO testrunner with Mocha, Jasmine or Cucumber | Built-in `@playwright/test` |
| Selectors | `$()` (strict since v10), `$$()`, `role/` and `aria/` selectors; pierces shadow DOM since v9 | `getByRole` and other locators, pierces shadow DOM |
| Isolation | One browser session per spec file | New browser context per test (cheap, isolated) |
| Extras | Large ecosystem of services and reporters, network mocking, trace viewer | Trace viewer, codegen, UI mode, API testing, network mocking |

Source: [Why WebdriverIO?](https://webdriver.io/docs/why-webdriverio), [Selectors](https://webdriver.io/docs/selectors)

**When would you choose WebdriverIO?**
When you need native mobile testing with Appium in the same framework, real Safari on macOS or real-device clouds with deep WebDriver integration, or an existing WDIO + Cucumber estate that works well. Choose Playwright for a new web project, for speed and debuggability, and for combined UI + API testing.

Source: [Why WebdriverIO?](https://webdriver.io/docs/why-webdriverio)

**Migrating from WebdriverIO to Playwright: what changes?**
`browser.url()` → `page.goto()`. `$(sel).click()` → `page.locator(sel).click()`, preferably `getByRole`. Explicit waits disappear. `expect(el).toBeDisplayed()` → `await expect(locator).toBeVisible()`. Hooks → fixtures. Session-per-spec-file → context-per-test, so check any hidden dependencies between tests. Mention Appium tests staying on WDIO if mobile is involved.

Source: [Assertion](https://webdriver.io/docs/assertion), [Organizing Test Suite](https://webdriver.io/docs/organizingsuites)

**How do WebdriverIO and Playwright compare on locators?**
WebdriverIO's `$()` is also lazy and re-fetches, and it auto-waits for actions. Since v10 `$()` is strict too: more than one match throws a `StrictSelectorError` (v9 and earlier took the first match). Role and accessible-name queries use the `role/` and `aria/` selectors, shadow DOM is pierced automatically since v9, and the test runner ships retrying assertions (`expect-webdriverio`). Playwright adds `filter`, `and`/`or` and frame locators.

*Quick-answer summary*

- **Locator:** a lazy, re-resolving description of an element. Auto-waits and is strict.
- **Strict mode violation:** more than one match for a single-element action. Fix by scoping or filtering, not `first()`.
- **Priority:** role → label → placeholder/text → test id → CSS → XPath.
- **Text matching:** string = substring and case-insensitive; `exact: true` = whole string and case-sensitive; regex for anything else.
- **One of many:** `container.filter({ hasText | has }).getByRole(...)`.
- **No waiting:** `count()`, `all()`, `allTextContents()`, `isVisible()`. Assert with `expect(locator)` first.
- **`toHaveText`** = full text; **`toContainText`** = substring.
- **Iframes:** `frameLocator()` or `contentFrame()`. **Shadow DOM:** automatic, except XPath.
- **`fill`** for normal input; **`pressSequentially`** when each keystroke matters; `type` is deprecated.
- **`force: true`** skips the checks and hides bugs.

Source: [Selectors](https://webdriver.io/docs/selectors), [Locators](https://playwright.dev/docs/locators), and checked by running the code.
