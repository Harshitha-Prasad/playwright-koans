// "Does it compile?" exercises for TypeScript.
// `compiles` is verified with the real compiler (strict mode) by `npm run site:check`.

export const tsChecks = [
  {
    id: 'union-literal',
    title: 'A union of string literals',
    code: `type Status = 'passed' | 'failed' | 'skipped';

const status: Status = 'flaky';`,
    compiles: false,
    why: "'flaky' is not one of the three allowed values. A union of literals turns a typo in a status, role or environment name into a compile error instead of a test that silently checks the wrong thing.",
  },
  {
    id: 'unknown-needs-narrowing',
    title: 'Using a value of type unknown',
    code: `function size(value: unknown) {
  return value.length;
}`,
    compiles: false,
    why: 'unknown accepts any value but lets you do nothing with it until you narrow it, for example with typeof value === "string". That makes it the safe type for API responses and parsed JSON.',
  },
  {
    id: 'any-switches-off',
    title: 'The same function with any',
    code: `function size(value: any) {
  return value.length;
}

size(42);`,
    compiles: true,
    why: 'any switches type checking off, so this compiles and returns undefined at runtime. Every any in a test framework is a place where the compiler has stopped helping you.',
  },
  {
    id: 'optional-property',
    title: 'An optional property',
    code: `interface User {
  name: string;
  email?: string;
}

const user: User = { name: 'Ada' };
const domain = user.email.split('@')[1];`,
    compiles: false,
    why: 'email may be undefined, and strict mode will not let you call a method on it. Use user.email?.split(...) or check it first. This is the compiler catching a "Cannot read properties of undefined" before the test runs.',
  },
  {
    id: 'partial',
    title: 'Partial<T>',
    code: `interface Order {
  id: number;
  item: string;
}

const patch: Partial<Order> = { item: 'Latte' };`,
    compiles: true,
    why: 'Partial makes every property optional. It is the usual type for test-data overrides: buildOrder({ item: "Latte" }) merges a Partial<Order> over sensible defaults.',
  },
  {
    id: 'as-const',
    title: 'as const',
    code: `const sizes = ['S', 'M', 'L'] as const;

sizes.push('XL');`,
    compiles: false,
    why: 'as const makes the array readonly and narrows its type to exactly those three values. Combined with typeof sizes[number] it gives you a union type and a runtime list from a single definition.',
  },
  {
    id: 'excess-property',
    title: 'An extra property in an object literal',
    code: `interface Config {
  retries: number;
}

const config: Config = { retries: 2, timeout: 30 };`,
    compiles: false,
    why: 'Object literals are checked for excess properties. This catches misspelled option names, such as timeOut for timeout, at the moment you write them.',
  },
  {
    id: 'structural-typing',
    title: 'The same extra property, assigned through a variable',
    code: `interface Named {
  name: string;
}

const page = { name: 'Menu', url: '/menu' };
const named: Named = page;`,
    compiles: true,
    why: 'TypeScript is structurally typed: a value fits a type if it has at least the required properties. The excess-property check only applies to object literals written in place.',
  },
  {
    id: 'narrowing',
    title: 'Narrowing a union',
    code: `function show(value: string | number) {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return value.toUpperCase();
}`,
    compiles: true,
    why: 'Inside the if, the compiler knows value is a number. After it, only string is left. This flow-based narrowing is what makes unions practical.',
  },
  {
    id: 'promise-arithmetic',
    title: 'A promise used as a number',
    code: `async function getCount(): Promise<number> {
  return 3;
}

async function main() {
  const total = getCount() + 1;
  return total;
}`,
    compiles: false,
    why: 'getCount() without await is a Promise<number>, and a promise cannot be added to a number. The types catch this forgotten await. They do not catch a forgotten await on a call whose result you ignore, which is what the no-floating-promises lint rule is for.',
  },
  {
    id: 'record',
    title: 'Record<Keys, Value>',
    code: `const timeouts: Record<'action' | 'test', number> = {
  action: 3000,
};`,
    compiles: false,
    why: 'Record with a union of keys requires every key to be present, so "test" is missing here. It is a good fit for lookup tables such as URLs per environment or users per role.',
  },
  {
    id: 'generic-return',
    title: 'What a generic function returns',
    code: `function first<T>(items: T[]): T | undefined {
  return items[0];
}

const label: string = first(['a', 'b']);`,
    compiles: false,
    why: 'T is inferred as string, so the call returns string | undefined, and undefined is not assignable to string. Generics carry the caller\'s type through a helper without resorting to any.',
  },
  {
    id: 'type-guard',
    title: 'A user-defined type guard',
    code: `interface ApiError {
  message: string;
}

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'message' in value;
}

function describe(value: unknown) {
  if (isApiError(value)) {
    return value.message.toUpperCase();
  }
  return 'unknown';
}`,
    compiles: true,
    why: 'The return type "value is ApiError" tells the compiler that a true result narrows the argument. Inside the if, value is an ApiError. The guard itself is trusted, not verified: if its check is sloppy, the types lie.',
  },
  {
    id: 'exhaustive-switch',
    title: 'A switch that misses a case',
    code: `type Result =
  | { status: 'passed' }
  | { status: 'failed'; error: string }
  | { status: 'skipped'; reason: string };

function summary(result: Result): string {
  switch (result.status) {
    case 'passed':
      return 'ok';
    case 'failed':
      return result.error;
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}`,
    compiles: false,
    why: 'The shared status field makes this a discriminated union: each case narrows result to one member. "skipped" is not handled, so result is not never in the default branch and the assignment fails. Add a status later and the compiler points at every switch that forgot it.',
  },
  {
    id: 'catch-unknown',
    title: 'The error in a catch block',
    code: `function parse(text: string) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return error.message;
  }
}`,
    compiles: false,
    why: 'Under strict, a caught error has type unknown, because anything can be thrown. Narrow it first: if (error instanceof Error) return error.message.',
  },
  {
    id: 'keyof',
    title: 'keyof limits the keys',
    code: `interface Order {
  id: number;
  item: string;
}

function read<K extends keyof Order>(order: Order, key: K): Order[K] {
  return order[key];
}

const order = { id: 1, item: 'Latte' };
const price = read(order, 'price');`,
    compiles: false,
    why: "keyof Order is the union 'id' | 'item', so 'price' is rejected. The return type Order[K] follows the key: read(order, 'id') is a number, read(order, 'item') a string.",
  },
  {
    id: 'typeof-indexed',
    title: 'A union type from an array',
    code: `const ROLES = ['admin', 'barista', 'guest'] as const;
type Role = (typeof ROLES)[number];

const role: Role = 'barista';`,
    compiles: true,
    why: "typeof ROLES is the readonly tuple type, and indexing it with number gives the union of its elements: 'admin' | 'barista' | 'guest'. One definition serves as the runtime list (for loops and parameterised tests) and as the type.",
  },
  {
    id: 'returntype-promise',
    title: 'ReturnType of an async function',
    code: `async function loadUser() {
  return { id: 1, name: 'Ada' };
}

type User = ReturnType<typeof loadUser>;

const user: User = { id: 2, name: 'Grace' };`,
    compiles: false,
    why: 'An async function returns a promise, so ReturnType gives Promise<{ id: number; name: string }>. To get the resolved type, wrap it: Awaited<ReturnType<typeof loadUser>>.',
  },
  {
    id: 'record-lookup',
    title: 'Looking up a key that may not exist',
    code: `const users: Record<string, { name: string }> = {};

const name = users['ada'].name;`,
    compiles: true,
    why: 'It compiles and then throws at runtime, because users["ada"] is undefined. With a string index, TypeScript assumes every key exists. The compiler option noUncheckedIndexedAccess, which is not part of strict, adds undefined to such lookups.',
  },
  {
    id: 'non-null-assertion',
    title: 'The ! operator',
    code: `function lengthOfFirstMatch(items: string[]) {
  return items.find((item) => item.startsWith('x'))!.length;
}`,
    compiles: true,
    why: 'find returns string | undefined. The ! tells the compiler "this is not undefined" without checking anything, so it compiles and throws when nothing matches. An explicit check with a clear error message is safer.',
  },
  {
    id: 'readonly-property',
    title: 'A readonly property',
    code: `interface Config {
  readonly baseURL: string;
}

const config: Config = { baseURL: 'http://localhost:4173' };
config.baseURL = 'https://staging.example.com';`,
    compiles: false,
    why: 'readonly properties can be set when the object is created and not afterwards. It is a compile-time rule only: nothing stops the assignment in plain JavaScript.',
  },
  {
    id: 'omit',
    title: 'Omit<T, K>',
    code: `interface User {
  id: number;
  name: string;
  password: string;
}

type PublicUser = Omit<User, 'password'>;

const user: PublicUser = { id: 1, name: 'Ada', password: 'secret' };`,
    compiles: false,
    why: 'Omit builds a type without the listed keys, so password is an excess property in this literal. Pick is its counterpart. Both are handy for request payloads and for the "public" shape of a model.',
  },
  {
    id: 'optional-parameter',
    title: 'Optional parameter, required property',
    code: `function open(path: string, options?: { timeout: number }) {
  return path + (options?.timeout ?? 0);
}

open('/menu');
open('/menu', {});`,
    compiles: false,
    why: 'The ? makes the whole options argument optional, so the first call is fine. Once an options object is passed, its timeout is required, and {} lacks it. Write { timeout?: number } to make the property optional as well.',
  },
  {
    id: 'private-member',
    title: 'A private constructor parameter',
    code: `class MenuPage {
  constructor(private readonly page: { goto(url: string): void }) {}

  open() {
    this.page.goto('/menu');
  }
}

const menu = new MenuPage({ goto() {} });
menu.page.goto('/checkout');`,
    compiles: false,
    why: 'A constructor parameter with private or readonly becomes a property of the class automatically. private makes it usable inside the class only, which is how a page object keeps tests from reaching past it to the raw page.',
  },
  {
    id: 'satisfies-keys',
    title: 'satisfies keeps the keys',
    code: `const timeouts = { action: 3000, test: 15000 } satisfies Record<string, number>;

const action: number = timeouts.action;
const navigation = timeouts.navigation;`,
    compiles: false,
    why: 'satisfies checks the object against the type without widening it, so the compiler still knows the exact keys and navigation does not exist. With an annotation (const timeouts: Record<string, number>) every key would be accepted and the typo would go unnoticed.',
  },
];
