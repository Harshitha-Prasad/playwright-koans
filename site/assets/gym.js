// The Locator Gym: a text box, a practice page in an iframe, and a verdict.

import { evaluateLocator } from './locator-engine.js';
import { el, readSection, saveResult } from './store.js';

const POSITIONAL = ['nth', 'xpath', 'positional css'];

function qualityNote(used, allowed = []) {
  const flagged = (name) => used.includes(name) && !allowed.includes(name);
  if (POSITIONAL.some(flagged)) {
    return 'It works today. Positional locators (nth, first, last, XPath paths, :nth-child) break as soon as the page is reordered.';
  }
  if (flagged('css')) {
    return 'It works. CSS classes and tag names are implementation details, though: a role, label or text survives a restyle.';
  }
  if (flagged('getByTestId')) {
    return 'It works. A test id is a fair choice, but here a role or label says more about what the user sees.';
  }
  return 'Built from what a user perceives, so it survives refactoring.';
}

export function mountGym(container, { challenges, compact = false }) {
  let index = 0;
  let frameDocument = null;
  let highlighted = new Map();
  const solved = readSection('gym');

  const list = el('ol', { class: 'gym-list', 'aria-label': 'Challenges' });
  const prompt = el('p', { class: 'gym-prompt' });
  const input = el('textarea', {
    class: 'gym-input',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    'aria-label': 'Your locator',
  });
  const verdict = el('p', { class: 'verdict', role: 'status' });
  const extra = el('p', { class: 'gym-extra' });
  const checkButton = el('button', { type: 'button', class: 'button' }, 'Check locator');
  const hintButton = el('button', { type: 'button', class: 'link-button' }, 'Hint');
  const answerButton = el('button', { type: 'button', class: 'link-button' }, 'Show an answer');
  const nextButton = el('button', { type: 'button', class: 'link-button', hidden: true }, 'Next challenge');
  const frame = el('iframe', { class: 'gym-frame', title: 'Practice page: Koans Café' });

  const work = el(
    'div',
    { class: 'gym-work' },
    prompt,
    input,
    el('div', { class: 'gym-actions' }, checkButton, hintButton, answerButton, nextButton),
    verdict,
    extra,
  );
  const preview = el('div', {}, el('p', { class: 'gym-frame-label' }, 'Practice page. Matches are highlighted in yellow.'), frame);
  container.append(el('div', { class: compact ? 'gym compact' : 'gym' }, compact ? null : list, work, preview));

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
      // Bring the matches into view, centred as a group where they fit.
      const view = frameDocument.defaultView;
      const top = elements[0].getBoundingClientRect().top + view.scrollY;
      const bottom = elements[elements.length - 1].getBoundingClientRect().bottom + view.scrollY;
      const slack = Math.max(24, (view.innerHeight - (bottom - top)) / 2);
      view.scrollTo({ top: Math.max(0, top - slack) });
    }
  }

  function show(kind, headline, detail) {
    verdict.className = `verdict ${kind}`;
    verdict.replaceChildren(el('strong', {}, headline), detail ? ` ${detail}` : '');
  }

  function renderList() {
    list.replaceChildren(
      ...challenges.map((challenge, position) =>
        el(
          'li',
          {},
          el(
            'button',
            {
              type: 'button',
              'aria-current': position === index ? 'true' : null,
              onclick: () => select(position),
            },
            el('span', { class: 'gym-tick', 'aria-hidden': 'true' }, solved[challenge.id] ? '✓' : ''),
            el('span', {}, challenge.title, solved[challenge.id] ? el('span', { class: 'sr-only' }, ' (solved)') : null),
          ),
        ),
      ),
    );
  }

  /** `explicit` is true when the learner pressed Check; false while they are still typing. */
  function check(explicit) {
    if (!frameDocument) return;
    const challenge = challenges[index];
    clearHighlights();

    let locator;
    try {
      locator = evaluateLocator(input.value, frameDocument);
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
      show('pass', `✓ ${summary}`, qualityNote(locator.used, challenge.allow));
      if (!solved[challenge.id]) {
        solved[challenge.id] = true;
        saveResult('gym', challenge.id, true);
        renderList();
      }
      nextButton.hidden = compact || index === challenges.length - 1;
      if (compact) {
        extra.replaceChildren('That is the whole idea. ', el('a', { href: 'locators.html' }, 'More challenges in the Locator Gym'), '.');
      }
      return;
    }

    if (found.length === 0) {
      show('fail', '✘ 0 elements.', 'Playwright would keep waiting for this locator until the timeout, then fail.');
    } else if (!challenge.many && found.length > 1) {
      show(
        'fail',
        `✘ strict mode violation: resolved to ${found.length} elements.`,
        'A click or fill on this locator would throw. Narrow it down to one.',
      );
    } else if (challenge.many) {
      show('fail', `✘ ${found.length} of the wrong set.`, `This challenge is looking for ${target.length} elements.`);
    } else {
      show('fail', '✘ 1 element, but not the one asked for.', 'It is highlighted on the practice page.');
    }
  }

  function select(position) {
    index = position;
    const challenge = challenges[index];
    prompt.textContent = challenge.prompt;
    input.value = challenge.starter ?? 'page.';
    extra.replaceChildren();
    nextButton.hidden = true;
    renderList();
    if (challenge.starter) check(false);
    else {
      clearHighlights();
      show('', 'Type a locator.', 'It starts with page.');
    }
  }

  let typingTimer;
  input.addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => check(false), 250);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      check(true);
    }
  });
  checkButton.addEventListener('click', () => check(true));
  hintButton.addEventListener('click', () => extra.replaceChildren(challenges[index].hint));
  answerButton.addEventListener('click', () =>
    extra.replaceChildren('One good answer: ', el('code', {}, challenges[index].answer), '. There are usually several.'),
  );
  nextButton.addEventListener('click', () => {
    select(index + 1);
    input.focus();
  });

  frame.addEventListener('load', () => {
    frameDocument = frame.contentDocument;
    select(index);
  });
  frame.src = 'assets/playground.html';
}
