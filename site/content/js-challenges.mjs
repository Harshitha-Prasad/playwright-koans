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
];
