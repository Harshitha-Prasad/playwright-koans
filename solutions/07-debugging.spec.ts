// 07 · Debugging
// Notes: notes/07-debugging.md
// Pages under test: /locators.html, /debug.html
//
// These tests are broken the way real tests break. Nobody tells you where. Use the tools:
//   npx playwright test --project=koans 07-debugging --ui      time-travel through each step
//   npx playwright test --project=koans 07-debugging --debug   step through with the Inspector
//   npx playwright show-report                                  open the trace of a failed run

import { test, expect } from '@playwright/test';

test.describe('07 · Debugging', () => {
  test('read the error message before anything else', { tag: '@diagnostic' }, async ({ page }) => {
    await page.goto('/locators.html');

    await page.getByLabel('Email address').fill('ada@example.com');
    await page.getByLabel('Password').fill('s3cret');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('status')).toHaveText('Welcome back, ada@example.com');
  });

  test('the call log shows what the click was waiting for', async ({ page }) => {
    await page.goto('/debug.html');
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    // The newsletter overlay covers the Pay button. A user would have to close it first.
    await page.getByRole('dialog', { name: 'Newsletter' }).getByRole('button', { name: 'No thanks' }).click();

    await page.getByRole('button', { name: 'Pay €7.60' }).click();

    await expect(page.getByTestId('checkout-status')).toHaveText('Order placed');
  });

  test.describe('on a phone', () => {
    // Keep the viewport. The bug is in the test, not in the screen size.
    test.use({ viewport: { width: 390, height: 844 } });

    test('passes on a laptop, fails on a small screen', async ({ page }) => {
      await page.goto('/debug.html');
      // Below 600px the links collapse behind a "Menu" button.
      await page.getByRole('button', { name: 'Menu' }).click();

      await page.getByRole('link', { name: 'Specials' }).click();

      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Today's specials");
    });
  });

  test('a button that does nothing: listen for page errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await page.goto('/debug.html');
    await page.getByRole('button', { name: 'Apply voucher' }).click();

    // The page did not change, and the click itself "worked". The reason is in the browser
    // console, which the trace viewer shows in its Console tab.
    await expect(page.getByTestId('voucher-status')).toHaveText('No voucher applied');
    await expect.poll(() => pageErrors.length).toBe(1);
    expect(pageErrors[0].message).toBe('Voucher service is not configured');
  });

  test('find the failing request in the Network tab', async ({ page }) => {
    await page.goto('/debug.html');

    const responsePromise = page.waitForResponse((response) => response.url().includes('/api/'));
    await page.getByRole('button', { name: 'Check loyalty points' }).click();
    const response = await responsePromise;

    await expect(page.getByTestId('points-status')).toHaveText('Something went wrong');
    // Run this once, open the trace, and look the two answers up in its Network tab.
    expect(new URL(response.url()).pathname).toBe('/api/loyalty/points');
    expect(response.status()).toBe(404);
  });
});
