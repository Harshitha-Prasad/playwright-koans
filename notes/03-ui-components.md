# 03 · UI components

Koans: `koans/03-ui-components.spec.ts` · Page: `/components.html` · Run: `npm run koan -- 03-ui`

## Cheat sheet

| Component | Use | Watch out for |
| --- | --- | --- |
| Native `<select>` | `selectOption('Large')`, or an array for multi-select | Custom dropdowns built from `<div>`s are not selects: click to open, then `getByRole('option')` |
| Checkbox, radio | `check()`, `uncheck()`, `setChecked(bool)`; assert with `toBeChecked()` | `check()` is idempotent, `click()` toggles |
| File upload | `setInputFiles(path)`, several paths, or `{ name, mimeType, buffer }` | No `<input type=file>` in the DOM? Wait for `page.waitForEvent('filechooser')` |
| `alert`, `confirm`, `prompt` | `page.once('dialog', d => d.accept())` | Dialogs are auto-dismissed without a listener. Register it **before** the click |
| iframe | `page.frameLocator('iframe[title="Payment"]')` or `locator.contentFrame()` | Locators on `page` do not see into frames. There is no "switch to frame" |
| Shadow DOM | Nothing special: `getByRole`, `getByText`, CSS all pierce open roots | XPath does not pierce. Closed shadow roots are not reachable |
| New tab / popup | `const p = page.waitForEvent('popup'); click; const tab = await p` | Create the promise before the click |
| Hover menus | `hover()` then click the item | The item is in the DOM but hidden until hover |
| Tables | Locate the row (`getByRole('row').filter({ hasText })`), then act inside it | Column positions via `getByRole('cell').nth(i)` are positional: keep them close to the assertion |
| Download | `page.waitForEvent('download')`, then `suggestedFilename()`, `saveAs()` | Same promise-first pattern as popups |
| Keyboard | `press('Enter')`, `press('Control+A')`, `pressSequentially('abc')` | `fill()` sets the value in one go; use `pressSequentially` only when key events matter |
| Drag and drop | `source.dragTo(target)` | Libraries with custom drag logic may need manual `mouse.down/move/up` |

## The pattern behind half of these

Anything the browser does *in response* to your action (popup, download, dialog, file chooser, response) is an event. Start listening first, then act:

```ts
const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: 'Open receipt' }).click();
const receipt = await popupPromise;
```

## Also worth knowing

- `selectOption('Blue')` matches an option's value or its label. `selectOption({ label: 'Blue' })` insists on the label. ([Select options](https://playwright.dev/docs/input#select-options))
- `setInputFiles([])` clears the chosen files. ([Upload files](https://playwright.dev/docs/input#upload-files))
- Right click, double click, modifier keys and a click position are options of `click()`, for example `click({ button: 'right' })`. ([Mouse click](https://playwright.dev/docs/input#mouse-click))
- For drag logic that listens to `dragover`, hover the drop target twice between `mouse.down()` and `mouse.up()`. ([Dragging manually](https://playwright.dev/docs/input#dragging-manually))
- Downloaded files are deleted when the browser context that produced them closes, so save what you need with `download.saveAs()`. ([Downloads](https://playwright.dev/docs/downloads))
- A frame locator is strict as well: it throws if more than one iframe matches. ([FrameLocator](https://playwright.dev/docs/api/class-framelocator))

## Interviewers ask

**How do you handle multiple tabs or windows?**
Each tab is a `Page` inside the same `BrowserContext`. Capture the new one with `page.waitForEvent('popup')` (or `context.waitForEvent('page')`) and keep using both objects. There is no window-handle switching as in Selenium.

Source: [Pages](https://playwright.dev/docs/pages#handling-popups)

**How do you work with iframes?**
With a `FrameLocator`. It scopes locators to the frame's document and still auto-waits, including for the frame to load. Nested frames chain: `page.frameLocator(a).frameLocator(b)`.

Source: [FrameLocator](https://playwright.dev/docs/api/class-framelocator)

**What happens to an `alert()` if the test does nothing?**
Playwright dismisses it automatically so the page does not hang. To accept it, read its message or answer a prompt, add a `dialog` listener before triggering it. If you add a listener, it must accept or dismiss, otherwise the page stays blocked.

Source: [Dialogs](https://playwright.dev/docs/dialogs#alert-confirm-prompt-dialogs)

**How do you upload a file when the input is hidden behind a styled button?**
`setInputFiles` works on hidden inputs too. If the input is created on the fly, wait for the `filechooser` event and call `fileChooser.setFiles()`.

Source: [Actions](https://playwright.dev/docs/input#upload-files)

**How do you test elements inside shadow DOM?**
Normally, with the same locators. Playwright pierces open shadow roots by default. The exceptions are XPath and closed roots.

Source: [Locators](https://playwright.dev/docs/locators#locate-in-shadow-dom)

**How do you verify a download?**
Capture the `download` event, check `suggestedFilename()`, then `saveAs()` or `path()` to read the content and assert on it.

Source: [Downloads](https://playwright.dev/docs/downloads)

### Actions

**Which actions should you know?**
```ts
await loc.click();                         // also dblclick(), click({ button: 'right' }), click({ modifiers: ['Shift'] })
await loc.fill('text');                    // clears, then sets the value in one step
await loc.pressSequentially('abc', { delay: 50 });   // real key events, one per character
await loc.press('Enter');
await loc.clear();
await loc.check();                         // uncheck(), setChecked(true)
await loc.selectOption({ label: 'India' }); // or by value, or an array for multi-select
await loc.hover();
await loc.dragTo(target);
await loc.setInputFiles('file.pdf');
await loc.scrollIntoViewIfNeeded();
```

Source: interview handbook, not checked against documentation.

**`fill` vs `pressSequentially` vs `type`?**
`fill` sets the whole value and fires one `input` event: fast, and right for almost every field. `pressSequentially` sends keydown/keypress/keyup per character: use it when the page reacts to each keystroke (autocomplete, input masks, a search that fires on typing). `type()` is deprecated in favour of these two.

Source: interview handbook, not checked against documentation.

### Hands-on tasks

Small tasks an interviewer may ask you to automate while you share your screen.

**Hands-on: web table: click the button in the row that contains "Ben"**
```ts
const row = page.getByRole('row').filter({ hasText: 'Ben' });
await row.getByRole('button', { name: 'Edit' }).click();
await expect(page.locator('#selected')).toHaveText('Editing Ben');
```

Scope the locator to the row. Never use a hard-coded index like `nth(1)`, because it breaks as soon as the sort order changes.

Source: interview handbook, not checked against documentation.

**Hands-on: web table: read a column, count rows, filter by another column**
```ts
const rows = page.locator('#users tbody tr');
await expect(rows).toHaveCount(3);                               // web-first, so it retries
const names = await rows.locator('td:nth-child(1)').allTextContents();
expect(names).toEqual(['Anna', 'Ben', 'Chen']);

// Find the column by its header text, not by a fixed position
const headers = await page.locator('#users thead th').allTextContents();
const statusCol = headers.indexOf('Status');
const active: string[] = [];
for (const row of await rows.all()) {                            // .all() returns one locator per row
  const cells = row.locator('td');
  if ((await cells.nth(statusCol).textContent()) === 'Active') active.push((await cells.nth(0).textContent())!);
}
expect(active).toEqual(['Anna', 'Chen']);
```

A common follow-up is "check that the table is sorted by name". Read the column, then compare it with a sorted copy: `expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))`.

Source: interview handbook, not checked against documentation.

**Hands-on: dropdowns and checkboxes**
```ts
const country = page.getByLabel('Country');
await country.selectOption({ label: 'India' });   // by visible text
await country.selectOption('fr');                 // by value
await expect(country).toHaveValue('fr');
await page.getByLabel('Accept terms').check();    // check() is idempotent; click() toggles
await expect(page.getByLabel('Accept terms')).toBeChecked();
```

`selectOption` only works on a native `<select>`. A custom dropdown (a React or Material component) is a button that opens a list. Click it, then use `getByRole('option', { name: 'India' }).click()`.

Source: interview handbook, not checked against documentation.

**Hands-on: shadow DOM**
Playwright locators go inside **open** shadow roots automatically, so you don't need special syntax:

```ts
await page.getByRole('button', { name: 'Follow' }).click();   // the button is inside <user-card>'s shadow root
await expect(page.locator('user-card .state')).toHaveText('Following');
```

XPath does *not* reach into shadow DOM, and closed shadow roots can't be reached at all. Selenium needs `getShadowRoot()` and WebdriverIO needs `shadow$()`. This makes a good comparison point in an interview.

Source: interview handbook, not checked against documentation.

**Hands-on: data-driven (parameterised) tests**
Generate one test per data row so that each shows up and fails separately in the report:

```ts
const searches = [
  { term: 'sh', expected: '3 results' },
  { term: 'hat', expected: '1 results' },
  { term: 'xyz', expected: '0 results' },
];
for (const { term, expected } of searches) {
  test(`search "${term}" shows ${expected}`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search').fill(term);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.locator('#results')).toHaveText(expected);
  });
}
```

Data can come from a JSON file (`import data from './data/search.json'`) or a CSV parsed at the top of the file with `fs.readFileSync` plus a CSV parser. The test titles must be unique. Don't loop *inside* a single test: the first failure stops the loop, and you lose the other results.

Source: interview handbook, not checked against documentation.

**Hands-on: run against different environments**
```ts
// playwright.config.ts
import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.TEST_ENV ?? 'staging'}` });
export default defineConfig({ use: { baseURL: process.env.BASE_URL } });
// Run: TEST_ENV=prod npx playwright test --grep @smoke
```

Keep secrets in CI variables, not in committed `.env` files.

Source: interview handbook, not checked against documentation.

**Hands-on: control time**
(banners, expiry, "today" labels, countdowns):

```ts
await page.clock.setFixedTime(new Date('2026-12-24T10:00:00Z'));   // call before page.goto
await page.goto('/');
await expect(page.locator('#today')).toHaveText('Today: 2026-12-24');
// page.clock.install() + page.clock.fastForward('05:00') to skip 5 minutes of timers
```

Source: interview handbook, not checked against documentation.

**Hands-on: seed localStorage or cookies before the app starts**
```ts
await page.addInitScript(() => localStorage.setItem('theme', 'dark'));   // runs before any page script
await context.addCookies([{ name: 'consent', value: 'yes', url: 'https://app.example.com' }]);
```

Use this to skip cookie banners and onboarding, or to test feature flags.

Source: interview handbook, not checked against documentation.

**Hands-on: two users in one test**
(for chat, approvals, or permissions):

```ts
const adminCtx = await browser.newContext({ storageState: 'auth/admin.json' });
const viewerCtx = await browser.newContext({ storageState: 'auth/viewer.json' });
const admin = await adminCtx.newPage();
const viewer = await viewerCtx.newPage();
// admin publishes → viewer sees it; each context has separate cookies and storage
```

Source: interview handbook, not checked against documentation.

**Hands-on: mock a response to force an edge case, and wait for a specific call**
```ts
await page.route('**/api/search*', route => route.fulfill({ json: { items: Array(50).fill('x') } }));
const [response] = await Promise.all([
  page.waitForResponse('**/api/search*'),                 // start waiting BEFORE the click
  page.getByRole('button', { name: 'Search' }).click(),
]);
expect(response.status()).toBe(200);
```

Why `Promise.all`? If you click first and wait afterwards, the response can arrive before you start listening, and the test hangs until it times out.

Source: interview handbook, not checked against documentation.

**Hands-on: hover menus, keyboard, infinite scroll, permissions, console errors, broken links, WebSockets**
- **Hover menu:** `await page.getByRole('menuitem', { name: 'Account' }).hover()`, then click the item underneath.
- **Keyboard:** `await page.keyboard.press('Control+A')`; `await locator.press('Enter')`.
- **Infinite scroll:** scroll the last item into view in a loop (`await items.last().scrollIntoViewIfNeeded()`) until `toHaveCount(n)` passes, or call the paginated API directly.
- **Browser permissions:** `browser.newContext({ geolocation: { latitude: 53.55, longitude: 9.99 }, permissions: ['geolocation'] })`.
- **Console errors as a quality gate:** `const errors: string[] = []; page.on('console', m => m.type() === 'error' && errors.push(m.text())); // … run the journey … expect(errors).toEqual([]);`
- **Broken links:** collect `href`s with `locator('a').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href))`, then call `request.head(url)` on each and assert the status is below 400.
- **WebSockets:** listen with `page.on('websocket', ws => ws.on('framereceived', f => …))`, or mock them with `page.routeWebSocket()`.

Source: interview handbook, not checked against documentation.
