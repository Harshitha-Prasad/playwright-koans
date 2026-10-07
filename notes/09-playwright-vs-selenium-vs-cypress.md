# 09 · Playwright vs Selenium vs Cypress

No koans here. This is the page for "why Playwright?" and "why not?".

All three tools change quickly. Treat this as a map of the main differences and check the current documentation before quoting a detail in an interview.

## Side by side

| | Playwright | Selenium WebDriver | Cypress |
| --- | --- | --- | --- |
| How it drives the browser | The test process talks to the browser over a persistent connection: the DevTools protocol for Chromium, and Playwright's own patched builds of Firefox and WebKit | Client libraries send W3C WebDriver commands to a browser-specific driver; Selenium 4 adds the bidirectional WebDriver BiDi protocol | Test code runs inside the browser alongside the application, coordinated by a Node process |
| Languages | TypeScript/JavaScript, Python, Java, .NET | Java, Python, C#, Ruby, JavaScript and more | JavaScript/TypeScript |
| Browsers | Chromium, Firefox, WebKit, plus installed Chrome and Edge | Every major browser, including real Safari | Chrome-family and Firefox; WebKit support has been experimental |
| Waiting | Built in: actionability checks and retrying assertions | You add explicit waits; an implicit wait exists | Built in: commands and assertions retry |
| Test runner | Included (Playwright Test): fixtures, parallelism, retries, reporters | Bring your own (JUnit, TestNG, pytest, ...) | Included |
| Parallel runs | Worker processes and sharding out of the box | Selenium Grid plus your runner's parallelism | Across machines, typically through Cypress Cloud or community tooling |
| Tabs, windows, iframes | Each tab is a `Page`; `frameLocator` for iframes | Window handles and `switchTo()` | Single tab by design; multiple origins via `cy.origin`; iframes need extra work |
| Network control | `page.route` to mock, modify or block | Not part of classic WebDriver; possible through BiDi or DevTools | `cy.intercept` |
| API testing | `request` fixture | Use a separate HTTP library | `cy.request` |
| Debugging | Trace viewer, UI mode, Inspector | Depends on your stack | Interactive runner with time travel |
| Mobile | Device emulation in desktop browsers | Real devices through the Appium ecosystem | Viewport emulation |

## What makes Playwright stand out

1. **Auto-waiting and retrying assertions by default.** The safe behaviour is the default, not something you add (module 02).
2. **Locators that are re-resolved and strict.** No stale elements, and ambiguity is an error, not a silent wrong click (module 01).
3. **Browser contexts.** A fresh, isolated session per test in milliseconds, which makes parallel runs and multi-user scenarios cheap (module 04).
4. **One package for the whole job.** Runner, fixtures, parallelism, API client, network mocking, reports (modules 04, 05, 08).
5. **The trace viewer.** A CI failure can be replayed step by step with DOM, network and console (module 07).

## Where it is weaker

- **WebKit is not Safari.** Playwright ships its own WebKit build. It catches most engine-level issues, but it is not the browser on a real iPhone or Mac.
- **No real mobile devices or native apps.** Emulation only.
- **Bundled browser builds.** You test against the versions that ship with your Playwright version, which may be ahead of or behind what your users have (installed Chrome and Edge can be used through `channel`).
- **Younger ecosystem.** Selenium has two decades of integrations, grid providers and people who know it.
- **Legacy browsers.** If a customer contract says Internet Explorer mode, Selenium is the answer.

## Interviewers ask

**Why would you choose Playwright for a new project?**
Lower flakiness by default, fast isolated tests in parallel, API and UI in one tool, and strong debugging. Tie it to a cost: less time spent triaging false failures.

**When would you not choose it?**
When the product must be verified on real Safari or real mobile devices, when the team and its infrastructure are deeply invested in Selenium and a migration would not pay for itself, or when legacy browsers are in scope.

**How would you migrate a Selenium suite?**
Not as a rewrite. Run both in parallel, write new tests in Playwright, migrate the flakiest and most valuable flows first, and retire Selenium tests as their counterparts prove stable. Rethink the design while migrating: fixtures in place of base classes, role-based locators in place of XPath, no explicit waits.

**Is Playwright only for end-to-end tests?**
No. It covers API tests through `request`, visual comparisons with `toHaveScreenshot`, accessibility checks together with axe, and component tests through its (still experimental) component testing mode.
