# 02 · Auto-waiting and web-first assertions

Koans: `koans/02-auto-waiting.spec.ts` · Page: `/waiting.html` · Run: `npm run koan -- 02-auto`

This is the feature people mean when they say Playwright is "less flaky".

## The idea in six lines

- Before an **action**, Playwright runs actionability checks and retries them until they pass or the timeout expires. For `click`: the locator resolves to exactly one element that is visible, stable (not animating), not covered by something else, and enabled. For `fill`: visible, enabled, editable.
- **Web-first assertions** (`await expect(locator).toHaveText(...)`) retry in the same way until the condition holds.
- Anything that returns a plain value reads the page **once**: `textContent()`, `isVisible()`, `count()`, `all()`, `innerText()`. Wrapping those in `expect(...)` gives you an assertion that does not wait.
- `{ force: true }` skips the actionability checks. The click "works" and the test stops telling you that a user could not have clicked.
- `waitForTimeout` is a guess about timing. Too short and the test is flaky, too long and the suite is slow.
- Auto-waiting is about **element state**. It does not wait for API calls or for the page to be "ready"; assert on what the user would see instead.

## Retries vs reads once

| Retries until timeout | Reads once |
| --- | --- |
| `await expect(locator).toBeVisible()` | `await locator.isVisible()` |
| `await expect(locator).toHaveText('x')` | `await locator.textContent()` |
| `await expect(locator).toHaveCount(3)` | `await locator.count()` / `await locator.all()` |
| `await expect(page).toHaveURL(/x/)` | `page.url()` |

## Timeouts

| Setting | Default | In this repo |
| --- | --- | --- |
| Test timeout (`timeout`) | 30 s | 15 s |
| Assertion timeout (`expect.timeout`) | 5 s | 3 s |
| Action timeout (`use.actionTimeout`) | none (limited by the test timeout) | 3 s |

Any single call can override its own: `await expect(x).toHaveText('done', { timeout: 6_000 })`.

## Interviewers ask

**What does Playwright wait for before clicking?**
That the element is attached and unique, visible, stable, able to receive pointer events (nothing is on top of it) and enabled. It also scrolls the element into view.

**Auto-waiting vs web-first assertions: what is the difference?**
Auto-waiting belongs to actions and makes sure the element can be acted on. Web-first assertions are checks that retry until the expected state appears. You need both: the action waits for the element, the assertion waits for the result.

**If Playwright auto-waits, when do you still write an explicit wait?**
For things that are not element state: a specific network response (`waitForResponse`), a URL change (`waitForURL`), a new tab or download (`waitForEvent`), or a value that is not in the DOM (`expect.poll`, `toPass`).

**When is `force: true` acceptable?**
Rarely: when you deliberately want to bypass a check you know is irrelevant to the test, and you can say why. Using it to get past an overlay or a disabled button hides a real defect or a missing step in the test.

**How is this different from Selenium?**
Selenium acts immediately unless you add waits yourself (`WebDriverWait` with expected conditions, or a global implicit wait). In Playwright the waiting is built into every action and assertion, so the default is the safe behaviour.

**A test passes locally and times out in CI. Where do you look?**
Open the trace from CI first. Usual causes: an assertion that reads once instead of retrying, a hard-coded sleep, data that differs between environments, a slower backend, or a different viewport. Raising the global timeout is the last resort, not the first.
