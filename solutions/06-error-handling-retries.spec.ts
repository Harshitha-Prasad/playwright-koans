// 06 · Error handling, retries and polling
// Notes: notes/06-error-handling-retries.md
// Pages under test: /locators.html, /login.html · API: /api/unstable, /api/jobs, /api/flaky-by-attempt

import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';

test.describe('06 · Error handling and retries', () => {
  test('expect.soft reports every mismatch in one run', { tag: '@diagnostic' }, async ({ page }) => {
    await page.goto('/locators.html');
    const price = (drink: string) =>
      page
        .getByTestId('product-card')
        .filter({ has: page.getByRole('heading', { name: drink, exact: true }) })
        .locator('.price');

    // Three of these four prices are out of date. With plain expect you would find them one
    // run at a time. Run once, read all the failures, fix them all.
    await expect.soft(price('Espresso')).toHaveText('€2.20');
    await expect.soft(price('Flat White')).toHaveText('€3.50');
    await expect.soft(price('Cappuccino')).toHaveText('€3.80');
    await expect.soft(price('Cold Brew')).toHaveText('€4.10');
  });

  test('a swallowed error hides the real problem', async ({ page }) => {
    // This helper was written to "never fail". It never does: it also never tells you why it
    // returns 0. Remove the safety net, read the error that appears, then fix its cause.
    async function cartCount(target: Page): Promise<number> {
      return Number(await target.getByTestId('cart-count').textContent());
    }

    await page.goto('/locators.html');
    const addToCart = page.getByRole('button', { name: 'Add to cart' });
    await addToCart.first().click();
    await addToCart.last().click();

    expect(await cartCount(page)).toBe(2);
  });

  test('toPass retries a whole block until it succeeds', { tag: '@diagnostic' }, async ({ request }) => {
    // This endpoint answers 503 twice before it recovers (the machine is warming up).
    const url = `/api/unstable/${randomUUID()}`;

    // One attempt is not enough. Wrap the call and the assertion so they are retried together.
    await expect(async () => {
      const response = await request.get(url);
      expect(response.status()).toBe(200);
    }).toPass({ timeout: 5_000 });
  });

  test('expect.poll waits for a value that is not on the page', async ({ request }) => {
    const created = await request.post('/api/jobs');
    const { id } = await created.json();

    const jobStatus = async () => {
      const response = await request.get(`/api/jobs/${id}`);
      return (await response.json()).status as string;
    };

    // The job goes queued -> brewing -> done within about 1.2 seconds. Poll for it.
    await expect.poll(jobStatus, { timeout: 5_000 }).toBe('done');
  });

  test('negative paths deserve assertions too', async ({ page, request }) => {
    const response = await request.post('/api/login', { data: { username: 'ada', password: 'wrong' } });
    expect(response.status()).toBe(401);

    await page.goto('/login.html');
    await page.getByLabel('Username').fill('ada');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
    await expect(page).toHaveURL(/\/login\.html$/);
  });

  test.describe('test-level retries', () => {
    // TODO: allow the tests in this block two retries. (One line, right here.)
    test.describe.configure({ retries: 2 });

    test('a flaky dependency recovers on a later attempt', async ({ request }, testInfo) => {
      // testInfo.retry is 0 on the first run, 1 on the first retry, and so on.
      // The endpoint only succeeds from attempt 2 onwards.
      const response = await request.get(`/api/flaky-by-attempt?attempt=${testInfo.retry}`);

      expect(response.status()).toBe(200);
      // Once this passes, the report marks the test "flaky", not "passed". That label is the point:
      // retries keep the pipeline moving, they do not make the flakiness go away.
    });
  });
});
