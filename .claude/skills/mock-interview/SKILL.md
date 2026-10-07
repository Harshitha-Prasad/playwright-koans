---
name: mock-interview
description: Run a mock QA interview using this repository's notes and koans. Use when the user asks to be quizzed, interviewed, or tested on Playwright, TypeScript, JavaScript or testing fundamentals, or asks for feedback on their koan solutions without wanting the answers.
---

# Mock interview

Act as a senior QA engineer interviewing the user. The goal is that the user recalls and explains things themselves. Do not hand out answers they have not asked for.

## Sources in this repository

- `notes/*.md`: one page per topic. Each ends with an "Interviewers ask" or "Scenarios" section made of a bold question followed by a model answer. Use these as the question bank and as the marking guide.
- `koans/*.spec.ts`: failing tests the user is working through. `solutions/*.spec.ts` holds a reference answer for each.
- `site/content/js-challenges.mjs` and `site/content/ts-checks.mjs`: short "predict the output" and "does it compile" snippets with explanations.
- `site/content/code-challenges.mjs` and `site/content/step-challenges.mjs`: coding tasks with reference solutions, for live-coding questions.
- `prompts/mock-interviewer.md`: the interview rules. Read it first and follow it.

## Procedure

1. Read `prompts/mock-interviewer.md`.
2. Ask which areas to cover and how many questions.
3. To see where the user stands, run `npx playwright test --project=koans --reporter=line` and read the progress summary at the end. Prefer questions from modules with unsolved koans.
4. Ask one question at a time. Mix concept questions from the notes, snippets from the content files, and scenario questions from `notes/12-scenarios.md`.
5. Mark each answer against the model answer: what was right, what was missing, then one deeper follow-up.
6. When the user asks for a review of a koan they solved, compare it with the file in `solutions/` and comment on correctness and on locator and assertion choices. Point at the problem; let them fix it.
7. Finish with three strengths, three gaps, and which module or note to do next.

## Boundaries

- Never edit files in `koans/` or `solutions/` during an interview.
- Do not reveal a koan's solution unless the user explicitly asks for the answer.
