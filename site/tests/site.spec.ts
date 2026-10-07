// Tests for the website. They are also the proof behind the claim on the home page that every
// code answer on the site is executed: the gym's reference answers, its locator engine, every
// "predict the output" snippet and every question card go through here on each change.

import { test, expect, type APIRequestContext, type Frame, type Page } from '@playwright/test';

type LocatorChallenge = { id: string; title: string; answer: string; starter?: string; many?: boolean };
type JsChallenge = { id: string; title: string; expected: string[] };
type TsCheck = { id: string; title: string; compiles: boolean };
type Content = {
  pages: string[];
  locatorChallenges: LocatorChallenge[];
  parityProbes: string[];
  jsChallenges: JsChallenge[];
  tsChecks: TsCheck[];
  questionCount: number;
};

const loadContent = async (request: APIRequestContext): Promise<Content> => (await request.get('content.json')).json();

/** Opens the Locator Gym and waits until the practice page inside it is ready. */
async function openGym(page: Page): Promise<Frame> {
  await page.goto('locators.html');
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Koans Café' })).toBeVisible();
  const frame = page.frame({ url: /playground\.html/ });
  if (!frame) throw new Error('The practice page did not load');
  return frame;
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

test.describe('Locator Gym', () => {
  test('every reference answer solves its challenge', async ({ page, request }) => {
    const { locatorChallenges } = await loadContent(request);
    await openGym(page);

    for (const challenge of locatorChallenges) {
      await test.step(challenge.id, async () => {
        await page.getByRole('list', { name: 'Challenges' }).getByRole('button', { name: challenge.title }).click();
        await page.getByRole('textbox', { name: 'Your locator' }).fill(challenge.answer);
        await page.getByRole('button', { name: 'Check locator' }).click();
        await expect(page.getByRole('status')).toContainText('✓');
      });
    }

    // Progress survives a reload.
    await page.reload();
    await expect(page.getByRole('list', { name: 'Challenges' }).getByText('✓')).toHaveCount(locatorChallenges.length);
  });

  test('the engine matches real Playwright, element for element', async ({ page, request }) => {
    const { locatorChallenges, parityProbes } = await loadContent(request);
    const frame = await openGym(page);
    await frame.evaluate(() => {
      document.querySelectorAll('*').forEach((element, index) => element.setAttribute('data-n', String(index)));
    });

    const expressions = [
      ...locatorChallenges.map((challenge) => challenge.answer),
      ...locatorChallenges.flatMap((challenge) => (challenge.starter ? [challenge.starter] : [])),
      ...parityProbes,
    ];
    for (const expression of expressions) {
      // The same text is evaluated twice: once against Playwright's Frame, once by the gym.
      const realLocator = new Function('page', `return (${expression});`)(frame);
      const real: string[] = await realLocator.evaluateAll((elements: Element[]) => elements.map((element) => element.getAttribute('data-n')));
      const gym = await page.evaluate(async (source) => {
        const engine = await import(new URL('assets/locator-engine.js', location.href).href);
        const practicePage = document.querySelector('iframe')!.contentDocument!;
        return engine.evaluateLocator(source, practicePage).resolve().map((element: Element) => element.getAttribute('data-n'));
      }, expression);
      expect.soft(gym, expression).toEqual(real);
    }
  });

  test('feedback reads like Playwright: strict mode, no match, wrong element', async ({ page }) => {
    await openGym(page);
    const input = page.getByRole('textbox', { name: 'Your locator' });
    const verdict = page.getByRole('status');

    await page.getByRole('button', { name: 'Strict mode' }).click();
    await expect(verdict).toContainText('strict mode violation: resolved to 5 elements');

    await input.fill("page.getByRole('button', { name: 'Checkout' })");
    await expect(verdict).toContainText('0 elements');

    await input.fill("page.getByRole('button', { name: 'Sign in' })");
    await expect(verdict).toContainText('not the one asked for');

    await input.fill("page.getByRole('listitem').nth(4).getByRole('button')");
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
      .getByRole('textbox', { name: 'Your locator' })
      .fill("page.getByRole('listitem').filter({ hasText: 'Cold Brew' }).getByRole('button', { name: 'Add to cart' })");

    await expect(page.getByRole('status')).toContainText('✓ 1 element, the right one.');
    await expect(page.getByRole('link', { name: 'More challenges in the Locator Gym' })).toBeVisible();
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

test('question cards on a note open one by one or all at once', async ({ page }) => {
  await page.goto('note-01.html');
  const cards = page.locator('details.qa');
  const firstAnswer = cards.first().locator('.qa-answer');

  await expect(firstAnswer).toBeHidden();
  await cards.first().locator('summary').click();
  await expect(firstAnswer).toBeVisible();

  await page.getByRole('button', { name: 'Open all' }).click();
  await expect(cards.last().locator('.qa-answer')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close all' })).toBeVisible();
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
