// The playground: three tracks of exercises that are marked in the browser.
//
//   locators  type one locator; the practice page shows what it matches as you type
//   steps     write a few lines of Playwright test code; a miniature runtime runs them
//   code      write a JavaScript function; hidden tests run against it in a Web Worker

import { evaluateLocator } from './locator-engine.js';
import { runSteps } from './pw-runtime.js';
import { brokenRules } from './rules.js';
import { el, readSection, saveResult } from './store.js';

const POSITIONAL = ['nth', 'xpath', 'positional css'];

const SNIPPETS = {
  locators: [
    ["getByRole('|', { name: '' })", 'getByRole'],
    ["getByText('|')", 'getByText'],
    ["getByLabel('|')", 'getByLabel'],
    ["getByPlaceholder('|')", 'getByPlaceholder'],
    ["getByTestId('|')", 'getByTestId'],
    [".filter({ hasText: '|' })", '.filter hasText'],
    ['.filter({ has: page.| })', '.filter has'],
  ],
  steps: [
    ["await page.getByRole('|', { name: '' })", 'getByRole'],
    ["await page.getByLabel('|')", 'getByLabel'],
    ["await page.getByTestId('|')", 'getByTestId'],
    ['.click();', '.click()'],
    [".fill('|');", '.fill()'],
    ["await expect(|).toHaveText('');", 'expect toHaveText'],
    ['await expect(|).toBeVisible();', 'expect toBeVisible'],
    ['await expect(|).toHaveCount(0);', 'expect toHaveCount'],
    ["page.once('dialog', (dialog) => dialog.accept());\n|", 'dialog'],
    ["await page.route('**/specials.json', (route) => route.fulfill({ json: [] }));\n|", 'route'],
  ],
  code: [],
};

const TRACKS = {
  locators: { label: 'Locators', run: 'Check locator', store: 'gym', lines: 3 },
  steps: { label: 'Test steps', run: 'Run test', store: 'steps', lines: 9 },
  code: { label: 'JavaScript', run: 'Run tests', store: 'code', lines: 11 },
};

function locatorQuality(used, allowed = []) {
  const flagged = (name) => used.includes(name) && !allowed.includes(name);
  if (POSITIONAL.some(flagged)) {
    return 'It works today. Positional locators (nth, first, last, XPath paths, :nth-child) break as soon as the page is reordered.';
  }
  if (flagged('css')) return 'It works. CSS classes and tag names are implementation details, though: a role, label or text survives a restyle.';
  if (flagged('getByTestId')) return 'It works. A test id is a fair choice, but here a role or label says more about what the user sees.';
  return 'Built from what a user perceives, so it survives refactoring.';
}

/** Runs a JavaScript answer in a worker and gives up if it does not finish. */
function runInWorker(code, challenge, limit = 5000) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('code-worker.js', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ error: `Your code did not finish within ${limit / 1000} seconds. Is there a loop that never ends, or a promise that never settles?`, results: [] });
    }, limit);
    const finish = (result) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    worker.onmessage = (event) => finish(event.data);
    worker.onerror = (event) => finish({ error: `The code could not be run: ${event.message}`, results: [] });
    worker.postMessage({ code, challenge: { entry: challenge.entry, tests: challenge.tests } });
  });
}

export function mountPlayground(container, { tracks, compact = false }) {
  const trackNames = Object.keys(tracks);
  const solved = Object.fromEntries(trackNames.map((name) => [name, readSection(TRACKS[name].store)]));
  const drafts = readSection('drafts');
  let track = trackNames[0];
  let index = 0;
  let frameDocument = null;
  let highlighted = new Map();
  let busy = false;

  // ----- elements -----

  const tabs = el('div', { class: 'pg-tabs', role: 'group', 'aria-label': 'Track' });
  const select = el('select', { class: 'pg-select', 'aria-label': 'Challenge' });
  const list = el('nav', { class: 'pg-list', 'aria-label': 'Challenges' });
  const place = el('p', { class: 'pg-place' });
  const prompt = el('h2', { class: 'pg-prompt' });
  const chips = el('div', { class: 'pg-chips', role: 'group', 'aria-label': 'Insert a snippet' });
  const editor = el('textarea', {
    class: 'pg-editor',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    autocorrect: 'off',
    'aria-label': 'Your answer',
  });
  const runButton = el('button', { type: 'button', class: 'button' });
  const hintButton = el('button', { type: 'button', class: 'link-button' }, 'Hint');
  const answerButton = el('button', { type: 'button', class: 'link-button' }, 'Show an answer');
  const resetButton = el('button', { type: 'button', class: 'link-button' }, 'Start over');
  const nextButton = el('button', { type: 'button', class: 'link-button', hidden: true }, 'Next challenge');
  const verdict = el('p', { class: 'verdict', role: 'status' });
  const details = el('div', { class: 'pg-details' });
  const extra = el('div', { class: 'pg-extra' });
  const frame = el('iframe', { class: 'pg-frame', title: 'Practice page: Koans Café' });
  const frameLabel = el('p', { class: 'pg-frame-label' });
  const preview = el('div', { class: 'pg-preview' }, frameLabel, frame);

  const work = el(
    'div',
    { class: 'pg-work' },
    compact ? null : place,
    prompt,
    compact ? null : chips,
    editor,
    el('div', { class: 'pg-actions' }, runButton, hintButton, answerButton, compact ? null : resetButton, nextButton),
    verdict,
    details,
    extra,
  );
  container.append(
    el(
      'div',
      { class: compact ? 'pg compact' : 'pg' },
      compact || trackNames.length < 2 ? null : tabs,
      el('div', { class: 'pg-body' }, compact ? null : el('div', { class: 'pg-nav' }, select, list), work, preview),
    ),
  );

  // ----- helpers -----

  const challenges = () => tracks[track];
  const current = () => challenges()[index];
  const draftKey = () => `${track}:${current().id}`;

  function show(kind, headline, detail) {
    verdict.className = `verdict ${kind}`;
    verdict.replaceChildren(el('strong', {}, headline), detail ? ` ${detail}` : '');
  }

  function markSolved() {
    const challenge = current();
    if (!solved[track][challenge.id]) {
      solved[track][challenge.id] = true;
      saveResult(TRACKS[track].store, challenge.id, true);
      renderNavigation();
    }
    nextButton.hidden = compact || index === challenges().length - 1;
  }

  function loadFrame() {
    return new Promise((resolve) => {
      frameDocument = null;
      frame.addEventListener(
        'load',
        () => {
          frameDocument = frame.contentDocument;
          resolve();
        },
        { once: true },
      );
      frame.src = `assets/practice.html?run=${Date.now()}`;
    });
  }

  function clearHighlights() {
    for (const [element, style] of highlighted) element.style.cssText = style;
    highlighted = new Map();
  }

  function highlight(elements) {
    for (const element of elements) {
      highlighted.set(element, element.style.cssText);
      element.style.outline = '3px solid #e09f00';
      element.style.outlineOffset = '1px';
      element.style.backgroundColor = '#ffd43b';
      element.style.color = '#16193a';
    }
    if (elements.length > 0) {
      const view = frameDocument.defaultView;
      const top = elements[0].getBoundingClientRect().top + view.scrollY;
      const bottom = elements[elements.length - 1].getBoundingClientRect().bottom + view.scrollY;
      const slack = Math.max(24, (view.innerHeight - (bottom - top)) / 2);
      view.scrollTo({ top: Math.max(0, top - slack) });
    }
  }

  // ----- the three ways of marking -----

  /** `explicit` is true when the learner pressed the button; false while they are typing. */
  function checkLocator(explicit) {
    if (!frameDocument) return;
    const challenge = current();
    clearHighlights();
    details.replaceChildren();

    let locator;
    try {
      locator = evaluateLocator(editor.value, frameDocument);
    } catch (error) {
      if (explicit) show('fail', 'Not a locator yet.', error.message);
      else show('', 'Keep typing.', 'The page updates as soon as the locator is complete.');
      return;
    }
    let found;
    try {
      found = locator.resolve();
    } catch (error) {
      show('fail', 'That selector could not be evaluated.', error.message);
      return;
    }
    highlight(found);
    const target = [...frameDocument.querySelectorAll(challenge.target)];
    const exact = found.length === target.length && found.every((element) => target.includes(element));

    if (exact) {
      const summary = target.length === 1 ? '1 element, the right one.' : `${found.length} elements, exactly the ones asked for.`;
      show('pass', `✓ ${summary}`, locatorQuality(locator.used, challenge.allow));
      markSolved();
      if (compact) extra.replaceChildren(el('p', {}, 'That is the whole idea. ', el('a', { href: 'playground.html' }, 'More challenges in the playground'), '.'));
    } else if (found.length === 0) {
      show('fail', '✘ 0 elements.', 'Playwright would keep waiting for this locator until the timeout, then fail.');
    } else if (!challenge.many && found.length > 1) {
      show('fail', `✘ strict mode violation: resolved to ${found.length} elements.`, 'A click or fill on this locator would throw. Narrow it down to one.');
    } else if (challenge.many) {
      show('fail', `✘ ${found.length} elements, not the right set.`, `This challenge is looking for ${target.length}.`);
    } else {
      show('fail', '✘ 1 element, but not the one asked for.', 'It is highlighted on the practice page.');
    }
  }

  async function runTestSteps() {
    const challenge = current();
    show('', 'Running…', 'Watch the practice page.');
    details.replaceChildren();
    await loadFrame();
    const outcome = await runSteps(editor.value, frameDocument);
    const notes = outcome.warnings.map((warning) => el('p', { class: 'pg-warning' }, warning));

    if (!outcome.ok) {
      const [headline, ...rest] = outcome.error.message.split('\n');
      show('fail', `✘ ${headline}`);
      details.replaceChildren(rest.length ? el('pre', { class: 'pg-log' }, rest.join('\n').trim()) : null, ...notes);
      return;
    }
    let reached = false;
    try {
      reached = new frameDocument.defaultView.Function(challenge.check)() === true;
    } catch {
      reached = false;
    }
    if (!reached) {
      show('fail', '✘ The code ran without errors, but the task is not done.', 'The practice page is not in the state the task describes. Compare it with the instructions.');
      details.replaceChildren(...notes);
      return;
    }
    const problems = brokenRules(challenge, outcome.usage);
    if (problems.length > 0) {
      show('fail', '✘ Nearly.', 'The page ends up right, but:');
      details.replaceChildren(el('ul', { class: 'pg-rules' }, problems.map((problem) => el('li', {}, problem))), ...notes);
      return;
    }
    show('pass', '✓ Passed.', 'The test did what was asked, with waiting that retries and no shortcuts.');
    details.replaceChildren(...notes);
    markSolved();
  }

  async function runCode() {
    const challenge = current();
    show('', 'Running…');
    details.replaceChildren();
    const outcome = await runInWorker(editor.value, challenge);
    if (outcome.error) {
      show('fail', '✘ The tests could not run.', outcome.error);
      return;
    }
    const passed = outcome.results.filter((result) => result.ok).length;
    const rows = outcome.results.map((result) =>
      el(
        'li',
        { class: result.ok ? 'right' : 'wrong' },
        el('span', { 'aria-hidden': 'true' }, result.ok ? '✓' : '✘'),
        el('div', {}, el('span', {}, result.name, el('span', { class: 'sr-only' }, result.ok ? ' (passed)' : ' (failed)')), result.ok ? null : el('pre', { class: 'pg-log' }, result.message)),
      ),
    );
    details.replaceChildren(el('ul', { class: 'pg-tests', 'aria-label': 'Test results' }, rows));
    if (passed === outcome.results.length) {
      show('pass', `✓ All ${passed} tests pass.`);
      markSolved();
    } else {
      show('fail', `✘ ${passed} of ${outcome.results.length} tests pass.`, 'The first failing test tells you what to look at.');
    }
  }

  async function run(explicit = true) {
    if (track === 'locators') {
      checkLocator(explicit);
      return;
    }
    if (busy) return;
    busy = true;
    runButton.disabled = true;
    try {
      if (track === 'steps') await runTestSteps();
      else await runCode();
    } finally {
      busy = false;
      runButton.disabled = false;
    }
  }

  // ----- rendering -----

  function renderNavigation() {
    tabs.replaceChildren(
      ...trackNames.map((name) => {
        const done = tracks[name].filter((challenge) => solved[name][challenge.id]).length;
        return el(
          'button',
          { type: 'button', class: 'pg-tab', 'aria-pressed': String(name === track), onclick: () => selectTrack(name) },
          TRACKS[name].label,
          ' ',
          el('span', { class: 'pg-tab-count' }, `${done}/${tracks[name].length}`),
        );
      }),
    );

    const groups = [...new Set(challenges().map((challenge) => challenge.group ?? ''))];
    const label = (challenge) => `${solved[track][challenge.id] ? '✓ ' : ''}${challenge.title}`;
    select.replaceChildren(
      ...groups.map((group) => {
        const options = challenges()
          .map((challenge, position) => ({ challenge, position }))
          .filter(({ challenge }) => (challenge.group ?? '') === group)
          .map(({ challenge, position }) => el('option', { value: String(position), selected: position === index }, label(challenge)));
        return group ? el('optgroup', { label: group }, options) : options;
      }).flat(),
    );
    list.replaceChildren(
      ...groups.flatMap((group) => [
        group ? el('h3', {}, group) : null,
        el(
          'ol',
          {},
          challenges()
            .map((challenge, position) => ({ challenge, position }))
            .filter(({ challenge }) => (challenge.group ?? '') === group)
            .map(({ challenge, position }) =>
              el(
                'li',
                {},
                el(
                  'button',
                  { type: 'button', 'aria-current': position === index ? 'true' : null, onclick: () => selectChallenge(position) },
                  el('span', { class: 'pg-tick', 'aria-hidden': 'true' }, solved[track][challenge.id] ? '✓' : ''),
                  el('span', {}, challenge.title, solved[track][challenge.id] ? el('span', { class: 'sr-only' }, ' (solved)') : null),
                ),
              ),
            ),
        ),
      ]),
    );
  }

  function renderChips() {
    chips.replaceChildren(
      ...SNIPPETS[track].map(([snippet, name]) => el('button', { type: 'button', class: 'pg-chip', onclick: () => insert(snippet) }, name)),
    );
    chips.hidden = SNIPPETS[track].length === 0;
  }

  /** Inserts a snippet at the cursor. A "|" in the snippet marks where the cursor ends up. */
  function insert(snippet) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const cursor = snippet.indexOf('|');
    const text = snippet.replace('|', '');
    editor.setRangeText(text, start, end, 'end');
    const position = start + (cursor === -1 ? text.length : cursor);
    editor.setSelectionRange(position, position);
    editor.focus();
    onEdit();
  }

  function selectChallenge(position, { keepDraft = true } = {}) {
    index = position;
    const challenge = current();
    const starter = challenge.starter ?? (track === 'locators' ? 'page.' : '');
    place.textContent = `${challenge.group ? `${challenge.group}, ` : ''}${index + 1} of ${challenges().length}`;
    prompt.textContent = challenge.prompt;
    editor.value = keepDraft && drafts[draftKey()] !== undefined ? drafts[draftKey()] : starter;
    editor.rows = Math.max(TRACKS[track].lines, editor.value.split('\n').length + 1);
    extra.replaceChildren();
    details.replaceChildren();
    nextButton.hidden = true;
    renderNavigation();
    if (track === 'locators') {
      if (editor.value.trim() !== 'page.' && editor.value.trim() !== '') checkLocator(false);
      else {
        clearHighlights();
        show('', 'Type a locator.', 'It starts with page.');
      }
    } else if (track === 'steps') {
      show('', 'Write the test steps, then run them.', 'Every run starts from a freshly loaded page.');
    } else {
      show('', `Write the function ${challenge.entry}, then run the tests.`);
    }
  }

  async function selectTrack(name) {
    track = name;
    index = Math.max(0, tracks[name].findIndex((challenge) => !solved[name][challenge.id]));
    runButton.textContent = TRACKS[name].run;
    preview.hidden = name === 'code';
    frameLabel.textContent =
      name === 'locators' ? 'Practice page. Matches are highlighted in yellow.' : 'Practice page. Your test runs here; every run starts from a fresh page.';
    container.querySelector('.pg').dataset.track = name;
    renderChips();
    if (name !== 'code') await loadFrame();
    selectChallenge(index);
  }

  // ----- events -----

  let typingTimer;
  function onEdit() {
    drafts[draftKey()] = editor.value;
    saveResult('drafts', draftKey(), editor.value);
    if (track === 'locators') {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => checkLocator(false), 250);
    }
  }
  editor.addEventListener('input', onEdit);
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (track === 'locators' ? !event.shiftKey : event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      run(true);
    } else if (event.key === 'Tab' && !event.shiftKey && track !== 'locators') {
      event.preventDefault();
      editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
      onEdit();
    } else if (event.key === 'Enter' && track !== 'locators') {
      // Keep the indentation of the current line.
      const before = editor.value.slice(0, editor.selectionStart);
      const indent = before.slice(before.lastIndexOf('\n') + 1).match(/^\s*/)[0];
      if (indent) {
        event.preventDefault();
        editor.setRangeText(`\n${indent}`, editor.selectionStart, editor.selectionEnd, 'end');
        onEdit();
      }
    }
  });
  runButton.addEventListener('click', () => run(true));
  select.addEventListener('change', () => selectChallenge(Number(select.value)));
  hintButton.addEventListener('click', () => extra.replaceChildren(el('p', {}, current().hint ?? 'Read the failing test or the error message once more: it names what is missing.')));
  answerButton.addEventListener('click', () => {
    const answer = current().answer ?? current().solution;
    extra.replaceChildren(el('p', {}, 'One good answer. There are usually several.'), el('pre', {}, el('code', {}, answer.trim())));
  });
  resetButton.addEventListener('click', () => {
    delete drafts[draftKey()];
    saveResult('drafts', draftKey(), undefined);
    selectChallenge(index, { keepDraft: false });
  });
  nextButton.addEventListener('click', () => {
    selectChallenge(index + 1);
    editor.focus();
  });

  // ----- start -----

  const wanted = new URLSearchParams(location.search).get('track');
  selectTrack(!compact && trackNames.includes(wanted) ? wanted : trackNames[0]);
}
