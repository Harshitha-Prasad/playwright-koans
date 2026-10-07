// "Does it compile?": decide, then see what the TypeScript compiler says and why.

import { tsChecks } from './data.js';
import { el, readSection, saveResult } from './store.js';

const results = readSection('ts');
const progress = document.getElementById('ts-progress');

function renderProgress() {
  const right = tsChecks.filter((check) => results[check.id] === 'right').length;
  progress.textContent = `${right} of ${tsChecks.length} answered correctly.`;
}

function card(check) {
  const verdict = el('p', { class: 'verdict', role: 'status', hidden: true });
  const why = el('p', { class: 'why', hidden: true }, check.why);
  const article = el(
    'article',
    { class: 'exercise', id: check.id },
    el('h2', {}, check.title),
    el('pre', {}, el('code', {}, check.code)),
    el(
      'div',
      { class: 'exercise-actions' },
      el('button', { type: 'button', class: 'button quiet', onclick: () => answer(true) }, 'It compiles'),
      el('button', { type: 'button', class: 'button quiet', onclick: () => answer(false) }, 'Type error'),
    ),
    verdict,
    why,
  );
  if (results[check.id] === 'right') article.classList.add('done');

  function answer(saysCompiles) {
    const correct = saysCompiles === check.compiles;
    const truth = check.compiles ? 'The compiler accepts this.' : 'The compiler rejects this.';
    verdict.hidden = false;
    why.hidden = false;
    verdict.className = `verdict ${correct ? 'pass' : 'fail'}`;
    verdict.textContent = `${correct ? '✓ Correct.' : '✘ Not this time.'} ${truth}`;
    article.classList.toggle('done', correct);
    article.classList.toggle('missed', !correct);
    results[check.id] = correct ? 'right' : 'wrong';
    saveResult('ts', check.id, results[check.id]);
    renderProgress();
  }

  return article;
}

document.getElementById('ts-list').append(...tsChecks.map(card));
renderProgress();
