// "Predict the output" exercises. Each snippet runs for real in the visitor's browser.
// Inside a snippet, `log(value)` records a line and `await sleep(ms)` waits.
// `expected` is verified by `npm run site:check` on every CI run, so it cannot drift.

export const jsChallenges = [
  {
    id: 'async-returns-promise',
    topic: 'Async',
    title: 'What does an async function give you?',
    code: `const getPrice = async () => 3.5;

const a = getPrice();
const b = await getPrice();

log(a instanceof Promise);
log(typeof b);`,
    expected: ['true', 'number'],
    why: 'An async function always returns a promise, even when its body returns a plain value. Only await unwraps it. This is why a Playwright call without await hands you a pending promise and not a result.',
  },
  {
    id: 'event-loop-order',
    topic: 'Async',
    title: 'Timer, promise or plain code: who goes first?',
    code: `setTimeout(() => log('timer'), 0);
Promise.resolve().then(() => log('promise'));
log('sync');

await sleep(20);`,
    expected: ['sync', 'promise', 'timer'],
    why: 'Synchronous code finishes first. Promise callbacks are microtasks and run as soon as the current code is done. Timers are macrotasks and run after all pending microtasks, even with a delay of 0.',
  },
  {
    id: 'forgotten-await',
    topic: 'Async',
    title: 'The forgotten await',
    code: `let saved = false;
const save = async () => {
  await sleep(10);
  saved = true;
};

save();
log(saved);

await sleep(30);
log(saved);`,
    expected: ['false', 'true'],
    why: 'Without await, save() starts and the next line runs immediately, before the work is done. In a test, this is the assertion that fails "randomly": it depends on which side wins the race.',
  },
  {
    id: 'foreach-async',
    topic: 'Async',
    title: 'forEach with an async callback',
    code: `const lengths = [];

['Espresso', 'Latte'].forEach(async (drink) => {
  await sleep(5);
  lengths.push(drink.length);
});
log(lengths.length);

await sleep(30);
log(lengths.length);`,
    expected: ['0', '2'],
    why: 'forEach ignores the promises its callback returns, so the code after it runs before any callback has finished. Use for...of with await for sequential work, or await Promise.all(items.map(...)) for concurrent work.',
  },
  {
    id: 'promise-all-order',
    topic: 'Async',
    title: 'Promise.all: finishing order vs result order',
    code: `const brew = async (drink, ms) => {
  await sleep(ms);
  log('done ' + drink);
  return drink;
};

const served = await Promise.all([brew('espresso', 40), brew('latte', 10)]);
log(served.join(', '));`,
    expected: ['done latte', 'done espresso', 'espresso, latte'],
    why: 'Both calls start at once, so the faster one finishes first. The result array still follows the order of the input array, not the order in which the promises settled.',
  },
  {
    id: 'try-catch-no-await',
    topic: 'Errors',
    title: 'A try/catch that catches nothing',
    code: `const broken = async () => {
  throw new Error('out of beans');
};

const safe = async () => {
  try {
    return broken();
  } catch {
    return 'tea';
  }
};

try {
  log(await safe());
} catch (error) {
  log('caught outside: ' + error.message);
}`,
    expected: ['caught outside: out of beans'],
    why: 'safe() returns the promise without awaiting it, so the promise has already left the try block when it rejects. Writing "return await broken()" keeps the rejection inside the try, and the result would be "tea".',
  },
  {
    id: 'allsettled',
    topic: 'Errors',
    title: 'Promise.all vs Promise.allSettled',
    code: `const calls = () => [sleep(5).then(() => 'ok'), Promise.reject(new Error('503'))];

const results = await Promise.allSettled(calls());
log(results.map((result) => result.status).join(', '));

try {
  await Promise.all(calls());
} catch (error) {
  log('all rejected: ' + error.message);
}`,
    expected: ['fulfilled, rejected', 'all rejected: 503'],
    why: 'allSettled never rejects: it waits for everything and reports each outcome, which suits cleanup and health checks. Promise.all rejects as soon as one promise rejects.',
  },
  {
    id: 'var-let-closure',
    topic: 'Language',
    title: 'var and let in a loop',
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => log('var ' + i), 0);
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => log('let ' + j), 0);
}

await sleep(20);`,
    expected: ['var 3', 'var 3', 'var 3', 'let 0', 'let 1', 'let 2'],
    why: 'var has one binding for the whole function, and by the time the timers fire the loop has ended with i equal to 3. let creates a fresh binding for every iteration, so each callback keeps its own value.',
  },
  {
    id: 'reference-equality',
    topic: 'Language',
    title: 'When are two objects equal?',
    code: `const a = { drink: 'latte' };
const b = { drink: 'latte' };
const c = a;

log(a === b);
log(a === c);
log(JSON.stringify(a) === JSON.stringify(b));`,
    expected: ['false', 'true', 'true'],
    why: '=== compares object identity, not content. This is the difference between expect(a).toBe(b), which fails here, and expect(a).toEqual(b), which compares the contents and passes.',
  },
  {
    id: 'sort-default',
    topic: 'Language',
    title: 'Sorting numbers',
    code: `const prices = [10, 9, 1, 100];

log(prices.sort().join(','));
log(prices.sort((x, y) => x - y).join(','));`,
    expected: ['1,10,100,9', '1,9,10,100'],
    why: 'Without a compare function, sort converts the items to strings and sorts them alphabetically. It also sorts in place. A test that checks "the list is sorted by price" needs a numeric comparator and a copy of the array.',
  },
  {
    id: 'nullish-vs-or',
    topic: 'Language',
    title: '?? and || are not the same',
    code: `const order = { tip: 0, note: '' };

log(order.tip || 5);
log(order.tip ?? 5);
log(order.note || 'none');
log(order.customer?.name);`,
    expected: ['5', '0', 'none', 'undefined'],
    why: '|| falls back on any falsy value, including 0 and the empty string. ?? only falls back on null and undefined. ?. stops and gives undefined when the thing on its left is missing, where a plain dot would throw.',
  },
  {
    id: 'spread-shallow',
    topic: 'Language',
    title: 'How deep does a spread copy go?',
    code: `const original = { size: 'M', extras: ['oat'] };
const copy = { ...original, size: 'L' };

copy.extras.push('shot');

log(original.size);
log(original.extras.length);`,
    expected: ['M', '2'],
    why: 'Spread makes a shallow copy: top-level properties are copied, nested objects and arrays are shared. Test data built with spread can leak changes from one test into another through a shared nested array.',
  },
  {
    id: 'map-vs-foreach',
    topic: 'Language',
    title: 'forEach, map and filter',
    code: `const statuses = ['passed', 'failed', 'passed'];

const a = statuses.forEach((status) => status.toUpperCase());
const b = statuses.map((status) => status.toUpperCase());

log(a);
log(b.join(' '));
log(statuses.filter((status) => status === 'failed').length);`,
    expected: ['undefined', 'PASSED FAILED PASSED', '1'],
    why: 'forEach returns nothing. map returns a new array with the transformed items, and filter returns a new array with the items that pass the test. None of them changes the original array.',
  },
  {
    id: 'loose-equality',
    topic: 'Language',
    title: '== , === and typeof',
    code: `log(1 == '1');
log(1 === '1');
log(typeof null);
log(typeof undefined);
log(Number('') === 0);`,
    expected: ['true', 'false', 'object', 'undefined', 'true'],
    why: '== converts types before comparing, === does not. typeof null being "object" is a historical bug that cannot be fixed. An empty string converts to 0, which is why validating numeric input with Number() alone lets empty fields through.',
  },
  {
    id: 'closure-counter',
    topic: 'Language',
    title: 'Closures keep their own state',
    code: `function makeCounter() {
  let count = 0;
  return () => ++count;
}

const a = makeCounter();
const b = makeCounter();
a();
a();

log(a());
log(b());`,
    expected: ['3', '1'],
    why: 'Each call to makeCounter creates a new count variable, and the returned function keeps access to it. That is a closure. Test helpers built this way, such as a unique-id generator, hold private state without a global variable.',
  },
  {
    id: 'destructuring',
    topic: 'Language',
    title: 'Destructuring with defaults',
    code: `const response = { status: 200, data: { user: { name: 'Ada' } } };

const { status, data: { user: { name, role = 'guest' } } } = response;
const [first, , third = 'none'] = ['a', 'b'];

log(status);
log(name);
log(role);
log(first + ' ' + third);`,
    expected: ['200', 'Ada', 'guest', 'a none'],
    why: 'Destructuring picks values out by name (objects) or position (arrays). A default applies only when the value is undefined. Playwright fixtures rely on this: async ({ page, request }) => {} is object destructuring in a parameter.',
  },
  {
    id: 'this-lost',
    topic: 'Language',
    title: 'A method that loses its object',
    code: `class Cart {
  constructor() {
    this.items = ['latte'];
  }
  count() {
    return this.items.length;
  }
}

const cart = new Cart();
const count = cart.count;

try {
  log(count());
} catch (error) {
  log(error.constructor.name);
}
log([cart].map((c) => c.count())[0]);`,
    expected: ['TypeError', '1'],
    why: 'this is decided by how a function is called, not where it was defined. Calling count() without the object leaves this undefined. Passing a page-object method as a callback has the same effect: wrap it in an arrow function or bind it.',
  },
  {
    id: 'array-search',
    topic: 'Language',
    title: 'find, some, every and reduce',
    code: `const results = [
  { name: 'login', ms: 120, passed: true },
  { name: 'cart', ms: 340, passed: false },
  { name: 'pay', ms: 90, passed: true },
];

log(results.find((r) => !r.passed).name);
log(results.some((r) => r.ms > 300));
log(results.every((r) => r.passed));
log(results.reduce((total, r) => total + r.ms, 0));
log(results.find((r) => r.ms > 1000));`,
    expected: ['cart', 'true', 'false', '550', 'undefined'],
    why: 'find returns the first match or undefined, which is why chaining .name onto a find that matches nothing throws. some and every answer yes or no. reduce folds the array into one value.',
  },
  {
    id: 'truthiness',
    topic: 'Language',
    title: 'Which values are truthy?',
    code: `const values = [0, '0', '', ' ', null, undefined, NaN, [], {}];

log(values.filter(Boolean).length);
log(Boolean('false'));
log(Boolean([]) === Boolean(''));`,
    expected: ['4', 'true', 'false'],
    why: "The falsy values are false, 0, '', null, undefined and NaN (plus 0n and -0). Everything else is truthy, including '0', ' ', 'false', empty arrays and empty objects. So if (items) is always true for an array: check items.length.",
  },
  {
    id: 'try-finally',
    topic: 'Errors',
    title: 'try, catch and finally in order',
    code: `const steps = [];

const run = async () => {
  try {
    steps.push('try');
    throw new Error('boom');
  } catch {
    steps.push('catch');
    return 'from catch';
  } finally {
    steps.push('finally');
  }
};

log(await run());
log(steps.join(' > '));`,
    expected: ['from catch', 'try > catch > finally'],
    why: 'finally runs whether the try block finished, threw or returned, and it runs before the function hands back its value. That makes it the place for cleanup such as deleting test data or closing a connection.',
  },
  {
    id: 'const-mutation',
    topic: 'Language',
    title: 'What const protects',
    code: `const drinks = ['latte'];
drinks.push('mocha');
log(drinks.length);

try {
  drinks = [];
} catch (error) {
  log(error.constructor.name);
}`,
    expected: ['2', 'TypeError'],
    why: 'const stops the variable from being reassigned. It does not make the value immutable: arrays and objects declared with const can still be changed. Shared test data needs a fresh copy per test, not just a const.',
  },
  {
    id: 'for-in-of',
    topic: 'Language',
    title: 'for...in and for...of',
    code: `const drinks = ['latte', 'mocha'];

for (const key in drinks) {
  log(typeof key + ' ' + key);
}
for (const drink of drinks) {
  log(drink);
}`,
    expected: ['string 0', 'string 1', 'latte', 'mocha'],
    why: 'for...in walks over property names, which for an array are the indexes as strings. for...of walks over the values. For arrays you almost always want for...of.',
  },
  {
    id: 'json-roundtrip',
    topic: 'Language',
    title: 'What survives JSON',
    code: `const order = { id: 1, note: undefined, when: new Date(0), price: 4.5 };
const copy = JSON.parse(JSON.stringify(order));

log('note' in copy);
log(typeof copy.when);
log(copy.price === order.price);`,
    expected: ['false', 'string', 'true'],
    why: 'JSON has no undefined and no Date: undefined properties are dropped and dates become strings. An API response therefore never deep-equals an object that holds a Date or an undefined field. Compare the string form, or use toMatchObject.',
  },
  {
    id: 'string-number-plus',
    topic: 'Language',
    title: 'Template literals and the + operator',
    code: `const drink = 'latte';
const quantity = 2;

log(\`\${quantity} x \${drink.toUpperCase()} = €\${(quantity * 4.5).toFixed(2)}\`);
log('1' + 2 + 3);
log(1 + 2 + '3');`,
    expected: ['2 x LATTE = €9.00', '123', '33'],
    why: 'A template literal evaluates each ${...} and joins the results. With +, a string on either side turns the operation into concatenation, evaluated left to right. Values read from the page are strings: convert them with Number() before doing arithmetic.',
  },
  {
    id: 'float-precision',
    topic: 'Language',
    title: 'Comparing prices',
    code: `log(0.1 + 0.2 === 0.3);
log((0.1 + 0.2).toFixed(2));
log(Math.abs(0.1 + 0.2 - 0.3) < 0.001);`,
    expected: ['false', '0.30', 'true'],
    why: 'Floating point numbers cannot represent 0.1 or 0.2 exactly, so the sum is 0.30000000000000004. Assert on money with toBeCloseTo, with a formatted string, or in whole cents.',
  },
  {
    id: 'parse-numbers',
    topic: 'Language',
    title: 'Turning text into numbers',
    code: `log(parseInt('42px'));
log(Number('42px'));
log(Number('€4.10'.replace('€', '')));
log(typeof NaN);`,
    expected: ['42', 'NaN', '4.1', 'number'],
    why: 'parseInt reads digits until it meets something else. Number converts the whole string or gives NaN. NaN is of type number and is not equal to anything, itself included, so check it with Number.isNaN.',
  },
  {
    id: 'map-async',
    topic: 'Async',
    title: 'map with an async callback',
    code: `const ids = [1, 2, 3];
const results = ids.map(async (id) => id * 2);

log(results[0] instanceof Promise);
log((await Promise.all(results)).join(','));`,
    expected: ['true', '2,4,6'],
    why: 'An async callback returns a promise, so map produces an array of promises, not of values. Promise.all turns it into the values. Forgetting that step is why a filter or an assertion on "the results" silently sees promises.',
  },
];
