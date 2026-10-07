// Builds the static website into dist/.  Run with: npm run site:build
//
// The site has no content of its own. Everything comes from files that are also used elsewhere:
//   notes/*.md                     the topic pages and the interview question bank
//   site/content/*.mjs             the in-browser exercises
//   prompts/mock-interviewer.md    the AI interviewer prompt

import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

import { site } from './site.config.mjs';
import { loadNotes } from './notes.mjs';
import { locatorChallenges, parityProbes } from './content/locator-challenges.mjs';
import { jsChallenges } from './content/js-challenges.mjs';
import { tsChecks } from './content/ts-checks.mjs';
import { stepChallenges } from './content/step-challenges.mjs';
import { codeChallenges } from './content/code-challenges.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- layout ----------

const NAV = [
  { href: 'playground.html', label: 'Playground' },
  { href: 'javascript.html', label: 'JavaScript quiz' },
  { href: 'typescript.html', label: 'TypeScript quiz' },
  { href: 'koans.html', label: 'Failing tests' },
  { href: 'learn.html', label: 'Notes' },
  { href: 'interview.html', label: 'Mock interview' },
];

function layout({ file, title, description = site.description, body, scripts = [], wide = false }) {
  const fullTitle = file === 'index.html' ? `${site.name}: ${site.tagline.toLowerCase()}` : `${title} | ${site.name}`;
  const nav = NAV.map(
    (item) => `<a href="${item.href}"${item.href === file ? ' aria-current="page"' : ''}>${item.label}</a>`,
  ).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
<script>
  // Apply a saved theme before the first paint.
  try { const theme = localStorage.getItem('r2g:theme'); if (theme) document.documentElement.dataset.theme = theme; } catch {}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="brand" href="index.html" aria-label="${escapeHtml(site.name)}, home">
    <span class="brand-mark" aria-hidden="true"><i></i><i></i></span>${escapeHtml(site.name)}
  </a>
  <nav class="site-nav" aria-label="Main">${nav}</nav>
  <div class="header-tools">
    <a href="${site.repoUrl}">GitHub</a>
    <button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch between light and dark theme">Theme</button>
  </div>
</header>
<main id="main" class="${wide ? 'wide' : ''}">
${body}
</main>
<footer class="site-footer">
  <p>${escapeHtml(site.name)} is free and open source under the MIT licence. <a href="${site.repoUrl}">Fork it on GitHub</a>, improve a question, add your own.</p>
  <p>Your progress is saved in this browser only. Nothing is sent anywhere.</p>
</footer>
<script type="module" src="assets/site.js"></script>
${scripts.map((src) => `<script type="module" src="${src}"></script>`).join('\n')}
</body>
</html>
`;
}

// ---------- pages ----------

function homePage(notes) {
  const questionCount = notes.reduce((sum, note) => sum + note.questions.length, 0);
  const practice = [
    {
      href: 'playground.html',
      name: 'Playground',
      count: `${locatorChallenges.length + stepChallenges.length + codeChallenges.length} challenges`,
      text: 'Write locators, short Playwright tests and JavaScript functions, and have them run and marked on the spot. Works on a phone.',
    },
    {
      href: 'javascript.html',
      name: 'Predict the output',
      count: `${jsChallenges.length} snippets`,
      text: 'Promises, await, the event loop and the JavaScript traps that cause flaky tests. Guess first, then run it.',
    },
    {
      href: 'typescript.html',
      name: 'Does it compile?',
      count: `${tsChecks.length} snippets`,
      text: 'Unions, unknown, utility types and generics. Decide whether the compiler accepts each one.',
    },
    {
      href: 'interview.html',
      name: 'Mock interview',
      count: `${questionCount} questions`,
      text: 'Concept and scenario questions with model answers. Rate yourself and it brings back what you missed.',
    },
    {
      href: 'koans.html',
      name: 'Fix failing tests',
      count: '65 tests',
      text: 'Fork the repository and repair real Playwright tests on your own machine, from locators to CI reports.',
    },
  ];

  const topics = notes
    .map(
      (note) => `<tr>
        <td class="num">${note.number}</td>
        <td><a href="${note.file}">${escapeHtml(note.title)}</a></td>
        <td class="num">${note.questions.length} questions</td>
      </tr>`,
    )
    .join('\n');

  return layout({
    file: 'index.html',
    title: site.name,
    wide: true,
    scripts: ['assets/playground-page.js'],
    body: `
<section class="hero">
  <div class="hero-copy">
    <h1>Practise QA the way interviews ask you to do it.</h1>
    <p class="lede">Hands-on exercises for Playwright, TypeScript, JavaScript and testing fundamentals. They run in your browser, with nothing to install.</p>
    <p class="hero-actions">
      <a class="button" href="playground.html">Open the playground</a>
      <a class="button quiet" href="interview.html">Start a mock interview</a>
    </p>
  </div>
  <div class="hero-demo" id="hero-demo">
    <p class="demo-brief"><strong>Try one now.</strong> This locator matches five buttons, so a click would fail. Change it until it matches only the Cold Brew button.</p>
    <div data-playground="strict-mode"></div>
  </div>
</section>

<section class="band">
  <h2>Five ways to practise</h2>
  <ul class="practice-list">
    ${practice
      .map(
        (item) => `<li>
      <a href="${item.href}"><span class="practice-name">${item.name}</span><span class="practice-count">${item.count}</span></a>
      <p>${item.text}</p>
    </li>`,
      )
      .join('\n')}
  </ul>
</section>

<section class="band split">
  <div>
    <h2>Why another interview guide?</h2>
    <p>Most guides are lists of questions and answers. Reading them feels like knowing, until someone asks you to write the locator.</p>
  </div>
  <dl class="reasons">
    <dt>You answer before you see the answer</dt>
    <dd>Every exercise asks for your attempt first: a locator, a prediction, a yes or no. Recall is what makes it stick.</dd>
    <dt>The code answers are executed, not asserted</dt>
    <dd>Every locator, test, snippet and solution on this site is run by automated tests on each change, and the playground is compared with real Playwright. The written answers link to the official documentation they were checked against.</dd>
    <dt>It works with your AI assistant, not against it</dt>
    <dd>The repository ships an interviewer prompt that turns any assistant into the person asking the questions. <a href="ai-interviewer.html">Use AI to examine you</a>.</dd>
  </dl>
</section>

<section class="band">
  <h2>Topics</h2>
  <p>One page each: the idea in a few lines, a cheat sheet, and the questions interviewers tend to follow up with. Each answer names the official page it was checked against.</p>
  <table class="topics">
    <tbody>
    ${topics}
    </tbody>
  </table>
</section>
`,
  });
}

function notePage(note, notes) {
  const index = notes.indexOf(note);
  const previous = notes[index - 1];
  const next = notes[index + 1];
  const cards = note.questions
    .map(
      (question) => `<details class="qa" id="${question.id}">
  <summary>${marked.parseInline(question.question)}</summary>
  <div class="qa-answer">${marked.parse(question.answer)}</div>
</details>`,
    )
    .join('\n');

  return layout({
    file: note.file,
    title: note.title,
    description: `${note.title}: the idea in a few lines, a cheat sheet and ${note.questions.length} interview questions with answers.`,
    body: `
<article class="note">
  <p class="crumb"><a href="learn.html">Notes</a> / ${note.number}</p>
  <h1>${escapeHtml(note.title)}</h1>
  ${marked.parse(note.body)}
  <h2 id="questions">${escapeHtml(note.questionsHeading)}</h2>
  <p class="qa-tools">Answer out loud first, then open the card.
    <button type="button" class="link-button" data-qa-toggle>Open all</button>
  </p>
  ${cards}
  <nav class="pager" aria-label="More notes">
    ${previous ? `<a href="${previous.file}">Previous: ${escapeHtml(previous.title)}</a>` : '<span></span>'}
    ${next ? `<a href="${next.file}">Next: ${escapeHtml(next.title)}</a>` : '<span></span>'}
  </nav>
</article>
`,
  });
}

function learnPage(notes) {
  return layout({
    file: 'learn.html',
    title: 'Notes',
    description: 'One-page notes on Playwright, TypeScript, JavaScript and testing fundamentals, each with interview questions and answers.',
    body: `
<h1>Notes</h1>
<p class="lede">One page per topic. Read it in five minutes, then try to answer its questions without looking. Every answer ends with its source.</p>
<ol class="note-list">
${notes
  .map(
    (note) => `<li value="${Number(note.number)}">
  <a href="${note.file}">${escapeHtml(note.title)}</a>
  <span>${note.questions.length} questions</span>
</li>`,
  )
  .join('\n')}
</ol>
`,
  });
}

function playgroundPage() {
  return layout({
    file: 'playground.html',
    title: 'Playground',
    description: 'Practise Playwright locators, test steps and JavaScript in your browser. Your answer is run and marked on the spot, with nothing to install.',
    wide: true,
    scripts: ['assets/playground-page.js'],
    body: `
<h1>Playground</h1>
<p class="lede">Pick a track, write your answer, and have it checked. Nothing to install, and your progress stays in this browser.</p>
<div data-playground="all"></div>
<details class="aside-note">
  <summary>How close is this to real Playwright?</summary>
  <p><strong>JavaScript track:</strong> your code really runs, in a background worker, against hidden tests. Nothing is imitated.</p>
  <p><strong>Locators and test steps:</strong> real Playwright cannot run inside a web page, so these two tracks use a small imitation written for this site. It finds elements by Playwright's rules, waits and retries like Playwright, and reports errors in the same words. It supports the <code>getBy*</code> locators, <code>filter()</code>, the common actions (<code>click</code>, <code>fill</code>, <code>check</code>, <code>selectOption</code>, <code>hover</code>, <code>press</code>, <code>setInputFiles</code>), the common assertions, dialogs, <code>page.route()</code> and <code>page.waitForResponse()</code>.</p>
  <p>On every change to this site, automated tests run each reference answer and each typical mistake twice, once here and once in real Playwright, and fail if the two disagree. It is still an approximation: iframes, new tabs, downloads and traces are not covered. For those, <a href="koans.html">fix the failing tests</a> with the real tool.</p>
</details>
`,
  });
}

function redirectPage(file, target) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved</title>
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${target}">
</head>
<body><p>This page has moved to <a href="${target}">${target}</a>.</p></body>
</html>
`;
}

function javascriptPage() {
  return layout({
    file: 'javascript.html',
    title: 'Predict the output',
    description: 'JavaScript exercises for testers: promises, await, the event loop and common traps. Predict the output, then run the code in your browser.',
    scripts: ['assets/predict.js'],
    body: `
<h1>Predict the output</h1>
<p class="lede">Read the snippet, write down what it logs, then run it. In each snippet <code>log()</code> records a line and <code>sleep(ms)</code> waits.</p>
<p class="progress-line" id="predict-progress"></p>
<div id="predict-list"></div>
<p>Want the background first? Read <a href="note-00.html">JavaScript &amp; TypeScript essentials</a>.</p>
`,
  });
}

function typescriptPage() {
  return layout({
    file: 'typescript.html',
    title: 'Does it compile?',
    description: 'TypeScript exercises for testers: unions, unknown, utility types and generics. Decide whether each snippet compiles in strict mode.',
    scripts: ['assets/typecheck.js'],
    body: `
<h1>Does it compile?</h1>
<p class="lede">Each snippet is checked with <code>strict</code> mode on. Decide whether the TypeScript compiler accepts it, then see why.</p>
<p class="progress-line" id="ts-progress"></p>
<div id="ts-list"></div>
<p>Want the background first? Read <a href="note-10.html">TypeScript for testers</a>.</p>
`,
  });
}

function interviewPage() {
  return layout({
    file: 'interview.html',
    title: 'Mock interview',
    description: 'A self-run mock interview for QA engineers: concept and scenario questions with model answers, and a record of what you missed.',
    scripts: ['assets/interview.js'],
    body: `
<h1>Mock interview</h1>
<p class="lede">Answer each question out loud or on paper, then compare with the model answer and rate yourself honestly. Questions you miss come back first next time.</p>
<div id="interview"></div>
<p class="aside-line">Prefer to be asked follow-up questions? <a href="ai-interviewer.html">Let an AI assistant interview you</a>.</p>
`,
  });
}

function aiInterviewerPage() {
  const prompt = readFileSync(join(ROOT, 'prompts', 'mock-interviewer.md'), 'utf8').trim();
  return layout({
    file: 'ai-interviewer.html',
    title: 'AI interviewer',
    description: 'A prompt that turns any AI assistant into a QA interviewer who asks, follows up and gives feedback, without handing you the answers.',
    body: `
<h1>Let an AI assistant interview you</h1>
<p class="lede">AI assistants are good at giving answers, which is exactly how the fundamentals fade. Turn the roles around: the assistant asks, you answer, and it tells you where the answer fell short.</p>

<h2>In any chat assistant</h2>
<p>Copy this prompt into a new conversation.</p>
<div class="copy-block">
  <button type="button" class="button small" data-copy="#interviewer-prompt">Copy prompt</button>
  <pre id="interviewer-prompt">${escapeHtml(prompt)}</pre>
</div>

<h2>In a coding agent, inside your fork</h2>
<p>The repository includes the same rules as a skill at <code>.claude/skills/mock-interview</code>. Open your fork in an agent that supports skills and ask it to run a mock interview. It can then see which failing tests you have not solved yet and review your solutions without rewriting them.</p>

<h2>Three habits that keep you sharp</h2>
<ul>
  <li>Solve first, ask second. Ask the assistant to review your answer, not to produce one.</li>
  <li>Ask for the follow-up question. Real interviews are decided on the second and third question about a topic.</li>
  <li>Ask it to be strict. "Would this answer pass a senior interview? What is missing?"</li>
</ul>
`,
  });
}

function koansPage(notes) {
  const modules = [
    ['00', 'JavaScript & TypeScript essentials', 10],
    ['01', 'Locators', 7],
    ['02', 'Auto-waiting and web-first assertions', 6],
    ['03', 'UI components', 11],
    ['04', 'Fixtures, hooks and page objects', 7],
    ['05', 'Network: API tests, mocking, responses', 8],
    ['06', 'Error handling, retries and polling', 6],
    ['07', 'Debugging', 5],
    ['08', 'Reporting and CI', 5],
  ];
  const noteFile = (number) => notes.find((note) => note.number === number)?.file;
  return layout({
    file: 'koans.html',
    title: 'Fix failing tests',
    description: '65 failing Playwright tests in 9 modules, with a demo app included. Fork the repository and make them pass, one concept at a time.',
    body: `
<h1>Fix failing tests</h1>
<p class="lede">The <a href="playground.html">playground</a> runs in your browser. This part runs on your machine, with real Playwright: 65 small tests that fail on purpose, and a demo café app for them to run against.</p>

<h2>How it works</h2>
<p>Each test isolates one idea. Some have a blank to fill in. Others contain a realistic mistake, such as a hard-coded sleep or a locator that matches five buttons. You make the test pass, and the tool tells you which one is next.</p>
<pre><code>const email: Locator = todo('locate the field by its label text');</code></pre>
<p>This style of exercise is known among programmers as a <em>koan</em>, which is why the repository is called <code>playwright-koans</code>. The word comes from Zen practice, where a koan is a short puzzle a student works on until it clicks. Ruby Koans made the idea popular for code: a set of failing tests that teach a language as you fix them.</p>

<h2>Start</h2>
<p>You need Node.js 20 or newer.</p>
<pre><code>git clone https://github.com/&lt;you&gt;/playwright-koans.git   # your fork
cd playwright-koans
npm install
npx playwright install chromium

npm run next</code></pre>
<p><code>npm run next</code> runs the tests in order and stops at the first red one. Open the file it names, fix the test, run it again.</p>
<p>Short on time? <code>npm run diagnostic</code> runs 17 tests, about two per module. Wherever you get stuck, do that whole module.</p>
<p><a class="button" href="${site.repoUrl}">Open the repository</a></p>

<h2>Modules</h2>
<table class="topics">
  <tbody>
  ${modules
    .map(
      ([number, title, count]) => `<tr>
    <td class="num">${number}</td>
    <td><a href="${noteFile(number)}">${escapeHtml(title)}</a></td>
    <td class="num">${count} tests</td>
  </tr>`,
    )
    .join('\n')}
  </tbody>
</table>

<h2>What you get out of it</h2>
<ul>
  <li>A trace for every failing test, so you practise reading call logs, DOM snapshots and network tabs.</li>
  <li>A reference solution for each test, for after you have tried.</li>
  <li>A CI workflow in your fork that shows how many tests you have turned green.</li>
</ul>
`,
  });
}

function notFoundPage() {
  return layout({
    file: '404.html',
    title: 'Page not found',
    body: `<h1>This page does not exist</h1><p class="lede">The address may be mistyped, or the page has moved.</p><p><a class="button" href="index.html">Go to the start page</a></p>`,
  });
}

// ---------- build ----------

const notes = loadNotes(join(ROOT, 'notes'));

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });
cpSync(join(ROOT, 'site', 'assets'), join(DIST, 'assets'), { recursive: true });

// Everything the browser scripts need, as one module.
const questions = notes.flatMap((note) =>
  note.questions.map((question) => ({
    id: question.id,
    topic: note.title,
    note: note.file,
    question: marked.parseInline(question.question),
    answer: marked.parse(question.answer),
  })),
);
writeFileSync(
  join(DIST, 'assets', 'data.js'),
  [
    '// Generated by site/build.mjs. Do not edit.',
    `export const locatorChallenges = ${JSON.stringify(locatorChallenges)};`,
    `export const jsChallenges = ${JSON.stringify(jsChallenges)};`,
    `export const tsChecks = ${JSON.stringify(tsChecks)};`,
    `export const stepChallenges = ${JSON.stringify(stepChallenges)};`,
    `export const codeChallenges = ${JSON.stringify(codeChallenges)};`,
    `export const questions = ${JSON.stringify(questions)};`,
    '',
  ].join('\n'),
);

const pages = [
  ['index.html', homePage(notes)],
  ['learn.html', learnPage(notes)],
  ['playground.html', playgroundPage()],
  ['javascript.html', javascriptPage()],
  ['typescript.html', typescriptPage()],
  ['interview.html', interviewPage()],
  ['ai-interviewer.html', aiInterviewerPage()],
  ['koans.html', koansPage(notes)],
  ['404.html', notFoundPage()],
  ...notes.map((note) => [note.file, notePage(note, notes)]),
];
for (const [file, html] of pages) writeFileSync(join(DIST, file), html);
// The Locator Gym became part of the playground. Old links keep working.
writeFileSync(join(DIST, 'locators.html'), redirectPage('locators.html', 'playground.html'));
writeFileSync(join(DIST, '.nojekyll'), '');

// A plain JSON copy of the content. The site tests read it to know what to check.
writeFileSync(
  join(DIST, 'content.json'),
  JSON.stringify({ pages: pages.map(([file]) => file), locatorChallenges, parityProbes, stepChallenges, codeChallenges, jsChallenges, tsChecks, questionCount: questions.length }),
);

console.log(`Built ${pages.length} pages, ${questions.length} questions, ${readdirSync(join(DIST, 'assets')).length} assets into dist/`);
