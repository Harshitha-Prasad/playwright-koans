// Runs a "predict the output" snippet and returns the lines it logged.
// Shared by the browser (site/assets/predict.js) and by the CI check (site/check-content.mjs).

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export function formatValue(value) {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value);
}

export async function runSnippet(code) {
  const lines = [];
  const log = (...values) => lines.push(values.map(formatValue).join(' '));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    await new AsyncFunction('log', 'sleep', code)(log, sleep);
  } catch (error) {
    lines.push(`Uncaught ${error?.name ?? 'Error'}: ${error?.message ?? error}`);
  }
  return lines;
}

/** Normalises a typed prediction so that quotes and stray spaces do not count as mistakes. */
export function normalisePrediction(text) {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^(['"`])(.*)\1$/, '$2'))
    .filter((line) => line.length > 0);
}
