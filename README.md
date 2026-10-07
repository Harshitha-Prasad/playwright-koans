# Playwright Koans

Hands-on practice for QA engineers: Playwright, TypeScript, JavaScript and testing fundamentals.

**Website: https://harshitha-prasad.github.io/playwright-koans/** (in-browser exercises, nothing to install)

There are two ways to use this project, and they share the same content:

- **On the website**, called Red to Green: a playground that runs and marks your locators, short Playwright tests, repairs of flaky tests and JavaScript functions; quizzes on what JavaScript logs and whether TypeScript compiles; and a mock interview over about 460 questions with model answers, each marked with where it comes from.
- **In this repository**: fork it and fix 65 failing Playwright tests on your own machine. The rest of this README is about that part.

## The failing tests

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
| 09 | Why Playwright, and how it compares with Selenium | – | [notes/09](notes/09-why-playwright.md) |
| 10 | TypeScript for testers | – | [notes/10](notes/10-typescript-for-testers.md) |
| 11 | Testing fundamentals | – | [notes/11](notes/11-testing-fundamentals.md) |
| 12 | Scenario questions | – | [notes/12](notes/12-scenarios.md) |
| 13 | Configuration, projects and global setup | – | [notes/13](notes/13-configuration-projects-setup.md) |
| 14 | Visual, accessibility and emulation testing | – | [notes/14](notes/14-visual-accessibility-emulation.md) |
| 15 | Playwright and AI: codegen, MCP and test agents | – | [notes/15](notes/15-playwright-and-ai.md) |
| 16 | JavaScript for test code | – | [notes/16](notes/16-javascript-for-test-code.md) |
| 17 | API testing: HTTP, REST, Postman | – | [notes/17](notes/17-api-testing.md) |
| 18 | Git and GitHub | – | [notes/18](notes/18-git-and-github.md) |
| 19 | CI/CD pipelines and Docker | – | [notes/19](notes/19-ci-cd-and-docker.md) |
| 20 | Google Cloud for QA | – | [notes/20](notes/20-google-cloud-for-qa.md) |
| 21 | AI for QA | – | [notes/21](notes/21-ai-for-qa.md) |
| 22 | Coding exercises with solutions | – | [notes/22](notes/22-coding-exercises.md) |
| 23 | SQL and database testing | – | [notes/23](notes/23-sql-and-database-testing.md) |
| 24 | Design principles, unit testing and BDD | – | [notes/24](notes/24-design-unit-testing-bdd.md) |
| 25 | Performance, security, test data and the command line | – | [notes/25](notes/25-performance-security-data-cli.md) |

Every note is one page: the idea in a few lines, a cheat sheet, and an **Interviewers ask** section with the follow-up questions that topic tends to attract. Answers end with a `Source:` line. Where it links to official documentation, the answer was checked against that page in October 2026 (Playwright 1.63). Where it says "experience, not documentation", it is advice, not fact. Where it says "checked by running the code", the solution was compiled and run against test cases. A few answers still say "interview handbook, not checked against documentation": treat those as unverified.

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
- **Use AI as the interviewer, not as the solver.** `prompts/mock-interviewer.md` turns any assistant into the person asking the questions. In a coding agent that supports skills, the same rules are available as `.claude/skills/mock-interview`.
- **Say it out loud.** After each module, answer its interview questions without the note open.

## Project layout

```
app/           the café demo app: a dependency-free Node server and a few HTML pages
koans/         the failing tests you fix
solutions/     a passing answer for every koan
notes/         one page per topic; also the source of the website's pages and question bank
site/          the website: build script, in-browser exercises, their content and tests
prompts/       the mock interviewer prompt
support/       the todo() helper and a custom progress reporter
.github/       CI: runs the solutions, tests the website, deploys it to GitHub Pages
```

## The website

The site is static and is generated from the files in this repository, so there is one source for everything.

| Command | What it does |
| --- | --- |
| `npm run site` | Build the site and preview it on http://localhost:4174 |
| `npm run site:check` | Run every JavaScript snippet and coding solution, and compile every TypeScript snippet shown on the site |
| `npm run site:test` | Test the site in a browser, and compare the playground with real Playwright |

It is published by `.github/workflows/pages.yml` on every push to `main`. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

To change the site's name or the repository link, edit `site/site.config.mjs`.

### How the playground stays honest

Real Playwright cannot run inside a web page, so the playground's locator and test-step tracks use a small imitation (`site/assets/locator-engine.js` and `site/assets/pw-runtime.js`). `npm run site:test` runs every reference answer and every listed mistake twice, once in the imitation and once in real Playwright, and fails if the verdicts or the error headlines differ. The flaky-tests track gives you a test that fails only on a slow or a fast machine, runs it under each condition and asks you to repair it. The same comparison with real Playwright covers every one of those runs. The JavaScript track needs no imitation: answers run for real in a Web Worker.

Every locator challenge has a "Show the HTML" link that prints the element with its surroundings, and the role and name it is found by. The same test run checks those roles and names against real Playwright.

### Adding content

- **A question:** add it to the `## Interviewers ask` section of a file in `notes/`. A line in bold is the question; everything up to the next bold line is the answer. A `###` heading starts a group of questions. Add new questions at the end of a file, because the site numbers them by position. It appears on the topic page and in the mock interview.
- **A question you were asked in an interview:** open an issue with the "I was asked this in an interview" form. No need to write the answer.
- **A scenario:** same format, in `notes/12-scenarios.md`. The best ones come from things that happened to you.
- **A playground challenge or a quiz snippet:** add an entry to the matching file in `site/content/` (`locator-challenges`, `step-challenges`, `flaky-challenges`, `code-challenges`, `js-challenges`, `ts-checks`), then run `npm run site:check` and `npm run site:test`. A wrong expected answer fails the build.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

- **Solutions pass** type-checks the project and runs every solution. If a Playwright upgrade breaks a koan's answer, this is where it shows.
- **Koans progress** runs the koans and writes the progress table to the run summary. It is allowed to fail, so your fork stays buildable while you work through it.

- **Website content and tests** runs the content check and the site tests.

`.github/workflows/latest-playwright.yml` runs once a week. It installs the newest Playwright release instead of the pinned one and runs the solutions and the site tests. If a new version changes something this project teaches, the run fails and opens an issue.

Each job uploads its HTML report as an artifact. [Note 08](notes/08-reporting-ci.md) walks through the workflow.

## Maintaining and contributing

The pinned versions are in `package.json`. To upgrade Playwright: bump the version, run `npx playwright install chromium`, then `npm run solutions`.

To add a koan, add the same test to both folders: the version in `koans/` must fail and the version in `solutions/` must pass. Keep it to one idea, give it a comment that says what to aim for, and make sure it fails within a few seconds.

## License

MIT. See [LICENSE](LICENSE).
