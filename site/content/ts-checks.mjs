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
];
