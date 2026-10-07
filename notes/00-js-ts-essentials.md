# 00 · JavaScript & TypeScript essentials

Koans: `koans/00-js-ts-essentials.spec.ts` · Run: `npm run koan -- 00-js`

## The idea in six lines

- Playwright drives a browser that lives in another process, so almost every call returns a **promise**. `await` pauses the surrounding `async` function until that promise settles.
- An `async` function *always* returns a promise. Leave out `await` and you hold the promise, not the value, while the test carries on without waiting.
- Order of execution: synchronous code, then promise callbacks (microtasks), then timers (macrotasks).
- `Promise.all` runs things concurrently and rejects on the first failure. `Promise.allSettled` waits for everything and reports each outcome.
- `try/catch` only catches a rejection that is **awaited inside** the `try` block.
- TypeScript types disappear at runtime. Playwright runs `.ts` files directly but does **not** type-check them: that is what `npm run typecheck` (`tsc --noEmit`) is for.

## Things worth typing out once

```ts
// Sequential: 2 round trips, one after the other
const a = await getA();
const b = await getB();

// Concurrent: both start immediately
const [a, b] = await Promise.all([getA(), getB()]);

// ?? only falls back on null/undefined; || falls back on anything falsy (0, '', false)
const tip = order.tip ?? 1;
```

## Interviewers ask

**What happens if you forget `await` in front of `page.click()`?**
The click is started but the test does not wait for it. The next line runs immediately, so later steps race against it. Typical symptoms: an assertion that fails intermittently, or an error such as "Target page, context or browser has been closed" after the test has already ended. The lint rule `@typescript-eslint/no-floating-promises` catches it.

**Why does `expect(locator).toBeVisible()` need `await` when `expect(2).toBe(2)` does not?**
The first is a web-first assertion: it polls the page until the condition holds or the timeout expires, which is asynchronous. The second compares two values that already exist.

**`Promise.all` vs `allSettled` vs `race` vs `any`?**
`all`: resolves with every result, rejects as soon as one rejects. `allSettled`: never rejects, gives `{status, value | reason}` per promise. `race`: settles with whichever promise settles first, success or failure. `any`: resolves with the first success, rejects only if all fail.

**Why is `forEach` with an async callback a bug?**
`forEach` ignores the promises its callback returns. Use `for...of` with `await` for sequential work, or `await Promise.all(items.map(async ...))` for concurrent work.

**`interface` or `type`?**
Both describe object shapes. Interfaces can be extended and merged across declarations. Type aliases can also name unions, tuples and mapped types. A common convention: `interface` for object shapes you expect to extend, `type` for everything else.

**`any` vs `unknown`?**
`any` switches type checking off. `unknown` accepts any value but makes you narrow it (with `typeof`, `in`, a type guard) before you use it.

**Does Playwright type-check my tests?**
No. It strips the types and runs the JavaScript. A type error only fails the build if you run `tsc --noEmit` yourself, usually as a CI step before the tests.
