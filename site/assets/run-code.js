// Marks an answer in the JavaScript track: defines the learner's function, then runs the
// challenge's tests against it. Used by the browser (inside a Web Worker) and by Node in CI.

import { expectValue } from './expect-lite.js';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runCodeChallenge(code, challenge) {
  const { entry, tests } = challenge;
  let fn;
  try {
    const cleaned = code.replace(/^\s*export\s+(default\s+)?/gm, '');
    fn = new Function(`"use strict";\n${cleaned}\n;return typeof ${entry} === 'undefined' ? undefined : ${entry};`)();
  } catch (error) {
    const kind = error instanceof SyntaxError ? 'That is not valid JavaScript yet' : 'Your code threw while it was being loaded';
    return { error: `${kind}: ${error.message}`, results: [] };
  }
  if (typeof fn !== 'function') {
    return { error: `Define a function called ${entry}. The tests call it by that name.`, results: [] };
  }

  const results = [];
  for (const test of tests) {
    try {
      await new AsyncFunction(entry, 'expect', 'sleep', test.code)(fn, expectValue, sleep);
      results.push({ name: test.name, ok: true });
    } catch (error) {
      results.push({ name: test.name, ok: false, message: error?.message ?? String(error) });
    }
  }
  return { error: null, results };
}
