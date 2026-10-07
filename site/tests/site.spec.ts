// Tests for the website. They are also the proof behind the claim on the home page that every
// code answer on the site is executed. In particular, the playground's imitation of Playwright
// is compared with real Playwright here: same locators, same test code, same verdicts.

import { test, expect, type APIRequestContext, type Browser, type Frame, type Page } from '@playwright/test';

type LocatorChallenge = { id: string; title: string; answer: string; starter?: string };
type StepChallenge = {
  id: string;
  title: string;
  starter: string;
  solution: string;
  check: string;
  require?: string[];
  forbid?: string[];
  mistakes?: { kind: 'error' | 'rule'; code: string }[];
};
type CodeChallenge = { id: string; title: string; solution: string; starter: string };
type JsChallenge = { id: string; expected: string[] };
type TsCheck = { id: string; compiles: boolean };
type Content = {
  pages: string[];
  locatorChallenges: LocatorChallenge[];
  parityProbes: string[];
  stepChallenges: StepChallenge[];
  codeChallenges: CodeChallenge[];
  jsChallenges: JsChallenge[];
  tsChecks: TsCheck[];
  questionCount: number;
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/** An error's headline without terminal colours and without the trailing "// comment" Playwright adds. */
const firstLine = (message: string | null | undefined) =>
  (message ?? '').replace(/\u001b\[[0-9;]*m/g, '').replace(/ \/\/.*$/, '');
const loadContent = async (request: APIRequestContext): Promise<Content> => (await request.get('content.json')).json();

/** Opens the playground on a track and waits until the practice page inside it is ready. */
async function openPlayground(page: Page, track: 'locators' | 'steps' | 'code'): Promise<void> {
  await page.goto(`playground.html?track=${track}`);
  if (track !== 'code') {
    await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Koans Café' })).toBeVisible();
  }
}

const practiceFrame = (page: Page): Frame => {
  const frame = page.frame({ url: /practice\.html/ });
  if (!frame) throw new Error('The practice page did not load');
  return frame;
};

async function pickChallenge(page: Page, title: string) {
  await page.getByRole('navigation', { name: 'Challenges' }).getByRole('button', { name: title, exact: true }).click();
}

test('every page loads without script errors and every internal link resolves', async ({ page, request }) => {
  const { pages } = await loadContent(request);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));

  const links = new Set<string>();
  for (const file of pages) {
    await page.goto(file);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/Red to Green/);
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href));
    for (const href of hrefs) {
      if (href.startsWith(new URL(page.url()).origin)) links.add(href.split('#')[0]);
    }
  }

  expect(errors).toEqual([]);
  expect(links.size).toBeGreaterThan(pages.length - 2);
  for (const link of links) {
    const response = await request.get(link);
    expect(response.status(), `broken link: ${link}`).toBe(200);
  }
});

test.describe('Playground: locators', () => {
  test('every reference answer solves its challenge', async ({ page, request }) => {
    const { locatorChallenges } = await loadContent(request);
    await openPlayground(page, 'locators');

    for (const challenge of locatorChallenges) {
      await test.step(challenge.id, async () => {
        await pickChallenge(page, challenge.title);
        await page.getByRole('textbox', { name: 'Your answer' }).fill(challenge.answer);
        await page.getByRole('button', { name: 'Check locator' }).click();
        await expect(page.getByRole('status')).toContainText('✓');
      });
    }

    // Progress survives a reload.
    await page.reload();
    await expect(page.getByRole('button', { name: `Locators ${locatorChallenges.length}/${locatorChallenges.length}` })).toBeVisible();
  });

  test('the locator engine matches real Playwright, element for element', async ({ page, request }) => {
    const { locatorChallenges, parityProbes } = await loadContent(request);
    await openPlayground(page, 'locators');
    const frame = practiceFrame(page);
    await frame.evaluate(() => {
      document.querySelectorAll('*').forEach((element, index) => element.setAttribute('data-n', String(index)));
    });

    const expressions = [
      ...locatorChallenges.map((challenge) => challenge.answer),
      ...locatorChallenges.flatMap((challenge) => (challenge.starter ? [challenge.starter] : [])),
      ...parityProbes,
    ];
    for (const expression of expressions) {
      // The same text is evaluated twice: once against Playwright's Frame, once by the playground.
      const realLocator = new Function('page', `return (${expression});`)(frame);
      const real: string[] = await realLocator.evaluateAll((elements: Element[]) => elements.map((element) => element.getAttribute('data-n')));
      const mine = await page.evaluate(async (source) => {
        const engine = await import(new URL('assets/locator-engine.js', location.href).href);
        const practicePage = document.querySelector('iframe')!.contentDocument!;
        return engine.evaluateLocator(source, practicePage).resolve().map((element: Element) => element.getAttribute('data-n'));
      }, expression);
      expect.soft(mine, expression).toEqual(real);
    }
  });

  test('feedback reads like Playwright: strict mode, no match, wrong element', async ({ page }) => {
    await openPlayground(page, 'locators');
    const input = page.getByRole('textbox', { name: 'Your answer' });
    const verdict = page.getByRole('status');

    await pickChallenge(page, 'Strict mode');
    await expect(verdict).toContainText('strict mode violation: resolved to 5 elements');

    await input.fill("page.getByRole('button', { name: 'Checkout' })");
    await expect(verdict).toContainText('0 elements');

    await input.fill("page.getByRole('button', { name: 'Sign in' })");
    await expect(verdict).toContainText('not the one asked for');

    await input.fill("page.getByRole('list', { name: 'Menu' }).getByRole('listitem').nth(4).getByRole('button')");
    await expect(verdict).toContainText('✓');
    await expect(verdict).toContainText('Positional locators');

    await input.fill("page.getByRole('button', { name: 'Sign in' }).click()");
    await page.getByRole('button', { name: 'Check locator' }).click();
    await expect(verdict).toContainText('Leave out .click()');

    await input.fill('page.getByRol(');
    await page.getByRole('button', { name: 'Check locator' }).click();
    await expect(verdict).toContainText('Not a locator yet');
  });

  test('the challenge on the home page can be solved in place', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Koans Café' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('strict mode violation');

    await page
      .getByRole('textbox', { name: 'Your answer' })
      .fill("page.getByRole('listitem').filter({ hasText: 'Cold Brew' }).getByRole('button', { name: 'Add to cart' })");

    await expect(page.getByRole('status')).toContainText('✓ 1 element, the right one.');
    await expect(page.getByRole('link', { name: 'More challenges in the playground' })).toBeVisible();
  });
});

test.describe('Playground: test steps', () => {
  /** Runs test code with real Playwright against the practice page on its own. */
  async function runWithPlaywright(browser: Browser, baseURL: string, code: string, check: string) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    page.setDefaultTimeout(3_000);
    await page.goto('assets/practice.html');
    let error: string | null = null;
    try {
      await new AsyncFunction('page', 'expect', code)(page, expect.configure({ timeout: 3_000 }));
    } catch (caught) {
      error = (caught as Error).message.split('\n')[0];
    }
    const reached = error ? false : await page.evaluate(`(() => { ${check} })()`);
    await context.close();
    return { ok: !error && reached === true, error };
  }

  /** Runs the same code with the playground's own runtime, in a page of its own. */
  async function runWithPlayground(browser: Browser, baseURL: string, code: string, challenge: StepChallenge) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto('assets/practice.html');
    const result = await page.evaluate(
      async ({ source, task }) => {
        const runtime = await import(new URL('pw-runtime.js', location.href).href);
        const rules = await import(new URL('rules.js', location.href).href);
        const outcome = await runtime.runSteps(source, document);
        const reached = outcome.ok ? new Function(task.check)() === true : false;
        return { ran: outcome.ok && reached, error: outcome.error?.message.split('\n')[0] ?? null, broken: rules.brokenRules(task, outcome.usage) };
      },
      { source: code, task: challenge },
    );
    await context.close();
    return { ...result, ok: result.ran && result.broken.length === 0 };
  }

  test('the runtime and real Playwright agree on every solution and every mistake', async ({ browser, request, baseURL }) => {
    test.setTimeout(240_000);
    const { stepChallenges } = await loadContent(request);

    const compare = async (challenge: StepChallenge) => {
      const cases = [
        { label: 'solution', code: challenge.solution, kind: 'pass' },
        { label: 'starter', code: challenge.starter, kind: 'starter' },
        ...(challenge.mistakes ?? []).map((mistake, index) => ({ label: `mistake ${index + 1}`, code: mistake.code, kind: mistake.kind })),
      ];
      for (const item of cases) {
        const [real, mine] = await Promise.all([
          runWithPlaywright(browser, baseURL!, item.code, challenge.check),
          runWithPlayground(browser, baseURL!, item.code, challenge),
        ]);
        const name = `${challenge.id}, ${item.label}`;
        if (item.kind === 'pass') {
          expect.soft(real, `${name}: real Playwright`).toMatchObject({ ok: true });
          expect.soft(mine, `${name}: playground`).toMatchObject({ ok: true });
        } else if (item.kind === 'error') {
          // A real mistake: both fail, and for the same reason.
          expect.soft(real.ok, `${name}: real Playwright should fail`).toBe(false);
          expect.soft(mine.ran, `${name}: playground should fail`).toBe(false);
          expect.soft(firstLine(mine.error), `${name}: same error`).toBe(firstLine(real.error));
        } else if (item.kind === 'rule') {
          // Works in both, but the playground objects to how it was done.
          expect.soft(real.ok, `${name}: real Playwright`).toBe(true);
          expect.soft(mine.ran, `${name}: playground runs it`).toBe(true);
          expect.soft(mine.broken.length, `${name}: playground flags a rule`).toBeGreaterThan(0);
        } else {
          expect.soft(mine.ok, `${name}: the starter must not already be an answer`).toBe(false);
        }
      }
    };

    // Four challenges at a time keeps this well inside the timeout.
    const queue = [...stepChallenges];
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let challenge = queue.shift(); challenge; challenge = queue.shift()) await compare(challenge);
      }),
    );
  });

  test('a challenge is run, explained and solved through the page', async ({ page }) => {
    await openPlayground(page, 'steps');
    await pickChallenge(page, 'Content that arrives late');
    const verdict = page.getByRole('status');

    // The starter code sleeps too briefly and reads once.
    await page.getByRole('button', { name: 'Run test' }).click();
    await expect(verdict).toContainText('✘ expect(received).toBe(expected)', { timeout: 10_000 });
    await expect(page.locator('.pg-log')).toContainText('Expected: 3');

    // A long enough sleep makes it work, and the playground says why that is not good enough.
    const editor = page.getByRole('textbox', { name: 'Your answer' });
    await editor.fill((await editor.inputValue()).replace('500', '2000'));
    await page.getByRole('button', { name: 'Run test' }).click();
    await expect(verdict).toContainText('Nearly', { timeout: 10_000 });
    await expect(page.locator('.pg-rules')).toContainText('Remove waitForTimeout');

    await page.getByRole('button', { name: 'Show an answer' }).click();
    const answer = await page.locator('.pg-extra pre').innerText();
    await editor.fill(answer);
    await page.getByRole('button', { name: 'Run test' }).click();
    await expect(verdict).toContainText('✓ Passed.', { timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Test steps 1/' })).toBeVisible();
  });

  test('strict mode and dialog behaviour are reported in Playwright\'s words', async ({ page }) => {
    await openPlayground(page, 'steps');
    const editor = page.getByRole('textbox', { name: 'Your answer' });
    const verdict = page.getByRole('status');

    await pickChallenge(page, 'Act on one of several similar elements');
    await editor.fill("await page.getByRole('button', { name: 'Add to cart' }).click();");
    await page.getByRole('button', { name: 'Run test' }).click();
    await expect(verdict).toContainText("strict mode violation: getByRole('button', { name: 'Add to cart' }) resolved to 5 elements", { timeout: 10_000 });

    await pickChallenge(page, 'Accept a confirmation');
    await page.getByRole('button', { name: 'Run test' }).click();
    await expect(verdict).toContainText('expect(locator).toHaveText(expected) failed', { timeout: 10_000 });
    await expect(page.locator('.pg-log')).toContainText('Received: "Order kept"');
  });
});

test.describe('Playground: JavaScript', () => {
  test('every solution passes its hidden tests in the browser', async ({ page, request }) => {
    test.setTimeout(90_000);
    const { codeChallenges } = await loadContent(request);
    await openPlayground(page, 'code');

    for (const challenge of codeChallenges) {
      await test.step(challenge.id, async () => {
        await pickChallenge(page, challenge.title);
        await page.getByRole('textbox', { name: 'Your answer' }).fill(challenge.solution);
        await page.getByRole('button', { name: 'Run tests' }).click();
        await expect(page.getByRole('status')).toContainText(/✓ All \d+ tests pass\./);
      });
    }
  });

  test('wrong answers, missing functions and endless loops are handled', async ({ page }) => {
    await openPlayground(page, 'code');
    const editor = page.getByRole('textbox', { name: 'Your answer' });
    const verdict = page.getByRole('status');
    await pickChallenge(page, 'Second largest number');

    await editor.fill('function secondLargest(numbers) {\n  return numbers.sort()[numbers.length - 2];\n}');
    await page.getByRole('button', { name: 'Run tests' }).click();
    await expect(verdict).toContainText(/✘ \d of 6 tests pass\./);
    await expect(page.getByRole('list', { name: 'Test results' })).toContainText('does not change the input');
    await expect(page.locator('.pg-tests .pg-log').first()).toContainText('Expected:');

    await editor.fill('function somethingElse() {}');
    await page.getByRole('button', { name: 'Run tests' }).click();
    await expect(verdict).toContainText('Define a function called secondLargest');

    await editor.fill('function secondLargest() {\n  while (true) {}\n}');
    await page.getByRole('button', { name: 'Run tests' }).click();
    await expect(verdict).toContainText('did not finish within 5 seconds', { timeout: 10_000 });
    // The page is still alive afterwards.
    await editor.fill('function secondLargest(numbers) {\n  return [...new Set(numbers)].sort((a, b) => b - a)[1];\n}');
    await page.getByRole('button', { name: 'Run tests' }).click();
    await expect(verdict).toContainText('✓ All 6 tests pass.');
  });
});

test.describe('Playground on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('fits the screen and can be used without a keyboard', async ({ page }) => {
    await openPlayground(page, 'locators');

    // No sideways scrolling.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Challenges are picked from a dropdown; the long list is hidden.
    await expect(page.getByRole('navigation', { name: 'Challenges' })).toBeHidden();
    await page.getByRole('combobox', { name: 'Challenge' }).selectOption({ label: 'A field by its label' });
    await expect(page.locator('.pg-prompt')).toHaveText('Locate the email input field.');

    // A locator can be assembled from the snippet buttons.
    await page.getByRole('button', { name: 'getByLabel', exact: true }).tap();
    await page.getByRole('textbox', { name: 'Your answer' }).pressSequentially('Email address');
    await expect(page.getByRole('status')).toContainText('✓ 1 element, the right one.');

    // Every other page fits as well.
    for (const file of ['index.html', 'javascript.html', 'typescript.html', 'interview.html', 'note-02.html', 'note-13.html', 'note-22.html', 'note-23.html', 'koans.html']) {
      await page.goto(file);
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(extra, `${file} scrolls sideways`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('Predict the output', () => {
  test('every snippet logs what the site says it logs', async ({ page, request }) => {
    const { jsChallenges } = await loadContent(request);
    await page.goto('javascript.html');

    for (const challenge of jsChallenges) {
      await test.step(challenge.id, async () => {
        const card = page.locator(`#${challenge.id}`);
        await card.getByLabel('What does it log?').fill(challenge.expected.join('\n'));
        await card.getByRole('button', { name: 'Check my prediction' }).click();
        await expect(card.getByRole('status')).toHaveText('✓ Correct.');
        await expect(card.getByRole('list', { name: 'Actual output' }).getByRole('listitem')).toHaveCount(challenge.expected.length);
      });
    }
    await expect(page.getByText(`${jsChallenges.length} of ${jsChallenges.length} predicted correctly.`)).toBeVisible();
  });

  test('a wrong prediction is marked line by line', async ({ page }) => {
    await page.goto('javascript.html');
    const card = page.locator('#event-loop-order');

    await card.getByRole('button', { name: 'Check my prediction' }).click();
    await expect(card.getByRole('status')).toContainText('Write your prediction first');

    await card.getByLabel('What does it log?').fill('sync\ntimer\npromise');
    await card.getByRole('button', { name: 'Check my prediction' }).click();

    await expect(card.getByRole('status')).toContainText('✘');
    await expect(card.getByText('you wrote: timer')).toBeVisible();
    await expect(card.getByText('Timers are macrotasks')).toBeVisible();
  });
});

test('Does it compile? accepts the right answer for every snippet', async ({ page, request }) => {
  const { tsChecks } = await loadContent(request);
  await page.goto('typescript.html');

  for (const check of tsChecks) {
    const card = page.locator(`#${check.id}`);
    await card.getByRole('button', { name: check.compiles ? 'It compiles' : 'Type error' }).click();
    await expect(card.getByRole('status')).toContainText('✓ Correct.');
  }
  await expect(page.getByText(`${tsChecks.length} of ${tsChecks.length} answered correctly.`)).toBeVisible();

  // And the wrong button is told so.
  const first = page.locator(`#${tsChecks[0].id}`);
  await first.getByRole('button', { name: tsChecks[0].compiles ? 'Type error' : 'It compiles' }).click();
  await expect(first.getByRole('status')).toContainText('✘');
});

test.describe('Mock interview', () => {
  test('runs a five-question interview and remembers the ratings', async ({ page, request }) => {
    const { questionCount } = await loadContent(request);
    await page.goto('interview.html');
    await expect(page.getByText(`${questionCount} questions in the bank. None rated yet.`)).toBeVisible();

    await page.getByRole('radio', { name: '5 questions' }).check();
    await page.getByRole('button', { name: 'Start the interview' }).click();

    for (let number = 1; number <= 5; number += 1) {
      await expect(page.getByText(`Question ${number} of 5`)).toBeVisible();
      await expect(page.getByRole('button', { name: 'I knew it' })).toBeHidden();
      await page.getByRole('button', { name: 'Show the model answer' }).click();
      await expect(page.getByRole('button', { name: 'Show the model answer' })).toBeHidden();
      await page.getByRole('button', { name: number <= 3 ? 'I knew it' : 'I missed it' }).click();
    }

    await expect(page.getByRole('heading', { name: 'You knew 3 of 5.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Repeat the 2 I did not know' })).toBeVisible();

    await page.reload();
    await expect(page.getByText(`5 of ${questionCount} questions rated so far, 2 marked as missed.`)).toBeVisible();
  });

  test('needs at least one topic, and can be limited to one', async ({ page }) => {
    await page.goto('interview.html');
    await page.getByRole('button', { name: 'Clear all' }).click();
    await page.getByRole('button', { name: 'Start the interview' }).click();
    await expect(page.getByRole('status')).toHaveText('Choose at least one topic.');

    await page.getByRole('checkbox', { name: /^Scenario questions/ }).check();
    await page.getByRole('button', { name: 'Start the interview' }).click();
    await expect(page.locator('.question-meta')).toContainText('Scenario questions');
  });
});

test('question cards on a note open one by one or all at once, and cite a source', async ({ page }) => {
  await page.goto('note-01.html');
  const cards = page.locator('details.qa');
  const firstAnswer = cards.first().locator('.qa-answer');

  await expect(firstAnswer).toBeHidden();
  await cards.first().locator('summary').click();
  await expect(firstAnswer).toBeVisible();
  await expect(firstAnswer.getByRole('link', { name: 'Locators' })).toHaveAttribute('href', /^https:\/\/playwright\.dev\/docs\/locators/);

  await page.getByRole('button', { name: 'Open all' }).click();
  await expect(cards.last().locator('.qa-answer')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close all' })).toBeVisible();
});

test('a note groups its extra questions under headings, and says which answers are unchecked', async ({ page }) => {
  await page.goto('note-12.html');

  const group = page.locator('section.qa-group').filter({ has: page.getByRole('heading', { name: /^How would you test/ }) });
  await expect(group.locator('details.qa')).toHaveCount(5);
  // The group's introduction comes before its cards.
  await expect(group.getByText('For any "how would you test X" question')).toBeVisible();

  await page.getByRole('link', { name: 'Framework and strategy' }).click();
  await expect(page).toHaveURL(/#group-2$/);

  const card = group.locator('details.qa').filter({ hasText: 'How would you test a search feature?' });
  await card.locator('summary').click();
  await expect(card.locator('.qa-answer')).toContainText('Source: interview handbook, not checked against documentation.');
});

test('the theme switch is remembered', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('index.html');

  await page.getByRole('button', { name: 'Switch between light and dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.goto('learn.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the interviewer prompt can be copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('ai-interviewer.html');

  await page.getByRole('button', { name: 'Copy prompt' }).click();

  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('You are a senior QA engineer running a mock interview');
});

test('old Locator Gym links lead to the playground', async ({ page }) => {
  await page.goto('locators.html');
  await expect(page).toHaveURL(/playground\.html$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Playground');
});
