// 02 · Auto-waiting and web-first assertions
// Notes: notes/02-auto-waiting.md
// Page under test: http://localhost:4173/waiting.html
//
// Every koan here is a test that someone "fixed" with a sleep, a force or a one-shot check.
// Nothing on the page is instant, so each of them fails. No todo() in this file: fix the code.

import { test, expect } from '@playwright/test';

test.describe('02 · Auto-waiting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/waiting.html');
  });

  test('replace the sleep with an assertion that retries', { tag: '@diagnostic' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Load specials' }).click();
    const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');

    // The list takes about 1.2 seconds. A longer sleep would pass today and fail on a slow CI
    // agent tomorrow. Delete the sleep and let the assertion do the waiting.
    await expect(specials).toHaveCount(3);
  });

  test('click already waits for the button to be enabled', async ({ page }) => {
    // "Pay now" is disabled for the first second. Someone added force to make the click
    // "work". It does click, but a disabled button ignores it.
    await page.getByRole('button', { name: 'Pay now' }).click();

    await expect(page.getByTestId('payment-status')).toHaveText('Payment received');
  });

  test('textContent() reads once, toHaveText() keeps checking', { tag: '@diagnostic' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Start order' }).click();
    const status = page.getByTestId('order-status');

    await expect(status).toHaveText('Ready for pickup');
  });

  test('isVisible() answers immediately and never waits', async ({ page }) => {
    await page.getByRole('button', { name: 'Save preferences' }).click();
    const toast = page.getByRole('alert');

    // The toast shows up after 0.4s and removes itself 1.5s later. Assert both moments.
    await expect(toast).toBeVisible();
    await expect(toast).toHaveText('Preferences saved');
    await expect(toast).toBeHidden();
  });

  test('all() returns whatever is there right now', async ({ page }) => {
    await page.getByRole('button', { name: 'Open the queue' }).click();
    const tickets = page.getByRole('list', { name: 'Queue' }).getByRole('listitem');

    // Five tickets trickle in, one every 300ms.
    await expect(tickets).toHaveCount(5);
    await expect(tickets.last()).toHaveText('Ticket 5');
  });

  test('give one slow step more time instead of raising every timeout', async ({ page }) => {
    await page.getByRole('button', { name: 'Start slow roast' }).click();

    // Roasting takes 4 seconds; assertions in this project wait 3. Extend this one only.
    await expect(page.getByTestId('roast-status')).toHaveText('Roast complete', { timeout: 6_000 });
  });
});
