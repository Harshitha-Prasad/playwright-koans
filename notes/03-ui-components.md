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
