// Verifies the exercise content against the real thing.  Run with: npm run site:check
//
//   1. Every "predict the output" snippet is executed and must log exactly what `expected` says.
//   2. Every "does it compile?" snippet goes through the TypeScript compiler in strict mode and
//      must compile, or fail to, as `compiles` says.
//   3. Every note parses and has questions.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runSnippet } from './assets/run-snippet.js';
import { jsChallenges } from './content/js-challenges.mjs';
import { tsChecks } from './content/ts-checks.mjs';
import { loadNotes } from './notes.mjs';

const problems = [];

// 1. JavaScript snippets
for (const challenge of jsChallenges) {
  const actual = await runSnippet(challenge.code);
  if (JSON.stringify(actual) !== JSON.stringify(challenge.expected)) {
    problems.push(`js "${challenge.id}": expected ${JSON.stringify(challenge.expected)} but it logs ${JSON.stringify(actual)}`);
  }
}

// 2. TypeScript snippets
const directory = mkdtempSync(join(tmpdir(), 'r2g-ts-'));
try {
  for (const check of tsChecks) writeFileSync(join(directory, `${check.id}.ts`), `${check.code}\n\nexport {};\n`);
  writeFileSync(
    join(directory, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022'], types: [], skipLibCheck: true }, include: ['*.ts'] }),
  );
  const typescriptRoot = dirname(createRequire(import.meta.url).resolve('typescript/package.json'));
  const tsc = join(typescriptRoot, 'bin', 'tsc');
  const run = spawnSync(process.execPath, [tsc, '-p', directory, '--pretty', 'false'], { encoding: 'utf8' });
  const output = `${run.stdout}\n${run.stderr}`;
  for (const check of tsChecks) {
    const hasError = new RegExp(`(^|[\\\\/\\s])${check.id}\\.ts[(:]\\d+`, 'm').test(output);
    if (hasError === check.compiles) {
      problems.push(`ts "${check.id}": marked as ${check.compiles ? 'compiling' : 'a type error'}, but the compiler says otherwise`);
    }
  }
  if (!/error TS\d+/.test(output)) problems.push('ts: the compiler reported no errors at all, which means the check did not run properly');
} finally {
  rmSync(directory, { recursive: true, force: true });
}

// 3. Notes
const notes = loadNotes(fileURLToPath(new URL('../notes/', import.meta.url)));
for (const note of notes) {
  if (note.questions.length === 0) problems.push(`${note.sourceFile}: no questions found`);
  for (const question of note.questions) {
    if (!question.answer) problems.push(`${note.sourceFile}: "${question.question}" has no answer`);
  }
}

if (problems.length > 0) {
  console.error(`Content check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
const questionCount = notes.reduce((sum, note) => sum + note.questions.length, 0);
console.log(`Content check passed: ${jsChallenges.length} JavaScript snippets, ${tsChecks.length} TypeScript snippets, ${questionCount} questions in ${notes.length} notes.`);
