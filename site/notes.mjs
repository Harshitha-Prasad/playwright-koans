// Reads notes/*.md and splits each into its body and its question-and-answer section.
//
// Format the notes follow:
//   # 01 · Title
//   ...body in Markdown...
//   ## Interviewers ask        (or: ## Scenarios)
//   **A question on a line of its own, in bold?**
//   The answer, in Markdown, up to the next bold line.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const QUESTION_HEADINGS = ['Interviewers ask', 'Scenarios'];

export function loadNotes(directory) {
  return readdirSync(directory)
    .filter((file) => /^\d\d-.*\.md$/.test(file))
    .sort()
    .map((file) => parseNote(readFileSync(join(directory, file), 'utf8'), file));
}

export function parseNote(markdown, sourceFile) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const heading = lines.find((line) => line.startsWith('# '));
  const match = heading?.match(/^# (\d\d) · (.+)$/);
  if (!match) throw new Error(`${sourceFile}: the first heading must look like "# 01 · Title"`);
  const [, number, title] = match;

  const start = lines.findIndex((line) => QUESTION_HEADINGS.some((name) => line === `## ${name}`));
  if (start === -1) throw new Error(`${sourceFile}: missing a "## Interviewers ask" or "## Scenarios" section`);

  const body = lines
    .slice(lines.indexOf(heading) + 1, start)
    .join('\n')
    .trim();

  const questions = [];
  let current = null;
  for (const line of lines.slice(start + 1)) {
    const question = line.match(/^\*\*(.+)\*\*$/);
    if (question) {
      current = { question: question[1], answer: [] };
      questions.push(current);
    } else if (current) {
      current.answer.push(line);
    }
  }

  return {
    number,
    title,
    sourceFile,
    file: `note-${number}.html`,
    body,
    questionsHeading: lines[start].slice(3),
    questions: questions.map((entry, index) => ({
      id: `q-${number}-${String(index + 1).padStart(2, '0')}`,
      question: entry.question,
      answer: entry.answer.join('\n').trim(),
    })),
  };
}
