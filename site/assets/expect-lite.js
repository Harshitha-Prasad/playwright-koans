// A small `expect` for plain values, modelled on the one in Playwright Test.
// It runs in the browser (the playground) and in Node (npm run site:check), so the hidden tests
// behind the JavaScript exercises behave the same in both.

export class ExpectationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'Error';
  }
}

/** Formats a value for an error message. */
export function format(value, depth = 0) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (typeof value === 'bigint') return `${value}n`;
  if (value === undefined || value === null || typeof value !== 'object') return String(value);
  if (value instanceof RegExp) return String(value);
  if (value instanceof Error) return `[${value.name}: ${value.message}]`;
  if (value instanceof Date) return `Date(${Number.isNaN(value.getTime()) ? 'Invalid' : value.toISOString()})`;
  if (depth > 4) return Array.isArray(value) ? '[…]' : '{…}';
  if (value instanceof Map) return `Map(${format([...value.entries()], depth + 1)})`;
  if (value instanceof Set) return `Set(${format([...value.values()], depth + 1)})`;
  if (Array.isArray(value)) return `[${value.map((item) => format(item, depth + 1)).join(', ')}]`;
  const entries = Object.entries(value).map(([key, entry]) => `${key}: ${format(entry, depth + 1)}`);
  return entries.length ? `{ ${entries.join(', ')} }` : '{}';
}

/** Deep equality in the style of toEqual: undefined properties count as missing. */
export function deepEqual(a, b, strict = false) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp && b instanceof RegExp) return String(a) === String(b);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Map && b instanceof Map) return deepEqual([...a.entries()], [...b.entries()], strict);
  if (a instanceof Set && b instanceof Set) return deepEqual([...a.values()], [...b.values()], strict);
  if (Array.isArray(a)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index], strict));
  }
  const keys = (object) => Object.keys(object).filter((key) => strict || object[key] !== undefined);
  const keysA = keys(a);
  const keysB = keys(b);
  return keysA.length === keysB.length && keysA.every((key) => keysB.includes(key) && deepEqual(a[key], b[key], strict));
}

function isSubset(object, subset) {
  if (typeof subset !== 'object' || subset === null) return deepEqual(object, subset);
  if (typeof object !== 'object' || object === null) return false;
  if (Array.isArray(subset)) {
    return Array.isArray(object) && object.length === subset.length && subset.every((item, index) => isSubset(object[index], item));
  }
  return Object.keys(subset).every((key) => key in object && isSubset(object[key], subset[key]));
}

function report(matcher, isNot, customMessage, lines) {
  const header = `expect(received).${isNot ? 'not.' : ''}${matcher}`;
  const text = [customMessage, header, '', ...lines].filter((line) => line !== undefined && line !== null).join('\n');
  return new ExpectationError(text);
}

/** The synchronous matchers for one received value. */
export function valueMatchers(received, { isNot = false, message } = {}) {
  const check = (matcher, pass, lines) => {
    if (pass === isNot) throw report(matcher, isNot, message, lines);
  };
  const expectedReceived = (expected) => [`Expected: ${isNot ? 'not ' : ''}${format(expected)}`, `Received: ${format(received)}`];

  const matchers = {
    toBe: (expected) => check('toBe(expected)', Object.is(received, expected), expectedReceived(expected)),
    toEqual: (expected) => check('toEqual(expected)', deepEqual(received, expected), expectedReceived(expected)),
    toStrictEqual: (expected) => check('toStrictEqual(expected)', deepEqual(received, expected, true), expectedReceived(expected)),
    toBeTruthy: () => check('toBeTruthy()', !!received, [`Received: ${format(received)}`]),
    toBeFalsy: () => check('toBeFalsy()', !received, [`Received: ${format(received)}`]),
    toBeNull: () => check('toBeNull()', received === null, [`Received: ${format(received)}`]),
    toBeUndefined: () => check('toBeUndefined()', received === undefined, [`Received: ${format(received)}`]),
    toBeDefined: () => check('toBeDefined()', received !== undefined, [`Received: ${format(received)}`]),
    toBeNaN: () => check('toBeNaN()', Number.isNaN(received), [`Received: ${format(received)}`]),
    toBeGreaterThan: (expected) => check('toBeGreaterThan(expected)', received > expected, [`Expected: > ${format(expected)}`, `Received:   ${format(received)}`]),
    toBeGreaterThanOrEqual: (expected) => check('toBeGreaterThanOrEqual(expected)', received >= expected, [`Expected: >= ${format(expected)}`, `Received:    ${format(received)}`]),
    toBeLessThan: (expected) => check('toBeLessThan(expected)', received < expected, [`Expected: < ${format(expected)}`, `Received:   ${format(received)}`]),
    toBeLessThanOrEqual: (expected) => check('toBeLessThanOrEqual(expected)', received <= expected, [`Expected: <= ${format(expected)}`, `Received:    ${format(received)}`]),
    toBeCloseTo: (expected, digits = 2) =>
      check('toBeCloseTo(expected)', Math.abs(expected - received) < 10 ** -digits / 2, expectedReceived(expected)),
    toBeInstanceOf: (expected) =>
      check('toBeInstanceOf(expected)', received instanceof expected, [`Expected constructor: ${expected?.name}`, `Received: ${format(received)}`]),
    toContain: (expected) => {
      const pass = typeof received === 'string' ? received.includes(expected) : Array.from(received ?? []).includes(expected);
      check('toContain(expected)', pass, [`Expected ${typeof received === 'string' ? 'substring' : 'value'}: ${isNot ? 'not ' : ''}${format(expected)}`, `Received: ${format(received)}`]);
    },
    toContainEqual: (expected) =>
      check('toContainEqual(expected)', Array.from(received ?? []).some((item) => deepEqual(item, expected)), expectedReceived(expected)),
    toHaveLength: (expected) =>
      check('toHaveLength(expected)', received?.length === expected, [`Expected length: ${isNot ? 'not ' : ''}${expected}`, `Received length: ${received?.length}`, `Received: ${format(received)}`]),
    toMatch: (expected) => {
      const pass = expected instanceof RegExp ? expected.test(received) : String(received).includes(expected);
      check('toMatch(expected)', pass, [`Expected ${expected instanceof RegExp ? 'pattern' : 'substring'}: ${isNot ? 'not ' : ''}${format(expected)}`, `Received: ${format(received)}`]);
    },
    toMatchObject: (expected) => check('toMatchObject(expected)', isSubset(received, expected), expectedReceived(expected)),
    toHaveProperty: (path, ...rest) => {
      const keys = Array.isArray(path) ? path : String(path).split('.');
      let current = received;
      let found = true;
      for (const key of keys) {
        if (current === null || current === undefined || !(key in Object(current))) {
          found = false;
          break;
        }
        current = current[key];
      }
      const pass = found && (rest.length === 0 || deepEqual(current, rest[0]));
      check('toHaveProperty(path)', pass, [`Expected path: ${format(path)}`, ...(rest.length ? [`Expected value: ${format(rest[0])}`] : []), `Received: ${format(received)}`]);
    },
    toThrow: (expected) => {
      let thrown;
      let didThrow = false;
      try {
        received();
      } catch (error) {
        didThrow = true;
        thrown = error;
      }
      check('toThrow()', didThrow && messageMatches(thrown, expected), thrownLines(didThrow, thrown, expected, 'function did not throw'));
    },
  };
  return matchers;
}

function messageMatches(error, expected) {
  if (expected === undefined) return true;
  const text = error?.message ?? String(error);
  if (expected instanceof RegExp) return expected.test(text);
  if (typeof expected === 'string') return text.includes(expected);
  if (typeof expected === 'function') return error instanceof expected;
  return false;
}

function thrownLines(didThrow, thrown, expected, nothing) {
  return [
    ...(expected === undefined ? [] : [`Expected: ${format(expected)}`]),
    didThrow ? `Received message: ${format(thrown?.message ?? String(thrown))}` : `Received: ${nothing}`,
  ];
}

function withNot(build) {
  const matchers = build(false);
  matchers.not = build(true);
  return matchers;
}

/** `.resolves` and `.rejects`: every matcher becomes async and applies to the settled value. */
function settled(promise, kind, message) {
  const build = (isNot) =>
    new Proxy(
      {},
      {
        get: (_, name) => {
          if (name === 'toThrow') {
            return async (expected) => {
              const outcome = await Promise.resolve(promise).then(
                () => ({ didThrow: false }),
                (error) => ({ didThrow: true, error }),
              );
              if (kind !== 'rejects') throw new ExpectationError('.toThrow() is used with .rejects');
              const pass = outcome.didThrow && messageMatches(outcome.error, expected);
              if (pass === isNot) {
                throw report('rejects.toThrow()', isNot, message, thrownLines(outcome.didThrow, outcome.error, expected, 'promise resolved instead of rejecting'));
              }
            };
          }
          return async (...args) => {
            let value;
            try {
              value = await promise;
              if (kind === 'rejects') throw report(`rejects.${String(name)}()`, isNot, message, [`Received: promise resolved with ${format(value)} instead of rejecting`]);
            } catch (error) {
              if (error instanceof ExpectationError || kind === 'resolves') {
                if (error instanceof ExpectationError) throw error;
                throw report(`resolves.${String(name)}()`, isNot, message, [`Received: promise rejected with ${format(error)}`]);
              }
              value = error;
            }
            return valueMatchers(value, { isNot, message })[name](...args);
          };
        },
      },
    );
  return withNot(build);
}

/** expect(value) for plain values. */
export function expectValue(received, message) {
  const matchers = withNot((isNot) => valueMatchers(received, { isNot, message }));
  Object.defineProperty(matchers, 'resolves', { get: () => settled(received, 'resolves', message) });
  Object.defineProperty(matchers, 'rejects', { get: () => settled(received, 'rejects', message) });
  return matchers;
}
