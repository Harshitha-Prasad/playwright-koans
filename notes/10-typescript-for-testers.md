# 10 · TypeScript for testers

Practice: the "Does it compile?" exercises on the website · Koans: the last test in `koans/00-js-ts-essentials.spec.ts`

Note 00 covers the JavaScript that TypeScript is built on. This note is about the part that only exists at compile time: types.

## The idea in six lines

- TypeScript is JavaScript plus a type checker. The types are removed before the code runs, so they cost nothing at runtime and protect nothing at runtime either.
- The checker's value in a test framework: typos in option names, wrong test data shapes, forgotten `await` on a used value and missing cases are found while you type, not in a pipeline twenty minutes later.
- **Unions** (`'passed' | 'failed'`) describe "one of these". **Narrowing** (`typeof`, `in`, equality checks) tells the compiler which one you have.
- **Generics** let a helper keep the caller's type: `first<T>(items: T[]): T | undefined`.
- **Utility types** build new types from old ones: `Partial`, `Pick`, `Omit`, `Record`, `Readonly`, `ReturnType`.
- `strict: true` in `tsconfig.json` is what makes `null` and `undefined` visible to the checker. Without it, most of the safety is switched off.

## Cheat sheet

```ts
// Shapes
interface Order { id: number; item: string; note?: string }      // note is optional
type Status = 'queued' | 'brewing' | 'done';                     // union of literals

// Test data builder with overrides
const buildOrder = (overrides: Partial<Order> = {}): Order => ({ id: 1, item: 'Latte', ...overrides });

// One definition, both a runtime list and a type
const ROLES = ['admin', 'barista', 'guest'] as const;
type Role = (typeof ROLES)[number];                              // 'admin' | 'barista' | 'guest'

// Lookup table that must cover every key
const baseUrl: Record<'dev' | 'staging', string> = { dev: 'http://localhost:4173', staging: 'https://staging.example.com' };

// Checked against a type without widening to it: the keys stay known, the values are still number
const timeouts = { action: 3_000, test: 15_000 } satisfies Record<string, number>;

// Typed API response
const order: Order = await (await request.get('/api/orders/1')).json();   // json() returns any: the annotation is a promise you make, not a check
```

## Interviewers ask

**Why use TypeScript for test automation at all?**
Autocomplete and inline documentation for the Playwright API, compile-time detection of wrong arguments and misspelled properties, safer refactoring of page objects and fixtures, and test data whose shape is checked against the types the application uses. The cost is a compile step and some learning, both small.

Source: experience, not documentation.

**What are utility types, and which do you use in tests?**
Built-in generic types that transform other types. `Partial<T>` for overrides in data builders, `Pick<T, K>` and `Omit<T, K>` for request payloads that are subsets of a model, `Record<K, V>` for lookup tables, `Readonly<T>` for shared constants, `ReturnType<typeof fn>` to reuse the type of a helper's result.

Source: [TypeScript: Documentation - Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

**What is a generic? Give an example from a test framework.**
A type parameter that lets a function or class work with many types while keeping them connected. Playwright's `test.extend<{ menuPage: MenuPage }>()` is one: the fixture types you pass in become the types of the arguments your tests receive.

Source: [TypeScript: Documentation - Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

**Enum or union of string literals?**
A union of literals is usually the better choice: no runtime code, values read naturally in logs and reports, and it combines well with `as const`. Enums are fine where a team already uses them, but they generate code and a numeric enum accepts any value of type `number`.

Source: [TypeScript: Handbook - Enums](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums)

**What is the difference between `as` and `satisfies`?**
`as` is an assertion: you tell the compiler to trust you, and it mostly does, even when you are wrong. `satisfies` is a check: the compiler verifies the value fits the type and keeps the value's own precise type. Prefer `satisfies` or a plain annotation, and treat `as` as a warning sign in review.

Source: [TypeScript: Documentation - TypeScript 4.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)

**What does the `!` after an expression mean?**
The non-null assertion: "this is not null or undefined, trust me". It silences the checker without adding a runtime check, so if you are wrong the test fails later with a less helpful error. An explicit check with a clear error message is better in most cases.

Source: [TypeScript: Documentation - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#non-null-assertion-operator-postfix-)

**Does a type annotation on an API response validate the response?**
No. `response.json()` returns `any`, and annotating it only tells the compiler what you expect. To verify the real payload you need a runtime check: assertions on the fields, or a schema validator such as zod whose schema also produces the type.

Source: [APIResponse | Playwright](https://playwright.dev/docs/api/class-apiresponse#api-response-json)

**What does `strict` mode change?**
It turns on a family of checks, the most important being `strictNullChecks` (null and undefined must be handled) and `noImplicitAny` (untyped parameters are errors). New projects should start with it on.

Source: [TypeScript: TSConfig Reference - Docs on every TSConfig option](https://www.typescriptlang.org/tsconfig/#strict)

**How do you type a page object and its fixture?**
The class takes a `Page` in its constructor and exposes `Locator` properties and async methods. The fixture declares its type in `test.extend<{ menuPage: MenuPage }>`, and from then on every test that asks for `menuPage` gets a fully typed object. Module 04 of the koans builds exactly this.

Source: [Fixtures | Playwright](https://playwright.dev/docs/test-fixtures)

**Playwright runs `.ts` files directly. So who checks the types?**
Nobody, unless you ask. Playwright strips the types and runs the JavaScript. Add `tsc --noEmit` as a script and run it in CI before the tests.

Source: [TypeScript | Playwright](https://playwright.dev/docs/test-typescript)
