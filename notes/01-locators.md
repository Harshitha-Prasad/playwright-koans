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
