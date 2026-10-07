// Challenges for the "JavaScript" track of the playground: write a function, hidden tests mark it.
// The code runs for real (in a Web Worker in the browser, in Node for `npm run site:check`), so
// there is nothing to imitate here. Every solution below is executed against its tests in CI.
//
//   entry   the name of the function the learner has to define
//   tests   name: shown to the learner; code: an async function body with the entry function,
//           `expect` and `sleep(ms)` in scope

export const codeChallenges = [
  {
    id: 'reverse-string',
    group: 'Strings',
    title: 'Reverse a string',
    entry: 'reverseString',
    prompt: 'Return the characters of the text in reverse order.',
    starter: `function reverseString(text) {\n  \n}\n`,
    solution: `function reverseString(text) {\n  return [...text].reverse().join('');\n}\n`,
    tests: [
      { name: 'reverses a word', code: `expect(reverseString('latte')).toBe('ettal');` },
      { name: 'keeps spaces and capital letters where they end up', code: `expect(reverseString('Flat White')).toBe('etihW talF');` },
      { name: 'returns an empty string for an empty string', code: `expect(reverseString('')).toBe('');` },
    ],
  },
  {
    id: 'palindrome',
    group: 'Strings',
    title: 'Palindrome check',
    entry: 'isPalindrome',
    prompt: 'Return true if the text reads the same forwards and backwards. Ignore upper and lower case, spaces and punctuation.',
    starter: `function isPalindrome(text) {\n  \n}\n`,
    solution: `function isPalindrome(text) {
  const letters = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return letters === [...letters].reverse().join('');
}
`,
    tests: [
      { name: 'accepts a simple palindrome', code: `expect(isPalindrome('level')).toBe(true);` },
      { name: 'ignores case', code: `expect(isPalindrome('Level')).toBe(true);` },
      { name: 'ignores spaces and punctuation', code: `expect(isPalindrome('A man, a plan, a canal: Panama')).toBe(true);` },
      { name: 'rejects other words', code: `expect(isPalindrome('espresso')).toBe(false);` },
      { name: 'treats an empty string as a palindrome', code: `expect(isPalindrome('')).toBe(true);` },
    ],
  },
  {
    id: 'count-words',
    group: 'Strings',
    title: 'Count the words',
    entry: 'countWords',
    prompt: 'Return an object that maps each word to how often it occurs. Ignore case and punctuation.',
    starter: `function countWords(text) {\n  \n}\n`,
    solution: `function countWords(text) {
  const counts = {};
  for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    counts[word] = (counts[word] ?? 0) + 1;
  }
  return counts;
}
`,
    tests: [
      { name: 'counts repeated words', code: `expect(countWords('latte espresso latte')).toEqual({ latte: 2, espresso: 1 });` },
      { name: 'ignores case and punctuation', code: `expect(countWords('Latte, latte! Espresso?')).toEqual({ latte: 2, espresso: 1 });` },
      { name: 'returns an empty object for empty text', code: `expect(countWords('')).toEqual({});` },
    ],
  },
  {
    id: 'parse-query',
    group: 'Strings',
    title: 'Read the query string of a URL',
    entry: 'parseQuery',
    prompt: 'Return the query parameters of a URL as an object. Values are decoded. If a key occurs twice, the last value wins.',
    starter: `function parseQuery(url) {\n  \n}\n`,
    solution: `function parseQuery(url) {\n  return Object.fromEntries(new URL(url).searchParams);\n}\n`,
    tests: [
      { name: 'reads two parameters', code: `expect(parseQuery('https://cafe.test/menu?size=large&milk=oat')).toEqual({ size: 'large', milk: 'oat' });` },
      { name: 'decodes encoded values', code: `expect(parseQuery('https://cafe.test/search?q=flat%20white')).toEqual({ q: 'flat white' });` },
      { name: 'returns an empty object without a query', code: `expect(parseQuery('https://cafe.test/menu')).toEqual({});` },
      { name: 'keeps the last value of a repeated key', code: `expect(parseQuery('https://cafe.test/menu?size=small&size=large')).toEqual({ size: 'large' });` },
    ],
  },
  {
    id: 'balanced-brackets',
    group: 'Strings',
    title: 'Balanced brackets',
    entry: 'isBalanced',
    prompt: 'Return true if every (, [ and { is closed by the matching bracket in the right order. Other characters do not matter.',
    starter: `function isBalanced(text) {\n  \n}\n`,
    solution: `function isBalanced(text) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const open = [];
  for (const char of text) {
    if ('([{'.includes(char)) open.push(char);
    else if (char in pairs && open.pop() !== pairs[char]) return false;
  }
  return open.length === 0;
}
`,
    tests: [
      { name: 'accepts nested brackets', code: `expect(isBalanced('([]{})')).toBe(true);` },
      { name: 'rejects a mismatched pair', code: `expect(isBalanced('(]')).toBe(false);` },
      { name: 'rejects an unclosed bracket', code: `expect(isBalanced('((')).toBe(false);` },
      { name: 'rejects a closing bracket that comes first', code: `expect(isBalanced(')(')).toBe(false);` },
      { name: 'ignores other characters', code: `expect(isBalanced('test("x", () => { items[0]; })')).toBe(true);` },
      { name: 'accepts an empty string', code: `expect(isBalanced('')).toBe(true);` },
    ],
  },
  {
    id: 'find-duplicates',
    group: 'Arrays and objects',
    title: 'Find the duplicates',
    entry: 'findDuplicates',
    prompt: 'Return the values that occur more than once. Each duplicate appears once in the result, in the order it first appeared.',
    starter: `function findDuplicates(items) {\n  \n}\n`,
    solution: `function findDuplicates(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return items.filter((item, index) => duplicates.has(item) && items.indexOf(item) === index);
}
`,
    tests: [
      { name: 'finds numbers that repeat', code: `expect(findDuplicates([3, 1, 3, 2, 1, 3])).toEqual([3, 1]);` },
      { name: 'works with strings', code: `expect(findDuplicates(['ada', 'grace', 'ada'])).toEqual(['ada']);` },
      { name: 'returns an empty array when nothing repeats', code: `expect(findDuplicates([1, 2, 3])).toEqual([]);` },
      { name: 'does not change the input', code: `const input = [2, 2, 1]; findDuplicates(input); expect(input).toEqual([2, 2, 1]);` },
    ],
  },
  {
    id: 'second-largest',
    group: 'Arrays and objects',
    title: 'Second largest number',
    entry: 'secondLargest',
    prompt: 'Return the second largest distinct number. Return undefined if there are fewer than two distinct numbers.',
    starter: `function secondLargest(numbers) {\n  \n}\n`,
    solution: `function secondLargest(numbers) {\n  return [...new Set(numbers)].sort((a, b) => b - a)[1];\n}\n`,
    tests: [
      { name: 'finds it in an unsorted list', code: `expect(secondLargest([4, 9, 2, 7])).toBe(7);` },
      { name: 'does not count the largest twice', code: `expect(secondLargest([4, 9, 2, 9])).toBe(4);` },
      { name: 'sorts by value, not as text', code: `expect(secondLargest([100, 9, 20])).toBe(20);` },
      { name: 'works with negative numbers', code: `expect(secondLargest([-5, -1, -3])).toBe(-3);` },
      { name: 'returns undefined when there is no second value', code: `expect(secondLargest([5])).toBeUndefined(); expect(secondLargest([7, 7])).toBeUndefined();` },
      { name: 'does not change the input', code: `const input = [3, 1, 2]; secondLargest(input); expect(input).toEqual([3, 1, 2]);` },
    ],
  },
  {
    id: 'flatten',
    group: 'Arrays and objects',
    title: 'Flatten a nested array',
    entry: 'flatten',
    prompt: 'Return one flat array with all the values, however deeply they are nested. Write it yourself: do not use Array.prototype.flat.',
    starter: `function flatten(nested) {\n  \n}\n`,
    solution: `function flatten(nested) {
  const result = [];
  for (const item of nested) {
    if (Array.isArray(item)) result.push(...flatten(item));
    else result.push(item);
  }
  return result;
}
`,
    tests: [
      { name: 'flattens one level', code: `expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);` },
      { name: 'flattens any depth', code: `expect(flatten([1, [2, [3, [4, [5]]]]])).toEqual([1, 2, 3, 4, 5]);` },
      { name: 'handles empty arrays', code: `expect(flatten([])).toEqual([]); expect(flatten([[], [[]]])).toEqual([]);` },
      { name: 'does not use Array.prototype.flat', code: `const original = Array.prototype.flat; Array.prototype.flat = () => { throw new Error('flat() was called'); }; try { expect(flatten([1, [2, [3]]])).toEqual([1, 2, 3]); } finally { Array.prototype.flat = original; }` },
    ],
  },
  {
    id: 'chunk',
    group: 'Arrays and objects',
    title: 'Split an array into chunks',
    entry: 'chunk',
    prompt: 'Split the array into groups of the given size. The last group may be smaller. This is how test data is batched or shards are built.',
    starter: `function chunk(items, size) {\n  \n}\n`,
    solution: `function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
`,
    tests: [
      { name: 'splits evenly', code: `expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);` },
      { name: 'puts the remainder in a smaller last chunk', code: `expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);` },
      { name: 'returns one chunk when the size is larger than the array', code: `expect(chunk([1, 2], 5)).toEqual([[1, 2]]);` },
      { name: 'returns an empty array for an empty array', code: `expect(chunk([], 3)).toEqual([]);` },
    ],
  },
  {
    id: 'group-by',
    group: 'Arrays and objects',
    title: 'Group objects by a property',
    entry: 'groupBy',
    prompt: 'Group the objects by the value of the given property. Return an object whose keys are those values and whose values are arrays of the matching objects, in their original order.',
    starter: `function groupBy(items, key) {\n  \n}\n`,
    solution: `function groupBy(items, key) {
  const groups = {};
  for (const item of items) {
    (groups[item[key]] ??= []).push(item);
  }
  return groups;
}
`,
    tests: [
      {
        name: 'groups test results by status',
        code: `const results = [{ id: 1, status: 'passed' }, { id: 2, status: 'failed' }, { id: 3, status: 'passed' }];
expect(groupBy(results, 'status')).toEqual({ passed: [{ id: 1, status: 'passed' }, { id: 3, status: 'passed' }], failed: [{ id: 2, status: 'failed' }] });`,
      },
      { name: 'works with any property', code: `expect(Object.keys(groupBy([{ size: 'S' }, { size: 'L' }, { size: 'S' }], 'size'))).toEqual(['S', 'L']);` },
      { name: 'returns an empty object for an empty array', code: `expect(groupBy([], 'status')).toEqual({});` },
    ],
  },
  {
    id: 'sort-by-price',
    group: 'Arrays and objects',
    title: 'Sort without changing the original',
    entry: 'sortByPrice',
    prompt: 'Return a new array with the items sorted by price, cheapest first. The array you were given must stay as it was.',
    starter: `function sortByPrice(items) {\n  \n}\n`,
    solution: `function sortByPrice(items) {\n  return [...items].sort((a, b) => a.price - b.price);\n}\n`,
    tests: [
      {
        name: 'sorts by price, cheapest first',
        code: `const menu = [{ name: 'Cold Brew', price: 4.1 }, { name: 'Espresso', price: 2.2 }, { name: 'Flat White', price: 3.5 }];
expect(sortByPrice(menu).map((item) => item.name)).toEqual(['Espresso', 'Flat White', 'Cold Brew']);`,
      },
      { name: 'compares numbers, not text', code: `expect(sortByPrice([{ price: 10 }, { price: 9 }, { price: 100 }]).map((item) => item.price)).toEqual([9, 10, 100]);` },
      {
        name: 'leaves the original array untouched',
        code: `const menu = [{ price: 3 }, { price: 1 }, { price: 2 }];
const sorted = sortByPrice(menu);
expect(menu.map((item) => item.price)).toEqual([3, 1, 2]);
expect(sorted).not.toBe(menu);`,
      },
    ],
  },
  {
    id: 'pick',
    group: 'Arrays and objects',
    title: 'Pick some properties',
    entry: 'pick',
    prompt: 'Return a new object that has only the listed keys. Keys that the object does not have are left out. Useful for comparing only the stable fields of an API response.',
    starter: `function pick(object, keys) {\n  \n}\n`,
    solution: `function pick(object, keys) {\n  return Object.fromEntries(keys.filter((key) => key in object).map((key) => [key, object[key]]));\n}\n`,
    tests: [
      { name: 'keeps only the listed keys', code: `expect(pick({ id: 7, name: 'Ada', token: 'secret' }, ['id', 'name'])).toEqual({ id: 7, name: 'Ada' });` },
      { name: 'leaves out keys the object does not have', code: `expect(Object.keys(pick({ id: 7 }, ['id', 'email']))).toEqual(['id']);` },
      { name: 'keeps falsy values', code: `expect(pick({ count: 0, note: '', done: false }, ['count', 'note', 'done'])).toEqual({ count: 0, note: '', done: false });` },
      { name: 'does not change the original object', code: `const user = { id: 7, token: 'secret' }; pick(user, ['id']); expect(user).toEqual({ id: 7, token: 'secret' });` },
    ],
  },
  {
    id: 'deep-equal',
    group: 'Arrays and objects',
    title: 'Deep equality',
    entry: 'deepEqual',
    prompt: 'Return true if two values are equal in content: primitives by value, arrays item by item, objects key by key (key order does not matter). This is what toEqual does where toBe compares identity.',
    starter: `function deepEqual(a, b) {\n  \n}\n`,
    solution: `function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((key) => keysB.includes(key) && deepEqual(a[key], b[key]));
}
`,
    tests: [
      { name: 'compares primitives', code: `expect(deepEqual(1, 1)).toBe(true); expect(deepEqual('a', 'b')).toBe(false); expect(deepEqual(1, '1')).toBe(false);` },
      { name: 'compares nested objects and arrays', code: `expect(deepEqual({ id: 1, tags: ['a', { b: 2 }] }, { id: 1, tags: ['a', { b: 2 }] })).toBe(true);` },
      { name: 'ignores key order', code: `expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);` },
      { name: 'notices a different value deep inside', code: `expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);` },
      { name: 'notices an extra key or item', code: `expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false); expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);` },
      { name: 'handles null and does not confuse arrays with objects', code: `expect(deepEqual(null, {})).toBe(false); expect(deepEqual([], {})).toBe(false); expect(deepEqual(null, null)).toBe(true);` },
    ],
  },
  {
    id: 'wait-until',
    group: 'Async',
    title: 'Poll until a condition holds',
    entry: 'waitUntil',
    prompt: 'Call condition() every `interval` milliseconds until it returns something truthy, then resolve with true. The condition may be async. If it is still falsy after `timeout` milliseconds, reject with an Error whose message is "Timed out after <timeout>ms". This is auto-waiting in miniature.',
    starter: `async function waitUntil(condition, { timeout = 1000, interval = 20 } = {}) {\n  \n}\n`,
    solution: `async function waitUntil(condition, { timeout = 1000, interval = 20 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await condition()) return true;
    if (Date.now() >= deadline) throw new Error(\`Timed out after \${timeout}ms\`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
`,
    tests: [
      { name: 'resolves with true once the condition holds', code: `let ready = false; setTimeout(() => { ready = true; }, 60); expect(await waitUntil(() => ready, { timeout: 500, interval: 10 })).toBe(true);` },
      { name: 'checks once when the condition is already true', code: `let calls = 0; await waitUntil(() => { calls += 1; return true; }); expect(calls).toBe(1);` },
      { name: 'keeps polling while the condition is falsy', code: `let calls = 0; await waitUntil(() => { calls += 1; return calls >= 4; }, { timeout: 500, interval: 5 }); expect(calls).toBe(4);` },
      { name: 'accepts an async condition', code: `let calls = 0; await waitUntil(async () => { await sleep(5); calls += 1; return calls >= 2; }, { timeout: 500, interval: 5 }); expect(calls).toBe(2);` },
      { name: 'rejects with a clear message on timeout', code: `await expect(waitUntil(() => false, { timeout: 60, interval: 10 })).rejects.toThrow('Timed out after 60ms');` },
    ],
  },
  {
    id: 'retry',
    group: 'Async',
    title: 'Retry a flaky call',
    entry: 'retry',
    prompt: 'Call the async function fn. If it rejects, call it again, up to `attempts` calls in total. Resolve with the first successful result. If every attempt fails, reject with the error of the last attempt.',
    starter: `async function retry(fn, attempts) {\n  \n}\n`,
    solution: `async function retry(fn, attempts) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
`,
    tests: [
      { name: 'returns the result of a call that works first time', code: `let calls = 0; const result = await retry(async () => { calls += 1; return 'ok'; }, 3); expect(result).toBe('ok'); expect(calls).toBe(1);` },
      { name: 'tries again after a failure', code: `let calls = 0; const result = await retry(async () => { calls += 1; if (calls < 3) throw new Error('503'); return 'ok'; }, 5); expect(result).toBe('ok'); expect(calls).toBe(3);` },
      { name: 'gives up after the given number of attempts', code: `let calls = 0; await expect(retry(async () => { calls += 1; throw new Error('attempt ' + calls); }, 3)).rejects.toThrow('attempt 3'); expect(calls).toBe(3);` },
      { name: 'waits for each attempt before starting the next', code: `let running = 0; let overlap = false; let calls = 0; await retry(async () => { running += 1; if (running > 1) overlap = true; await sleep(10); running -= 1; calls += 1; if (calls < 3) throw new Error('again'); }, 3); expect(overlap).toBe(false);` },
    ],
  },
  {
    id: 'with-timeout',
    group: 'Async',
    title: 'Give a promise a time limit',
    entry: 'withTimeout',
    prompt: 'Resolve or reject like the given promise, unless it takes longer than `ms` milliseconds. In that case reject with an Error whose message is "Timed out after <ms>ms".',
    starter: `function withTimeout(promise, ms) {\n  \n}\n`,
    solution: `function withTimeout(promise, ms) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(\`Timed out after \${ms}ms\`)), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}
`,
    tests: [
      { name: 'resolves with the value when the promise is fast enough', code: `expect(await withTimeout(sleep(10).then(() => 'done'), 200)).toBe('done');` },
      { name: 'rejects when the promise is too slow', code: `await expect(withTimeout(sleep(200), 30)).rejects.toThrow('Timed out after 30ms');` },
      { name: 'passes on the original rejection', code: `const failing = sleep(5).then(() => { throw new Error('503'); }); failing.catch(() => {}); await expect(withTimeout(failing, 200)).rejects.toThrow('503');` },
    ],
  },
  {
    id: 'run-in-order',
    group: 'Async',
    title: 'Run async tasks one after another',
    entry: 'runInOrder',
    prompt: 'Each task is an async function. Run them strictly one after another, never two at the same time, and resolve with an array of their results in the same order.',
    starter: `async function runInOrder(tasks) {\n  \n}\n`,
    solution: `async function runInOrder(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
`,
    tests: [
      { name: 'returns the results in task order', code: `expect(await runInOrder([async () => 'a', async () => 'b', async () => 'c'])).toEqual(['a', 'b', 'c']);` },
      {
        name: 'finishes each task before starting the next',
        code: `const log = [];
const task = (name, ms) => async () => { log.push('start ' + name); await sleep(ms); log.push('end ' + name); return name; };
await runInOrder([task('slow', 40), task('fast', 5)]);
expect(log).toEqual(['start slow', 'end slow', 'start fast', 'end fast']);`,
      },
      { name: 'returns an empty array for no tasks', code: `expect(await runInOrder([])).toEqual([]);` },
      { name: 'stops at the first task that fails', code: `let ran = false; await expect(runInOrder([async () => { throw new Error('boom'); }, async () => { ran = true; }])).rejects.toThrow('boom'); expect(ran).toBe(false);` },
    ],
  },
];
