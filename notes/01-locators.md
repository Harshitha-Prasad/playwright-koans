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

## Interviewers ask

**Why is `getByRole` preferred over CSS or XPath?**
It targets the accessibility tree: the role and the accessible name, which is what users and assistive technology see. It survives refactors of class names and DOM structure, and a test that cannot find a button by role is often pointing at a real accessibility problem.

**What is the difference between a Locator and an ElementHandle (`page.$`)?**
An ElementHandle points at one specific DOM node and becomes useless if the framework re-renders it. A Locator re-queries on every use and comes with auto-waiting. ElementHandles are discouraged for new code.

**What is strict mode and how do you resolve a violation?**
If a locator used for an action matches several elements, Playwright throws and lists them. Fix it by making the locator more specific: scope it to a parent, filter by text or by a child element, or use a more precise role and name. Reaching for `.first()` hides the ambiguity rather than resolving it.

**How do you deal with dynamic ids or generated class names?**
Ignore them. Use role and name, label, visible text or a relationship ("the row that contains Grace"). If nothing stable exists, agree on a `data-testid` with the developers.

**When are test ids the right choice?**
When an element has no stable user-facing handle: icons without labels, canvas wrappers, repeated layout containers. The attribute name is configurable with `testIdAttribute` in the config.

**`locator.count()` vs `expect(locator).toHaveCount()`?**
`count()` returns the number right now. `toHaveCount()` retries until the number matches or the timeout expires. Module 02 is about exactly this difference.

**How do you combine conditions?**
`locator.and(other)` for "both", `locator.or(other)` for "either", `filter({ hasNot })` and `filter({ hasNotText })` for exclusions.
