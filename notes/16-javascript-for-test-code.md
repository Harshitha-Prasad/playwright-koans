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
