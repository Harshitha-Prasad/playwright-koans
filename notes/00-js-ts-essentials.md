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

Source: [async function - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)

**Why does `expect(locator).toBeVisible()` need `await` when `expect(2).toBe(2)` does not?**
The first is a web-first assertion: it polls the page until the condition holds or the timeout expires, which is asynchronous. The second compares two values that already exist.

Source: [Assertions | Playwright](https://playwright.dev/docs/test-assertions)

**`Promise.all` vs `allSettled` vs `race` vs `any`?**
`all`: resolves with every result, rejects as soon as one rejects. `allSettled`: never rejects, gives `{status, value | reason}` per promise. `race`: settles with whichever promise settles first, success or failure. `any`: resolves with the first success, rejects only if all fail.

Source: [Promise - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#promise_concurrency)

**Why is `forEach` with an async callback a bug?**
`forEach` ignores the promises its callback returns. Use `for...of` with `await` for sequential work, or `await Promise.all(items.map(async ...))` for concurrent work.

Source: [Array.prototype.forEach() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)

**`interface` or `type`?**
Both describe object shapes. Interfaces can be extended and merged across declarations. Type aliases can also name unions, tuples and mapped types. A common convention: `interface` for object shapes you expect to extend, `type` for everything else.

Source: [TypeScript: Documentation - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)

**`any` vs `unknown`?**
`any` switches type checking off. `unknown` accepts any value but makes you narrow it (with `typeof`, `in`, a type guard) before you use it.

Source: [TypeScript: Documentation - More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown)

**Does Playwright type-check my tests?**
No. It strips the types and runs the JavaScript. A type error only fails the build if you run `tsc --noEmit` yourself, usually as a CI step before the tests.

Source: [TypeScript | Playwright](https://playwright.dev/docs/test-typescript)

### More on asynchronous JavaScript

**Is JavaScript single-threaded? Then how is it asynchronous?**
The main thread runs one call stack. Async work (timers, I/O, network) is delegated to the runtime (browser/libuv); completions are queued and processed by the **event loop** when the stack is empty. Concurrency without parallelism (Worker threads aside).

Source: [JavaScript execution model - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model), [The Node.js Event Loop | Node.js](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)

**Explain the event loop, macrotasks and microtasks**
Macrotask queue: `setTimeout`, `setInterval`, I/O, UI events. Microtask queue: promise callbacks, `queueMicrotask`, `MutationObserver`. After each macrotask, *all* microtasks run before the next macrotask. Classic quiz:

```js
console.log('a');
setTimeout(() => console.log('b'), 0);
Promise.resolve().then(() => console.log('c'));
console.log('d');   // a d c b
```

Source: [Using microtasks in JavaScript with queueMicrotask() - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide), and checked by running the code.

**What is a Promise? States?**
An object representing a future value. States: pending → fulfilled (resolved with value) or rejected (with reason). Once settled it cannot change. `.then`, `.catch`, `.finally` chain and return new promises.

Source: [Promise - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

**Promise chaining vs nesting, why chain?**
Chaining returns promises from `.then` to flatten; nesting recreates callback hell and loses error propagation. A rejected promise skips to the next `.catch`.

Source: [Using promises - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)

**`async`/`await`, what does it compile down to?**
Syntax over promises. `async` functions always return a promise. `await` pauses the function (not the thread) until the promise settles, resuming in a microtask. Errors become exceptions catchable with `try/catch`.

Source: [async function - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function), [await - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)

**Sequential vs parallel async in a loop?**
`forEach` does not await callbacks, use `for...of` with `await` for sequential, or `Promise.all(items.map(async ...))` for parallel. Know when parallel is unsafe (rate limits, shared state).

Source: [Array.prototype.forEach() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach), and checked by running the code.

**How does error handling work across async boundaries?**
Errors inside an `async` function reject its promise. Errors in a callback passed to `setTimeout` are *not* caught by a surrounding `try/catch`. `unhandledrejection` events / Node's `process.on('unhandledRejection')` are the last resort. In tests: always `await` and let the runner catch; wrap only where you need custom messages.

Source: [Window: unhandledrejection event - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event), [Process | Node.js documentation](https://nodejs.org/api/process.html#event-unhandledrejection), and checked by running the code.

**Write a retry helper with exponential backoff**
```js
async function retry(fn, { attempts = 3, baseMs = 200 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) { lastErr = err; }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, baseMs * 2 ** i));
  }
  throw lastErr;
}
```

Follow-up: when is retrying *wrong*? (Hiding real flakiness; non-idempotent operations.)

Source: checked by running the code, not documentation.

**Write a debounce or a simple `sleep`/timeout wrapper**
```js
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms) =>
  Promise.race([p, sleep(ms).then(() => { throw new Error(`Timeout after ${ms}ms`); })]);
```

Then explain why hard sleeps are an anti-pattern in Playwright (auto-waiting, `expect.poll`, `waitForResponse`).

Source: [Page | Playwright](https://playwright.dev/docs/api/class-page#page-wait-for-timeout), and checked by running the code.
