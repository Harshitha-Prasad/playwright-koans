// "Predict the output": write down what a snippet logs, then run it for real.

import { jsChallenges } from './data.js';
import { normalisePrediction, runSnippet } from './run-snippet.js';
import { el, readSection, saveResult } from './store.js';

const results = readSection('js');
const progress = document.getElementById('predict-progress');

function renderProgress() {
  const right = jsChallenges.filter((challenge) => results[challenge.id] === 'right').length;
  progress.textContent = `${right} of ${jsChallenges.length} predicted correctly.`;
}

function card(challenge) {
  const inputId = `prediction-${challenge.id}`;
  const textarea = el('textarea', { id: inputId, rows: '4', spellcheck: 'false', placeholder: 'One logged line per row' });
  const output = el('ol', { class: 'output', 'aria-label': 'Actual output' });
  const verdict = el('p', { class: 'verdict', role: 'status', hidden: true });
  const why = el('p', { class: 'why', hidden: true }, challenge.why);
  const article = el(
    'article',
    { class: 'exercise', id: challenge.id },
    el('span', { class: 'exercise-topic' }, challenge.topic),
    el('h2', {}, challenge.title),
    el('pre', {}, el('code', {}, challenge.code)),
    el('label', { for: inputId }, 'What does it log?'),
    textarea,
    el(
      'div',
      { class: 'exercise-actions' },
      el('button', { type: 'button', class: 'button', onclick: () => run(true) }, 'Check my prediction'),
      el('button', { type: 'button', class: 'link-button', onclick: () => run(false) }, 'Run it without predicting'),
    ),
    verdict,
    output,
    why,
  );
  if (results[challenge.id] === 'right') article.classList.add('done');

  async function run(withPrediction) {
    const predicted = normalisePrediction(textarea.value);
    verdict.hidden = false;
    if (withPrediction && predicted.length === 0) {
      verdict.className = 'verdict';
      verdict.textContent = 'Write your prediction first, one line per log call. Or run it without predicting.';
      return;
    }

    const actual = await runSnippet(challenge.code);
    const correct = predicted.length === actual.length && actual.every((line, position) => line === predicted[position]);
    output.replaceChildren(
      ...actual.map((line, position) => {
        if (!withPrediction) return el('li', {}, line);
        const matches = predicted[position] === line;
        return el(
          'li',
          { class: matches ? 'right' : 'wrong' },
          el('span', { 'aria-hidden': 'true' }, matches ? '✓' : '✘'),
          line,
          matches ? null : el('span', { class: 'yours' }, `you wrote: ${predicted[position] ?? 'nothing'}`),
        );
      }),
    );
    why.hidden = false;

    if (!withPrediction) {
      verdict.className = 'verdict';
      verdict.textContent = 'This is what it logs. Read why, then try the next one with a prediction.';
      return;
    }
    article.classList.toggle('done', correct);
    article.classList.toggle('missed', !correct);
    verdict.className = `verdict ${correct ? 'pass' : 'fail'}`;
    verdict.textContent = correct
      ? '✓ Correct.'
      : predicted.length !== actual.length
        ? `✘ It logs ${actual.length} line${actual.length === 1 ? '' : 's'}; you predicted ${predicted.length}.`
        : '✘ Not quite. Compare line by line.';
    results[challenge.id] = correct ? 'right' : 'wrong';
    saveResult('js', challenge.id, results[challenge.id]);
    renderProgress();
  }

  return article;
}

document.getElementById('predict-list').append(...jsChallenges.map(card));
renderProgress();
