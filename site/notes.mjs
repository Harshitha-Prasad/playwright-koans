// Reads notes/*.md and splits each into its body and its question-and-answer section.
//
// Format the notes follow:
//   # 01 · Title
//   ...body in Markdown...
//   ## Interviewers ask        (or: ## Scenarios)
//   **A question on a line of its own, in bold?**
//   The answer, in Markdown, up to the next bold line.
//   ### An optional group heading
//   Optional text introducing the group, then more questions.
//
// Question ids come from the position in the file, so new questions go at the end.

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
  const groups = [];
  let current = null;
  let group = null;
  let inFence = false;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('```')) inFence = !inFence;
    const groupHeading = inFence ? null : line.match(/^### (.+)$/);
    const question = inFence ? null : line.match(/^\*\*(.+)\*\*$/);
    if (groupHeading) {
      group = { title: groupHeading[1], intro: [] };
      groups.push(group);
      current = null;
    } else if (question) {
      current = { question: question[1], answer: [], group: group?.title ?? null };
      questions.push(current);
    } else if (current) {
      current.answer.push(line);
    } else if (group) {
      group.intro.push(line);
    }
  }

  return {
    number,
    title,
    sourceFile,
    file: `note-${number}.html`,
    body,
    questionsHeading: lines[start].slice(3),
    groups: groups.map((entry) => ({ title: entry.title, intro: entry.intro.join('\n').trim() })),
    questions: questions.map((entry, index) => ({
      id: `q-${number}-${String(index + 1).padStart(2, '0')}`,
      question: entry.question,
      group: entry.group,
      answer: entry.answer.join('\n').trim(),
    })),
  };
}
