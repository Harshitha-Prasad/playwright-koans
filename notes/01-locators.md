# 01 · Locators

Koans: `koans/01-locators.spec.ts` · Page: `/locators.html` · Run: `npm run koan -- 01-locators`

## The idea in six lines

- A locator is a **description** of how to find an element, not a reference to one. It is resolved again every time it is used, so there is no "stale element".
- Prefer what the user perceives. The order Playwright recommends: `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, then `getByTestId`. CSS and XPath come last.
- **Strict mode**: an action on a locator that matches more than one element throws instead of guessing.
- Narrow down by chaining (`list.getByRole('listitem')`) and filtering (`.filter({ hasText })`, `.filter({ has: otherLocator })`). `first()`, `last()` and `nth()` exist, but they encode position, which is what you were trying to avoid.
- `getByText` matches substrings and ignores case by default. `{ exact: true }` turns that off.
- CSS and the `getBy*` locators see into open shadow DOM. XPath does not.

## Finding a good locator fast

```bash
npx playwright codegen http://localhost:4173/locators.html   # record and copy locators
npm run ui                                                    # "Pick locator" in UI mode
```

## Also worth knowing

- **Whitespace is normalised.** Text matching turns runs of spaces and line breaks into one space and ignores leading and trailing whitespace, even with `exact: true`. A regular expression works too: `getByText(/welcome, [a-z]+$/i)`. ([Locate by text](https://playwright.dev/docs/locators#locate-by-text))
- **`getByText` is for non-interactive elements** such as `div`, `span` and `p`. For buttons, links and inputs the documentation recommends role locators. ([Locate by text](https://playwright.dev/docs/locators#locate-by-text))
- **The locator inside `has` is relative.** It is matched starting from each outer element, not from the top of the page. ([Filter by child](https://playwright.dev/docs/locators#filter-by-childdescendant))
- **`or()` can break strict mode.** If both alternatives are on the page, the combined locator matches two elements. The documentation's example adds `.first()`. ([Matching one of two locators](https://playwright.dev/docs/locators#matching-one-of-the-two-alternative-locators))
- **Only visible matches:** `locator.filter({ visible: true })`. The documentation adds that a more precise locator is usually the better fix. ([Matching only visible elements](https://playwright.dev/docs/locators#matching-only-visible-elements))
- **Closed shadow roots** cannot be reached by any locator. ([Locate in shadow DOM](https://playwright.dev/docs/locators#locate-in-shadow-dom))

## Interviewers ask

**Why is `getByRole` preferred over CSS or XPath?**
It targets the accessibility tree: the role and the accessible name, which is what users and assistive technology see. It survives refactors of class names and DOM structure, and a test that cannot find a button by role is often pointing at a real accessibility problem.

Source: [Locators](https://playwright.dev/docs/locators#locate-by-role)

**What is the difference between a Locator and an ElementHandle (`page.$`)?**
An ElementHandle points at one specific DOM node and becomes useless if the framework re-renders it. A Locator re-queries on every use and comes with auto-waiting. ElementHandles are discouraged for new code.

Source: [Handles](https://playwright.dev/docs/handles#locator-vs-elementhandle)

**What is strict mode and how do you resolve a violation?**
If a locator used for an action matches several elements, Playwright throws and lists them. Fix it by making the locator more specific: scope it to a parent, filter by text or by a child element, or use a more precise role and name. Reaching for `.first()` hides the ambiguity rather than resolving it.

Source: [Locators](https://playwright.dev/docs/locators#strictness)

**How do you deal with dynamic ids or generated class names?**
Ignore them. Use role and name, label, visible text or a relationship ("the row that contains Grace"). If nothing stable exists, agree on a `data-testid` with the developers.

Source: [Best Practices](https://playwright.dev/docs/best-practices#prefer-user-facing-attributes-to-xpath-or-css-selectors)

**When are test ids the right choice?**
When an element has no stable user-facing handle: icons without labels, canvas wrappers, repeated layout containers. The attribute name is configurable with `testIdAttribute` in the config.

Source: [Locators](https://playwright.dev/docs/locators#locate-by-test-id)

**`locator.count()` vs `expect(locator).toHaveCount()`?**
`count()` returns the number right now. `toHaveCount()` retries until the number matches or the timeout expires. Module 02 is about exactly this difference.

Source: [Locator](https://playwright.dev/docs/api/class-locator#locator-count)

**How do you combine conditions?**
`locator.and(other)` for "both", `locator.or(other)` for "either", `filter({ hasNot })` and `filter({ hasNotText })` for exclusions.

Source: [Locators](https://playwright.dev/docs/locators#locator-operators)

### More on locators

**Name the built-in locators and when you use each**
| Locator | Finds by | Typical use |
| --- | --- | --- |
| `getByRole(role, { name })` | ARIA role and accessible name | Buttons, links, headings, checkboxes, rows, dialogs. First choice. |
| `getByLabel(text)` | `<label>`, `aria-label`, `aria-labelledby` | Form fields |
| `getByPlaceholder(text)` | `placeholder` attribute | Inputs that have no label |
| `getByText(text)` | Visible text content | Non-interactive text: messages, paragraphs, spans |
| `getByAltText(text)` | `alt` attribute | Images |
| `getByTitle(text)` | `title` attribute | Icons and badges with a tooltip |
| `getByTestId(id)` | `data-testid` (configurable) | Anything with no stable user-facing handle |
| `locator(css or xpath)` | CSS or XPath | Last resort, and for scoping to a container |

```ts
await page.getByRole('heading', { name: 'Shift planner', level: 1 });
await page.getByLabel('Email address').fill('a@b.de');
await page.getByPlaceholder('name@example.com');
await page.getByText('Order shipped today');
await page.getByAltText('Company logo');
await page.getByTitle('Unread messages');
await page.getByTestId('submit-order');
await page.locator('#users tbody tr');
```

Source: [Locators](https://playwright.dev/docs/locators#quick-guide), and checked by running the code.

**How does `getByRole` work? Where does the role come from?**
Most roles are implicit: they come from the HTML element, with no `role` attribute needed.

| HTML | Role |
| --- | --- |
| `<button>`, `<input type="submit">` | `button` |
| `<a href>` | `link` (an `<a>` without `href` has no link role) |
| `<input type="text">`, `email`, `<textarea>` | `textbox` |
| `<input type="search">` | `searchbox` |
| `<input type="checkbox">` / `radio` | `checkbox` / `radio` |
| `<select>` | `combobox` |
| `<h1>`–`<h6>` | `heading` (use `level`) |
| `<ul>`/`<ol>`, `<li>` | `list`, `listitem` |
| `<table>`, `<tr>`, `<th>`, `<td>` | `table`, `row`, `columnheader`, `cell` |
| `<nav>`, `<main>`, `<dialog>`, `<img alt>` | `navigation`, `main`, `dialog`, `img` |

Two things checked on the test page: `getByRole('textbox')` also matched `<input type="password">`, and it did not match `<input type="search">`, which needs `getByRole('searchbox')`.

The **accessible name** is what a screen reader announces. It comes from, in order: `aria-labelledby`, `aria-label`, the associated `<label>` (for inputs), the element's text content (for buttons, links, headings), then `alt` / `title`. So an icon-only button `<button aria-label="Close dialog">X</button>` is `getByRole('button', { name: 'Close dialog' })`, not `name: 'X'`.

Options worth knowing:

```ts
page.getByRole('button', { name: 'Save', exact: true });
page.getByRole('checkbox', { checked: true });
page.getByRole('button', { name: 'Filters', expanded: false });
page.getByRole('button', { name: 'Archive', disabled: true });
page.getByRole('heading', { level: 2 });
page.getByRole('button', { name: 'Save', includeHidden: true });   // hidden elements are skipped by default
```

Others: `pressed`, `selected`. A div with a click handler has no role. `getByRole` will not find it, and that is a bug to report as well as a locator problem.

Source: [Locators](https://playwright.dev/docs/locators#locate-by-role), [Page](https://playwright.dev/docs/api/class-page#page-get-by-role), and checked by running the code.

**How does text matching work? What does `exact` do?**
This is the question candidates most often get backwards. The same rules apply to `getByText`, `getByLabel`, `getByPlaceholder`, `getByTitle`, `getByAltText` and the `name` option of `getByRole`.

| You pass | Matching |
| --- | --- |
| A string | **Substring, case-insensitive**, whitespace normalised |
| A string with `{ exact: true }` | **Whole string, case-sensitive**, whitespace still normalised |
| A regular expression | Whatever the regex says |

Results on a page with `<span>Log in</span>` and `<span>Log in with Google</span>`:

```ts
page.getByText('log in');                    // 2 matches: substring, any case
page.getByText('Log in', { exact: true });   // 1 match
page.getByText('log in', { exact: true });   // 0 matches: exact is case-sensitive
page.getByText(/^log in$/i);                 // 1 match: whole string, any case
```

"Whitespace normalised" means line breaks and repeated spaces in the HTML collapse to one space, so `getByText('Order shipped today')` finds text that is split across lines in the source.

`getByText` returns the smallest element that contains the text. Use it for non-interactive content. For a button with that text, `getByRole('button', { name })` is better because it also proves the thing is a button.

Source: [Locators](https://playwright.dev/docs/locators#locate-by-text), [Page](https://playwright.dev/docs/api/class-page#page-get-by-text), and checked by running the code.

**CSS and XPath: when are they acceptable?**
`page.locator()` takes CSS or XPath. Playwright detects XPath when the string starts with `//` or `..`; you can also write the `css=` or `xpath=` prefix.

```ts
page.locator('#users tbody tr');
page.locator('[data-state="open"]');
page.locator('//table[@id="users"]//tr[td[text()="Ben"]]//button');
```

Acceptable uses: scoping to a container by a stable id, matching a state attribute, third-party widgets you can't change, legacy pages with no semantics. Avoid long structural chains (`div > div:nth-child(3) > span`) and generated class names.

Playwright adds its own CSS pseudo-classes: `:has-text("…")`, `:text("…")`, `:text-is("…")`, `:visible`, `:has(…)`, plus the `nth=1` selector (`button >> nth=1`). They work, but the locator methods (`filter`, `getByText`) do the same job and read better.

Two XPath limits to mention: it does not pierce shadow DOM (checked: the XPath for a shadow button found 0 elements, `getByRole` and CSS found it), and it is the most brittle option when the DOM changes.

Source: [Other locators](https://playwright.dev/docs/other-locators#xpath-locator), and checked by running the code.

**List all the `filter` options**
| Option | Keeps elements that… |
| --- | --- |
| `hasText: 'x'` or regex | contain the text somewhere inside |
| `hasNotText: 'x'` | do not contain the text |
| `has: locator` | contain a descendant matching the locator |
| `hasNot: locator` | contain no such descendant |
| `visible: true` | are visible (added in 1.51) |

```ts
await expect(items.filter({ hasNotText: 'Out of stock' })).toHaveCount(2);
await expect(items.filter({ hasNot: page.getByText('Out of stock') })).toHaveCount(2);
await expect(page.locator('button').filter({ hasText: 'Save', visible: true })).toHaveCount(1);
items.filter({ hasText: 'In stock' }).filter({ hasText: 'Product 3' });   // filters chain: AND
```

The locator passed to `has` is resolved relative to the element being filtered, not the whole page.

Source: [Locator](https://playwright.dev/docs/api/class-locator#locator-filter), and checked by running the code.

**`and()`, `or()`, `first()`, `nth()`, `last()`?**
```ts
// and: one element that matches both
page.getByRole('button', { name: 'Place order' }).and(page.getByTestId('submit-order'));

// or: either one. Useful when the UI differs by state or A/B variant
const cta = page.getByRole('button', { name: 'Place order' }).or(page.getByRole('button', { name: 'Buy now' }));
await expect(cta).toBeVisible();
```

`or()` is still strict: if both alternatives are on the page at once it throws, so add `.first()` in that case. `nth()` is zero-based. Positional locators are a smell unless the position is what you are testing.

Source: [Locators](https://playwright.dev/docs/locators#locator-operators), and checked by running the code.

**How do you work with a list of elements?**
```ts
await expect(items).toHaveCount(3);                         // retries until 3
const n = await items.count();                              // one reading, no wait
const titles = await items.getByRole('heading').allTextContents();
for (const li of await items.all()) {                       // one locator per element
  await expect(li.getByRole('button')).toBeEnabled();
}
```

The trap: `count()`, `all()` and `allTextContents()` do not wait. Checked on a page where an alert appears after 800 ms: `all()` returned an empty array straight away. Wait for the list first with `await expect(items).toHaveCount(3)` or `await expect(items.first()).toBeVisible()`, then read it.

To assert the texts of a whole list in one retrying step: `await expect(items.getByRole('heading')).toHaveText(['Product 1', 'Product 2', 'Product 3'])`.

Source: [Locators](https://playwright.dev/docs/locators#lists), [Locator](https://playwright.dev/docs/api/class-locator#locator-all), and checked by running the code.

**How do you get from a child to its parent or a sibling?**
Prefer to start from the parent and filter it by the child:

```ts
page.getByRole('listitem').filter({ has: page.getByText('Out of stock') });
```

If you must go up, XPath `..` works on any locator: `page.getByText('Out of stock').locator('..')`. Playwright has no `parent()` or `sibling()` method. For a sibling, locate the shared container and then the other child.

Source: [Other locators](https://playwright.dev/docs/other-locators#parent-element-locator), and checked by running the code.

**A locator works locally and times out in CI. What do you check?**
Open the trace, go to the failing action and read the call log: it says whether the element was not found, found but not visible, not stable, or covered by another element ("… intercepts pointer events"). Then the DOM snapshot shows what was on screen. Usual causes: a different viewport (the desktop menu collapsed into a hamburger), another locale or translated text, a cookie or consent overlay, slower data loading so the list was still empty, different test data, a feature flag. This connects straight to your daily triage: real bug vs script issue vs dependent service.

Source: [Trace viewer](https://playwright.dev/docs/trace-viewer#trace-viewer-features)
