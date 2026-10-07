# Playwright Koans

Learn Playwright, or get it back into your fingers, by fixing failing tests.

65 small tests in 9 modules, all red when you start. Each one isolates a single idea: a locator strategy, an auto-wait trap, a dialog, a fixture, a mocked response, a flaky dependency. You make it green, and the idea sticks because you had to recall it and not just read it.

Everything runs against a small café app that ships in this repo, so nothing depends on a public demo site staying online.

**Who it is for**

- Engineers new to Playwright who want to see what the tool does and why people pick it.
- Experienced testers who learned it on the job, lean on AI assistants for the details, and want the fundamentals back before an interview.

## Quick start

Requires Node.js 20 or newer.

```bash
git clone https://github.com/<you>/playwright-koans.git   # your fork
cd playwright-koans
npm install
npx playwright install chromium

npm run next
```

`npm run next` runs the koans in order and stops at the first red one. Open the file it names, fix the test, run it again. Repeat.

## What a koan looks like

Some koans ask you to fill in a blank:

```ts
const email: Locator = todo('locate the field by its label text');
```

Replace the whole `todo(...)` call with your answer. Others are tests with a realistic bug, and your job is to find and fix it:

```ts
await page.waitForTimeout(500);
expect(await specials.count()).toBe(3);   // the list takes 1.2 seconds to arrive
```

The comment above each one tells you what to aim for. The error message tells you the rest: reading it properly is half the skill.

## Two ways through

**New to Playwright:** go in order, `00` to `08`. Read the one-page note for a module first, then do its koans.

**Experienced, short on time:** run the diagnostic. It is 17 koans, about two per module.

```bash
npm run diagnostic
```

Solve those without looking anything up. Wherever you got stuck, do that whole module. Skip the rest.

## Modules

| # | Module | Koans | Note |
| --- | --- | ---: | --- |
| 00 | JavaScript & TypeScript essentials: promises, `await`, event loop, `?.` `??`, generics | 10 | [notes/00](notes/00-js-ts-essentials.md) |
| 01 | Locators: role, label, text, filters, strict mode | 7 | [notes/01](notes/01-locators.md) |
| 02 | Auto-waiting and web-first assertions | 6 | [notes/02](notes/02-auto-waiting.md) |
| 03 | UI components: dropdowns, uploads, dialogs, iframes, shadow DOM, tabs, downloads | 11 | [notes/03](notes/03-ui-components.md) |
| 04 | Fixtures, hooks, page objects, authentication | 7 | [notes/04](notes/04-fixtures-hooks-pom.md) |
| 05 | Network: API tests, mocking, waiting for responses | 8 | [notes/05](notes/05-network-api.md) |
| 06 | Error handling, retries, polling | 6 | [notes/06](notes/06-error-handling-retries.md) |
| 07 | Debugging: traces, call logs, console and network | 5 | [notes/07](notes/07-debugging.md) |
| 08 | Reporting and CI | 5 | [notes/08](notes/08-reporting-ci.md) |
| 09 | Playwright vs Selenium vs Cypress | – | [notes/09](notes/09-playwright-vs-selenium-vs-cypress.md) |

Every note is one page: the idea in a few lines, a cheat sheet, and an **Interviewers ask** section with the follow-up questions that topic tends to attract.

## Commands

| Command | What it does |
| --- | --- |
| `npm run next` | Run koans in order, stop at the first red one |
| `npm run koan -- 01-locators` | Run one module |
| `npm run koan -- -g "strict mode"` | Run one koan by title |
| `npm run koans` | Run all koans and print progress per module |
| `npm run diagnostic` | Run the 17 diagnostic koans |
| `npm run ui` | Open the koans in UI mode: watch, time-travel, pick locators |
| `npm run report` | Open the HTML report of the last run, with a trace for every failure |
| `npm run solutions` | Run the reference solutions (all should pass) |
| `npm run app` | Start the café app on http://localhost:4173 to explore it by hand |
| `npm run typecheck` | Type-check everything with `tsc` |

After every run you get a progress summary:

```
  Progress
  ✔ koans/00-js-ts-essentials        ██████████  10/10
  · koans/01-locators                ████░░░░░░  3/7
  ...
  Next koan: koans/01-locators.spec.ts:43 › filter by a child element with { has }
```

## Getting the most out of it

- **Run before you fix.** Predict how the koan will fail, then check. The error messages are part of the syllabus.
- **Open the trace.** Every failed koan records one. `npm run report`, click the test, open the trace, and look at the DOM snapshot, console and network at the failing step.
- **Solutions are in `solutions/`.** Each is one reasonable answer, not the only one. Look after you have a green test, or after an honest fifteen minutes.
- **Use AI as a reviewer, not as the solver.** Solve the koan yourself, then ask an assistant to critique your answer or quiz you on the "Interviewers ask" questions.
- **Say it out loud.** After each module, answer its interview questions without the note open.

## Project layout

```
app/           the café demo app: a dependency-free Node server and a few HTML pages
koans/         the failing tests you fix
solutions/     a passing answer for every koan
notes/         one page per module, plus the tool comparison
support/       the todo() helper and a custom progress reporter
.github/       CI: runs the solutions, reports koan progress
```

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

- **Solutions pass** type-checks the project and runs every solution. If a Playwright upgrade breaks a koan's answer, this is where it shows.
- **Koans progress** runs the koans and writes the progress table to the run summary. It is allowed to fail, so your fork stays buildable while you work through it.

Both jobs upload the HTML report as an artifact. [Note 08](notes/08-reporting-ci.md) walks through the workflow.

## Maintaining and contributing

The pinned versions are in `package.json`. To upgrade Playwright: bump the version, run `npx playwright install chromium`, then `npm run solutions`.

To add a koan, add the same test to both folders: the version in `koans/` must fail and the version in `solutions/` must pass. Keep it to one idea, give it a comment that says what to aim for, and make sure it fails within a few seconds.

## License

MIT. See [LICENSE](LICENSE).
