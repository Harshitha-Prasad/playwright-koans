# 14 · Visual, accessibility and emulation testing

No koans here. This page covers the checks that go beyond "click and assert text": screenshots, aria snapshots, axe scans, emulated devices and settings, controlled time, and code that runs inside the page.

## The idea in six lines

- `await expect(page).toHaveScreenshot()` compares the page with a stored reference image. The first run writes the reference, later runs compare against it. The references are files that you commit and review.
- Rendering differs between operating systems, browser versions, hardware and headless mode. Run visual tests in the same environment that produced the baselines.
- An **aria snapshot** is a YAML description of the accessibility tree: roles, names, attributes and text. `toMatchAriaSnapshot` checks the structure of a page or a part of it against a template.
- Accessibility scans use the `@axe-core/playwright` package. Automated scans find some common problems. Many problems can only be found by manual testing.
- **Emulation** is configuration: a device from the `devices` registry, or single options such as `viewport`, `locale`, `timezoneId`, `geolocation`, `permissions`, `colorScheme` and `offline`, set in the config or with `test.use()`.
- `page.clock` controls time inside the page, so a session timeout or a date-dependent screen can be tested without waiting.
- Test code and page code run in different environments. `page.evaluate()` runs a function in the page and returns the result, and values must be passed to it as an argument.

## Cheat sheet

```ts
// Visual: compare with the stored baseline, hide what changes on every run
await expect(page).toHaveScreenshot('landing.png', {
  maxDiffPixels: 100,
  mask: [page.getByTestId('current-time')],
});

// Structure: match the accessibility tree against a template
await expect(page.getByRole('main')).toMatchAriaSnapshot(`
  - heading "title"
  - list:
    - listitem: Feature B
`);

// Accessibility: scan the page in its current state with axe
const results = await new AxeBuilder({ page })   // import AxeBuilder from '@axe-core/playwright'
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
expect(results.violations).toEqual([]);

// Time: install the clock, load the page, jump ahead
await page.clock.install({ time: new Date('2024-02-02T08:00:00') });
await page.goto('http://localhost:3333');
await page.clock.fastForward('30:00');

// Page environment: pass values in as an argument
const data = 'some data';
await page.evaluate(data => { window.myApp.use(data); }, data);
```

| `use` option | Example value |
| --- | --- |
| device | `...devices['iPhone 13']` |
| `viewport` | `{ width: 1280, height: 720 }` |
| `locale`, `timezoneId` | `'de-DE'`, `'Europe/Berlin'` |
| `geolocation` with `permissions` | `{ longitude: 12.492507, latitude: 41.889938 }`, `['geolocation']` |
| `colorScheme` | `'dark'` |
| `offline` | `true` |
| `javaScriptEnabled` | `false` |

Update baselines with `npx playwright test --update-snapshots` (`-u`). Skip snapshot checks with `--ignore-snapshots`.

## Interviewers ask

**How does `toHaveScreenshot` work, on the first run and after that?**
On the first run there is no reference, so Playwright takes screenshots until two consecutive ones match, saves the last one and reports that a snapshot did not exist. Later runs compare a new screenshot with that file. The references live in a folder next to the test file, such as `example.spec.ts-snapshots`, and are meant to be committed and reviewed. When the page has changed on purpose, `--update-snapshots` rewrites the references that no longer match.

Source: [Visual comparisons](https://playwright.dev/docs/test-snapshots#generating-screenshots)

**Visual tests pass on your laptop and fail in CI. Why?**
Browser rendering varies with the host operating system, version, settings, hardware, power source and headless mode. The snapshot file name also contains the browser or project name and the platform, for example `example-test-1-chromium-darwin.png`, so a Linux runner looks for a different file than a Mac. The documentation's advice is to run the tests in the same environment where the baselines were generated.

Source: [Visual comparisons](https://playwright.dev/docs/test-snapshots#introduction)

**How do you stop dynamic content from breaking a screenshot test?**
Pass locators in `mask` and they are covered with a box (pink by default, `maskColor` changes it). `stylePath` applies a stylesheet while the screenshot is taken, for example to hide an iframe. Animations are disabled and the text caret is hidden by default. For small rendering noise there are `maxDiffPixels`, `maxDiffPixelRatio` and `threshold`, per call or for all tests under `expect.toHaveScreenshot` in the config.

Source: [PageAssertions](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1)

**What is an aria snapshot, and when would you not use one?**
It is a YAML representation of the accessibility tree, one node per element in the form `- role "name" [attribute=value]`. `toMatchAriaSnapshot` compares it with a template: matching is case-sensitive and order-sensitive, names can be regular expressions, and a template may list only some of the children unless `/children: equal` is set. The documentation recommends snapshots for broad structural checks of pages and components. It recommends ordinary assertions for core logic and computed values, and warns that snapshots suit highly dynamic content badly and that updates are easy to accept without understanding them.

Source: [Snapshot testing](https://playwright.dev/docs/aria-snapshots#snapshot-matching)

**How do you automate accessibility checks, and what do you do about known violations?**
Install `@axe-core/playwright`, call `await new AxeBuilder({ page }).analyze()` and assert that `violations` is an empty array. The scan sees the page in its current state, so open the menu or dialog first and wait for it. Known issues can be handled with `exclude()` for an element, `disableRules()` for a rule, or a snapshot of a small fingerprint of the violations (rule id and targets) instead of the whole array. The documentation states that automated tests detect only some common problems and recommends combining them with manual assessment and inclusive user testing.

Source: [Accessibility testing](https://playwright.dev/docs/accessibility-testing#handling-known-issues)

**What does emulating a device change?**
Spreading an entry from the `devices` registry into `use` sets parameters such as the user agent, screen size, viewport and whether touch is enabled, and all tests of that project run with them. Any override, for example `viewport` or `isMobile`, must come after the spread, because the device defines those properties too. Pre-configured devices assume a platform: "Desktop Chrome" sends a Windows user agent. Set `userAgent: undefined` to keep the one of the machine that runs the tests.

Source: [Emulation](https://playwright.dev/docs/emulation#devices)

**How do you test behaviour that depends on locale, time zone, location or colour scheme?**
Set `locale`, `timezoneId`, `geolocation` together with `permissions: ['geolocation']`, or `colorScheme` in the config, per project, or with `test.use()` in one file. Some of it can change during a test: `context.setGeolocation()`, `context.grantPermissions()` and `page.emulateMedia()`. The locale and time zone options affect the browser only. The time zone of the test runner process is set with the `TZ` environment variable.

Source: [Emulation](https://playwright.dev/docs/emulation#locale--timezone)

**A user is logged out after 30 minutes of inactivity. How do you test that without waiting?**
Call `page.clock.install()` before the page loads, interact, then `page.clock.fastForward('30:00')`. The timers that are due fire once, as they would after closing and reopening a laptop lid. If only the date matters, `page.clock.setFixedTime()` is the recommended, simpler choice: `Date.now()` returns a fixed value while timers keep running. `install` must be called before any other clock-related call, otherwise the behaviour is undefined.

Source: [Clock](https://playwright.dev/docs/clock#test-inactivity-monitoring)

**What is the status of component testing in Playwright?**
It changed in version 1.62. A component test is now a regular Playwright test that runs against a small "story gallery" page served by your own dev server. The built-in `mount` fixture of `@playwright/test` navigates to the gallery, renders a story by its id and returns a locator for it. The earlier `@playwright/experimental-ct-react`, `-ct-react17` and `-ct-vue` packages have been removed and are no longer published, and the documentation contains a migration guide.

Source: [Component testing](https://playwright.dev/docs/test-components#introduction)

**Why can a function passed to `page.evaluate()` not use a variable from the test?**
The test runs in the Playwright environment and the function runs in the browser page. These are different virtual machines in different processes. A variable from the test does not exist in the page, so pass it as the argument: `page.evaluate(data => ..., data)`. The argument can be a mix of serialisable values and handles, and the result comes back to the test. To run something before the page starts loading, for example to replace `Math.random`, use `page.addInitScript()`.

Source: [Evaluating JavaScript](https://playwright.dev/docs/evaluating#different-environments)
