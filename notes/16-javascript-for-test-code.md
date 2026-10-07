# 16 · JavaScript for test code

Practice: the "Predict the output" snippets and the JavaScript track of the playground on the website.

Note 00 covers promises and `await`. This note covers the rest of the language that shows up in every test file: functions and closures, destructuring, `this`, modules, arrays, equality and copying.

## The idea in six lines

- A function remembers the variables of the place where it was created. That is a **closure**, and it is how helpers keep private state.
- **Destructuring** unpacks objects by name and arrays by position. `async ({ page, request }) => {}` is destructuring in a parameter list, and Playwright reads it to know which fixtures to set up.
- **`this`** is decided by how a function is called. A method passed around as a bare function loses its object. Arrow functions do not have their own `this`.
- **Modules**: `export` makes something available, `import` brings it in. `import type` brings in a type only and disappears at runtime.
- **Arrays**: `map`, `filter`, `find`, `some`, `every` and `reduce` return new values and leave the array alone. `sort`, `reverse`, `push` and `splice` change it in place.
- `===` compares primitives by value and objects by identity. Spread copies one level deep. Know which one a test relies on.

## Cheat sheet

```ts
// Closure: a helper with private state
const nextId = (() => { let id = 0; return () => ++id; })();

// Destructuring with rename and default
const { status, data: { items = [] } } = response;
const [first, ...rest] = items;

// Keep `this`: wrap the method in an arrow function
items.forEach((item) => menuPage.addToCart(item));   // not: items.forEach(menuPage.addToCart)

// Copy before you change shared data
const sorted = [...prices].sort((a, b) => a - b);    // sort() alone would reorder `prices`
const deepCopy = structuredClone(order);              // spread would share nested objects

// Falsy values: false, 0, '', null, undefined, NaN. Everything else is truthy, [] and {} included.
if (items.length === 0) { /* empty */ }               // not: if (!items)

// Clean up whatever happens
try { await runScenario(); } finally { await deleteTestData(); }
```

## Interviewers ask

**What is a closure? Give an example from test code.**
A function together with the variables that were in scope where it was defined. It can read and change those variables after the outer function has returned. A counter that hands out unique order names, or a fixture that remembers what it created so it can delete it afterwards, are closures.

Source: [Closures - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)

**Why can a function passed to `page.evaluate()` not use variables from the test?**
Because it does not run in the test. Playwright serialises the function, sends it to the browser and runs it in the page, where the test's variables do not exist. Pass what it needs as the second argument: `page.evaluate((name) => document.title + name, name)`.

Source: [Evaluating JavaScript | Playwright](https://playwright.dev/docs/evaluating)

**Why must a Playwright test write `async ({ page }) =>` and not `async (fixtures) =>`?**
Playwright decides which fixtures to set up by looking at the names in the destructuring pattern of the first parameter. Without the pattern it cannot know what the test needs, and it reports an error.

Source: [Fixtures | Playwright](https://playwright.dev/docs/test-fixtures)

**What does destructuring give you beyond shorter code?**
Named access to exactly the parts you use, defaults for missing values (`{ timeout = 5000 }`), renaming (`{ data: body }`), and rest patterns that collect what is left (`{ id, ...others }`). A default applies only when the value is `undefined`, not when it is `null`.

Source: [Destructuring - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring)

**A page-object method works when called directly and throws "Cannot read properties of undefined" when passed as a callback. Why?**
`this` depends on the call. `menuPage.addToCart(item)` calls the method on the object. `items.forEach(menuPage.addToCart)` passes the bare function, which is then called without an object, so `this` is `undefined` inside it. Wrap it in an arrow function, or use `bind`.

Source: [this - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)

**What is the difference between an arrow function and a regular function?**
An arrow function has no `this` or `arguments` of its own; it uses those of the surrounding code. It cannot be used as a constructor. That makes arrows the safe default for callbacks, and regular methods the right choice inside classes.

Source: [Arrow function expressions - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)

**Named export or default export?**
A module can have many named exports and one default export. Named exports are imported with the same name in braces, which helps refactoring and autocomplete. A default export can be given any name by the importer. Many teams use named exports only, for consistency.

Source: [JavaScript modules - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

**Which array methods change the array, and why does it matter in tests?**
`sort`, `reverse`, `push`, `pop`, `shift`, `unshift` and `splice` change the array in place. `map`, `filter`, `slice`, `concat` and the newer `toSorted` and `toReversed` return a new one. A helper that sorts shared test data in place changes it for every test that runs afterwards in the same worker.

Source: [Array - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)

**`==` or `===`?**
`===` compares without converting types and is the default choice. `==` converts first, so `1 == '1'` and `0 == ''` are true. Neither compares objects by content: two objects with the same properties are equal only to themselves. For content, use a deep comparison such as `toEqual`.

Source: [Equality comparisons and sameness - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)

**What is the difference between a shallow and a deep copy?**
A shallow copy (spread, `Object.assign`, `slice`) copies the top level and shares everything nested. A deep copy duplicates the nested objects too. `structuredClone(value)` makes a deep copy of plain data. A JSON round trip also does, but drops `undefined` and turns dates into strings.

Source: [Window: structuredClone() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)

**When does a `finally` block run?**
Always: after the `try` block finishes, after a `catch` block handles an error, and also when either of them returns or throws. It runs before the function's result reaches the caller, which is why it is the place for cleanup.

Source: [try...catch - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)

### Language basics

**`var` vs `let` vs `const`?**
`var`: function-scoped, hoisted and initialised to `undefined`, can be redeclared. `let`: block-scoped, hoisted but in the *temporal dead zone* until declared, not redeclarable. `const`: like `let` but the binding cannot be reassigned (the object it points to can still be mutated). Default to `const`, use `let` when reassignment is needed, never `var`.

Source: interview handbook, not checked against documentation.

**Primitive vs reference types?**
Primitives: string, number, bigint, boolean, undefined, null, symbol, immutable, compared by value. Objects (including arrays, functions) are reference types, compared by identity. `[1] === [1]` is `false`.

Source: interview handbook, not checked against documentation.

**Truthy and falsy values?**
Falsy: `false, 0, -0, 0n, '', null, undefined, NaN`. Everything else is truthy, including `[]`, `{}`, `'0'`.

Source: interview handbook, not checked against documentation.

**`null` vs `undefined`?**
`undefined`: declared but not assigned, missing property, missing argument. `null`: intentional absence, set by the programmer. `typeof null === 'object'` is a historical bug.

Source: interview handbook, not checked against documentation.

**What is hoisting?**
Declarations are moved to the top of their scope at compile time. `var` and function declarations are fully hoisted (functions usable before definition). `let`/`const`/`class` are hoisted but uninitialised (TDZ). Function *expressions* and arrow functions assigned to `const` are not callable before the line executes.

Source: interview handbook, not checked against documentation.

**Optional chaining and nullish coalescing?**
`a?.b?.c` returns `undefined` instead of throwing if any link is null/undefined. `x ?? 'default'` returns the right side only for `null`/`undefined` (unlike `||`, which also triggers on `0`, `''`, `false`). Both are everyday tools in test code handling API responses.

Source: interview handbook, not checked against documentation.

**Template literals and tagged templates?**
Backtick strings with `${expr}` interpolation and multi-line support. Tagged templates (`tag\`...``) call a function with the string parts, used by some libraries (e.g. `sql`...``).

Source: interview handbook, not checked against documentation.

### Functions, scope and `this`

**How does `this` work?**
Determined by *how* a function is called: method call → the object; plain call → `undefined` in strict mode (global object in sloppy mode); `new` → the new instance; `call/apply/bind` → explicit; arrow function → inherited from enclosing scope. Page-object bug to know: passing `this.method` as a callback loses `this`, use an arrow or `.bind(this)`.

Source: interview handbook, not checked against documentation.

**`call`, `apply`, `bind`?**
All set `this` explicitly. `call(thisArg, a, b)` and `apply(thisArg, [a, b])` invoke immediately; `bind(thisArg)` returns a new function with `this` fixed.

Source: interview handbook, not checked against documentation.

**What is an IIFE and why did people use it?**
Immediately Invoked Function Expression `(() => { ... })()`, creates a private scope. Common before modules; still used for top-level async in scripts.

Source: interview handbook, not checked against documentation.

**Higher-order functions and pure functions?**
HOF: takes or returns functions (`map`, `filter`, `reduce`). Pure: same input → same output, no side effects. Pure helpers are easier to test and to reason about in a framework.

Source: interview handbook, not checked against documentation.

**Explain currying and function composition briefly**
Currying: `f(a)(b)(c)`, transforms a multi-arg function into a chain. Composition: `compose(f, g)(x) = f(g(x))`. Rarely needed in test code but shows fluency; used in some assertion helpers and pipelines.

Source: interview handbook, not checked against documentation.

### Objects, arrays, prototypes and classes

**Common array methods, know them cold**
`map`, `filter`, `reduce`, `find`, `findIndex`, `some`, `every`, `includes`, `forEach`, `flat`, `flatMap`, `sort` (mutates! comparator returns negative/zero/positive), `slice` (non-mutating) vs `splice` (mutating), `Array.from`, `Object.keys/values/entries`. Be able to write a `reduce` that groups or sums.

Source: interview handbook, not checked against documentation.

**What is prototypal inheritance?**
Every object has an internal `[[Prototype]]`. Property lookup walks the chain. Classes are syntactic sugar over constructor functions and prototypes. `Object.create(proto)` creates an object with a given prototype.

Source: interview handbook, not checked against documentation.

**ES6 classes, `constructor`, `extends`, `super`, `static`, getters, private fields**
```js
class BasePage {
  #timeout = 5000;                    // private field
  constructor(page) { this.page = page; }
  static create(page) { return new this(page); }
  get url() { return this.page.url(); }
  async goto(path) { await this.page.goto(path); }
}
class LoginPage extends BasePage {
  constructor(page) { super(page); this.user = page.getByLabel('Email'); }
}
```

Source: interview handbook, not checked against documentation.

**What are `Map`, `Set`, `WeakMap`?**
`Map`: key/value with any key type, ordered, `.size`. `Set`: unique values. `WeakMap/WeakSet`: keys are objects held weakly (garbage-collectable), used for caching metadata without leaks.

Source: interview handbook, not checked against documentation.

**`JSON.stringify` / `JSON.parse` gotchas?**
`undefined`, functions, symbols are dropped; `Date` becomes string; `NaN/Infinity` become `null`; circular references throw. Use the replacer/reviver arguments for control.

Source: interview handbook, not checked against documentation.

**Getters/setters, `Object.freeze`, `Object.defineProperty`?**
`freeze` makes an object shallowly immutable (useful for constants/config). `defineProperty` controls enumerable/writable/configurable.

Source: interview handbook, not checked against documentation.

**What is the difference between `Object.keys`, `for...in`, `for...of`?**
`Object.keys`: own enumerable string keys. `for...in`: enumerable keys including inherited ones, avoid for arrays. `for...of`: iterates iterables (arrays, strings, Maps, Sets, generators) by value.

Source: interview handbook, not checked against documentation.

**Iterators and generators?**
An iterable implements `[Symbol.iterator]` returning an object with `next()`. Generators (`function*`, `yield`) build iterators lazily. Async generators (`for await`) are handy for paging through API results.

Source: interview handbook, not checked against documentation.

### Modules, Node.js and tooling

**CommonJS vs ES modules?**
CJS: `require`/`module.exports`, synchronous, Node's original. ESM: `import`/`export`, static, tree-shakeable, standard. Playwright projects typically use ESM syntax in TS compiled/transpiled appropriately. Know `"type": "module"` in `package.json` and file extensions `.mjs/.cjs`.

Source: interview handbook, not checked against documentation.

**What is `package.json`? `dependencies` vs `devDependencies`? What is `package-lock.json`?**
Manifest with scripts and dependency ranges. `devDependencies` are not installed in production installs. The lockfile pins exact resolved versions for reproducible installs, commit it; use `npm ci` in CI.

Source: interview handbook, not checked against documentation.

**Semantic versioning, what do `^` and `~` mean?**
`MAJOR.MINOR.PATCH`. `^1.2.3` allows minor and patch updates (<2.0.0); `~1.2.3` allows patch only (<1.3.0). Pin Playwright and browsers explicitly to avoid surprise CI breakage.

Source: interview handbook, not checked against documentation.

**`npm` vs `npx`? `npm ci` vs `npm install`?**
`npx` runs a package binary (e.g. `npx playwright test`) without a global install. `npm ci` installs exactly from the lockfile, faster and deterministic, the right choice for pipelines.

Source: interview handbook, not checked against documentation.

**Node.js basics an SDET should know?**
`process.env` for config, `process.argv`, `fs/promises`, `path`, environment via `.env` and `dotenv`, Node event loop identical concept to the browser's, `EventEmitter`, streams for large files, `child_process` for shelling out.

Source: interview handbook, not checked against documentation.

**What are ESLint and Prettier for, and how do they relate to quality?**
ESLint: static analysis for bugs and style (e.g. floating promises, unused vars). Prettier: formatting only. Run both in a pre-commit hook (`husky` + `lint-staged`) and in CI, part of shift-left.

Source: interview handbook, not checked against documentation.
