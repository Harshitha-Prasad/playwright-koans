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

### Fundamentals

**Basic types?**
`string, number, boolean, bigint, symbol, null, undefined, object, unknown, any, never, void`, arrays (`string[]` / `Array<string>`), tuples (`[string, number]`), enums (prefer union of string literals), literal types (`'GET' | 'POST'`).

Source: [TypeScript: Documentation - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html), [TypeScript: Documentation - More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html#other-types-to-know-about)

**`any` vs `unknown` vs `never`?**
`any` disables type checking, avoid; it silently spreads. `unknown` is the safe top type: you must narrow before use (ideal for parsed JSON or caught errors). `never` is the bottom type: functions that never return, exhausted unions, used in exhaustive `switch` checks.

Source: [TypeScript: Documentation - More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown), [TypeScript: Documentation - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)

**Type inference, when to annotate?**
TS infers most local variables and return types. Annotate function parameters, public API/return types of shared helpers, and anything where inference would widen (e.g. `const method = 'GET'` infers `'GET'`, but `let method = 'GET'` infers `string`; use `as const` for literals).

Source: [TypeScript: Documentation - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-inference), and checked by running the code.

**Optional (`?`), readonly, and index signatures?**
`name?: string` → `string | undefined`. `readonly id: number` prevents reassignment. `[key: string]: unknown` allows arbitrary keys; `Record<string, T>` is a shorter way to write the same type.

Source: [TypeScript: Documentation - Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html), and checked by running the code.

**Union and intersection types, discriminated unions?**
`A | B` either; `A & B` both. Discriminated union uses a shared field with literal types for safe narrowing:

```ts
type ApiResult = { ok: true; data: User } | { ok: false; error: string };
function handle(r: ApiResult) { if (r.ok) r.data; else r.error; }
```

Source: [TypeScript: Documentation - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions), and checked by running the code.

**Type narrowing, list the mechanisms**
`typeof`, `instanceof`, `in`, equality checks, truthiness, discriminated unions, user-defined type guards (`x is Foo`), assertion functions (`asserts x is Foo`). Essential for handling `unknown` API payloads and caught errors (`catch (e: unknown)`).

Source: [TypeScript: Documentation - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

**Type assertions (`as`) vs type guards, when is `as` dangerous?**
`as` tells the compiler to trust you with no runtime check; wrong assertions are silent bugs. Prefer guards or validation (zod) for external data. `as const` and `!` (non-null assertion) are the common acceptable uses, and `!` should be rare in test code.

Source: [TypeScript: Documentation - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)

### Advanced typing

**`keyof`, indexed access types and mapped types?**
`keyof User` = union of keys. `User['email']` = type of that property. Mapped: `{ [K in keyof T]?: T[K] }` is how `Partial` is built. Use them to type generic page-object helpers and config objects.

Source: [TypeScript: Documentation - Keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html), [TypeScript: Documentation - Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html), [TypeScript: Documentation - Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)

**Conditional types and `infer`?**
`T extends U ? X : Y`. `infer` extracts types, e.g. `type ElementOf<T> = T extends (infer U)[] ? U : never`. Know they exist and what `Awaited` does; you rarely write them in test code.

Source: [TypeScript: Documentation - Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types), and checked by running the code.

**Template literal types?**
``type Route = `/api/${string}`;`` constrains strings by pattern. Useful for typed endpoints or test tags.

Source: [TypeScript: Documentation - Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html), and checked by running the code.

**Declaration merging and module augmentation, where does Playwright rely on it?**
Adding to an existing interface from another file. Playwright mostly avoids it: `expect.extend()` returns a new `expect` that is already typed with your custom matchers, and custom fixtures are typed through `test.extend<{ ... }>()` generics. The older way to type matchers was to add to the global `PlaywrightTest.Matchers` interface with `declare global`.

Source: [TypeScript: Documentation - Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html), [Assertions | Playwright](https://playwright.dev/docs/test-assertions#add-custom-matchers-using-expectextend)

**What are `.d.ts` files and `@types/*` packages?**
Type declaration files describe the types of JS libraries. DefinitelyTyped supplies `@types/node`, etc. Playwright ships its own types. If a library has no types you can write a minimal `declare module 'lib';`.

Source: [TypeScript: Documentation - Type Declarations](https://www.typescriptlang.org/docs/handbook/2/type-declarations.html), [TypeScript: Documentation - TypeScript 2.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#shorthand-ambient-module-declarations)

**Structural typing, what is it and what surprise does it cause?**
TS compares shapes, not names ("duck typing"). Two unrelated interfaces with the same fields are interchangeable. Excess property checks only apply to object *literals*, so a wider object assigned via a variable is accepted.

Source: [TypeScript: Documentation - Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)

**How would you type test data builders?**
```ts
const buildUser = (overrides: Partial<User> = {}): User =>
  ({ id: crypto.randomUUID(), email: `u${Date.now()}@test.io`, role: 'member', ...overrides });
```

Combine with `satisfies` to check literal objects against a type without widening.

Source: [TypeScript: Documentation - Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype), and checked by running the code.

### Configuration and tooling

**What does `tsconfig.json` control? Key options for a test repo?**
`target`, `module`, `moduleResolution`, `strict` (on by default since TypeScript 6.0, keep it on), `resolveJsonModule`, `paths` for aliases like `@pages/*` (`baseUrl` is deprecated in 6.0 and removed in 7.0), `include`/`exclude`, `types`. Playwright transpiles TS itself (no separate build needed), but type errors are only caught if you run `tsc --noEmit`, put that in CI.

Source: [TypeScript: TSConfig Reference - Docs on every TSConfig option](https://www.typescriptlang.org/tsconfig/), [TypeScript: Documentation - TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html), [TypeScript | Playwright](https://playwright.dev/docs/test-typescript)

**How do TS errors differ from ESLint errors?**
`tsc` checks types; ESLint checks patterns/style, and with `typescript-eslint` can use type info for rules like `no-floating-promises`, `no-misused-promises`, `await-thenable`. Both belong in CI.

Source: [Overview | typescript-eslint](https://typescript-eslint.io/rules/), [Best Practices | Playwright](https://playwright.dev/docs/best-practices#lint-your-tests)

**How do you type environment variables and config safely?**
Parse `process.env` once at startup into a typed object; validate with zod or manual checks; fail fast if missing. Never sprinkle `process.env.X!` across the code.

Source: experience, not documentation.

### TypeScript in Playwright

**What is the risk of over-typing test code?**
Complex generic gymnastics reduce readability and slow onboarding. Test code should be boring: explicit, small types, clear names. Type precision where it prevents real bugs (fixtures, data builders, API contracts), simplicity elsewhere.

Source: experience, not documentation.
