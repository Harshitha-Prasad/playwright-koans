// Mock interview: pick topics, answer, compare with the model answer, rate yourself.

import { questions } from './data.js';
import { el, readSection, saveResult } from './store.js';

const root = document.getElementById('interview');
const ratings = readSection('interview');
const topics = [...new Set(questions.map((question) => question.topic))];
const RANK = { missed: 0, partly: 1, undefined: 2, knew: 3 };
const LABEL = { knew: 'Knew it', partly: 'Partly', missed: 'Missed' };

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showSetup() {
  const rated = questions.filter((question) => ratings[question.id]).length;
  const missed = questions.filter((question) => ratings[question.id] === 'missed').length;

  const topicBoxes = topics.map((topic) => {
    const count = questions.filter((question) => question.topic === topic).length;
    return el('label', {}, el('input', { type: 'checkbox', name: 'topic', value: topic, checked: true }), el('span', {}, topic, ' ', el('small', {}, `(${count})`)));
  });
  const sizes = [5, 10, 20].map((size) =>
    el('label', {}, el('input', { type: 'radio', name: 'size', value: String(size), checked: size === 10 }), `${size} questions`),
  );
  const missedFirst = el('input', { type: 'checkbox', name: 'missedFirst', checked: true });
  const message = el('p', { class: 'verdict', role: 'status', hidden: true });

  const form = el(
    'form',
    { class: 'interview-setup' },
    el(
      'fieldset',
      {},
      el('legend', {}, 'Topics'),
      el(
        'p',
        {},
        el('button', { type: 'button', class: 'link-button', onclick: () => setAll(true) }, 'Select all'),
        ' / ',
        el('button', { type: 'button', class: 'link-button', onclick: () => setAll(false) }, 'Clear all'),
      ),
      el('div', { class: 'topic-grid' }, topicBoxes),
    ),
    el('fieldset', {}, el('legend', {}, 'Length'), el('div', { class: 'inline' }, sizes)),
    el(
      'fieldset',
      {},
      el('legend', {}, 'Order'),
      el('div', { class: 'inline' }, el('label', {}, missedFirst, 'Start with questions I missed or only partly knew')),
    ),
    message,
    el('p', {}, el('button', { type: 'submit', class: 'button' }, 'Start the interview')),
    el(
      'p',
      { class: 'progress-line' },
      rated === 0
        ? `${questions.length} questions in the bank. None rated yet.`
        : `${rated} of ${questions.length} questions rated so far, ${missed} marked as missed.`,
    ),
  );

  function setAll(checked) {
    for (const box of form.querySelectorAll('input[name="topic"]')) box.checked = checked;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const chosen = [...form.querySelectorAll('input[name="topic"]:checked')].map((box) => box.value);
    if (chosen.length === 0) {
      message.hidden = false;
      message.className = 'verdict fail';
      message.textContent = 'Choose at least one topic.';
      return;
    }
    const size = Number(form.querySelector('input[name="size"]:checked').value);
    let pool = shuffle(questions.filter((question) => chosen.includes(question.topic)));
    if (missedFirst.checked) pool = pool.sort((a, b) => RANK[ratings[a.id]] - RANK[ratings[b.id]]);
    runInterview(pool.slice(0, size));
  });

  root.replaceChildren(form);
}

function runInterview(selected) {
  const session = [];
  let position = 0;

  function showQuestion() {
    const question = selected[position];
    const answer = el('div', { class: 'question-answer', hidden: true }, el('div', { html: question.answer }));
    const reveal = el('button', { type: 'button', class: 'button' }, 'Show the model answer');
    const heading = el('h2', { class: 'question-text', tabindex: '-1', html: question.question });

    const rate = (rating) => {
      ratings[question.id] = rating;
      saveResult('interview', question.id, rating);
      session.push({ question, rating });
      position += 1;
      if (position < selected.length) showQuestion();
      else showSummary(session);
    };

    answer.append(
      el('p', {}, el('strong', {}, 'How did you do?')),
      el(
        'div',
        { class: 'rating' },
        el('button', { type: 'button', class: 'button knew', onclick: () => rate('knew') }, 'I knew it'),
        el('button', { type: 'button', class: 'button quiet', onclick: () => rate('partly') }, 'Partly'),
        el('button', { type: 'button', class: 'button missed', onclick: () => rate('missed') }, 'I missed it'),
      ),
      el('p', { class: 'aside-line' }, el('a', { href: `${question.note}#${question.id}` }, 'Read the note this comes from')),
    );

    reveal.addEventListener('click', () => {
      answer.hidden = false;
      reveal.hidden = true;
    });

    root.replaceChildren(
      el('div', { class: 'meter', 'aria-hidden': 'true' }, el('i', { style: `width:${(position / selected.length) * 100}%` })),
      el(
        'section',
        { class: 'question-card' },
        el('p', { class: 'question-meta' }, el('span', {}, `Question ${position + 1} of ${selected.length}`), el('span', {}, question.topic)),
        heading,
        el('p', {}, 'Answer out loud, as you would in the room. Then compare.'),
        reveal,
        answer,
      ),
      el('p', { class: 'aside-line' }, el('button', { type: 'button', class: 'link-button', onclick: showSetup }, 'End this interview')),
    );
    heading.focus();
  }

  showQuestion();
}

function showSummary(session) {
  const count = (rating, items = session) => items.filter((entry) => entry.rating === rating).length;
  const byTopic = [...new Set(session.map((entry) => entry.question.topic))].map((topic) => {
    const items = session.filter((entry) => entry.question.topic === topic);
    return el(
      'tr',
      {},
      el('td', {}, topic),
      el('td', { class: 'num' }, count('knew', items)),
      el('td', { class: 'num' }, count('partly', items)),
      el('td', { class: 'num' }, count('missed', items)),
    );
  });
  const toRepeat = session.filter((entry) => entry.rating !== 'knew').map((entry) => entry.question);
  const heading = el('h2', { tabindex: '-1' }, `You knew ${count('knew')} of ${session.length}.`);

  root.replaceChildren(
    heading,
    el(
      'p',
      {},
      toRepeat.length === 0
        ? 'Nothing to repeat from this round. Try other topics, or let an AI assistant ask the follow-up questions.'
        : `${count('partly')} partly, ${count('missed')} missed. Those come back first next time.`,
    ),
    el(
      'table',
      { class: 'summary-table' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Topic'), el('th', { class: 'num' }, LABEL.knew), el('th', { class: 'num' }, LABEL.partly), el('th', { class: 'num' }, LABEL.missed))),
      el('tbody', {}, byTopic),
    ),
    el(
      'p',
      { class: 'rating' },
      toRepeat.length > 0
        ? el('button', { type: 'button', class: 'button', onclick: () => runInterview(shuffle(toRepeat)) }, `Repeat the ${toRepeat.length} I did not know`)
        : null,
      el('button', { type: 'button', class: 'button quiet', onclick: showSetup }, 'Set up a new interview'),
    ),
  );
  heading.focus();
}

showSetup();
