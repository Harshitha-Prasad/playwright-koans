// 08 · Reporting
// Notes: notes/08-reporting-ci.md
// Page under test: /locators.html
//
// A report is only as good as what the tests put into it. After each koan, run
// `npx playwright show-report` and look at what changed in the HTML report.

import { test, expect } from '@playwright/test';
import { todo } from '../support/koan';

test.describe('08 · Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/locators.html');
  });

  // TODO: tag this test @smoke. Tags go in the details object between the title and the function,
  // and `npx playwright test --grep @smoke` then runs only the tagged tests.
  test('tags select what runs', { tag: '@diagnostic' }, async ({ page }, testInfo) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Koans Café');

    expect(testInfo.tags).toContain('@smoke');
  });

  // TODO: link this test to a ticket with an annotation of type 'issue' and the description 'CAFE-42'.
  test('annotations carry context into the report', async ({ page }, testInfo) => {
    await expect(page.getByTestId('cart-count')).toHaveText('0');

    expect(testInfo.annotations).toContainEqual(expect.objectContaining({ type: 'issue', description: 'CAFE-42' }));
  });

  test('steps turn a wall of actions into a readable story', async ({ page }) => {
    const add = (drink: string) =>
      page.getByRole('listitem').filter({ hasText: drink }).getByRole('button', { name: 'Add to cart' }).click();

    // A step can return a value. Add a Flat White and a Cold Brew inside the step and return
    // the number shown in the cart counter.
    const itemsInCart = await test.step('add two drinks to the cart', async () => {
      return todo('add the two drinks, then return the cart count as a number');
    });

    await test.step('check the cart', async () => {
      expect(itemsInCart).toBe(2);
      await expect(page.getByRole('list', { name: 'Cart' }).getByRole('listitem')).toHaveText(['Flat White', 'Cold Brew']);
    });
  });

  test('attachments put evidence next to the result', async ({ page }, testInfo) => {
    // TODO: attach a PNG screenshot of the page under the name 'menu'.

    // TODO: attach the list of drink names as JSON under the name 'drinks'.

    const attachments = testInfo.attachments.map(({ name, contentType }) => ({ name, contentType }));
    expect(attachments).toContainEqual({ name: 'menu', contentType: 'image/png' });
    expect(attachments).toContainEqual({ name: 'drinks', contentType: 'application/json' });
  });

  test('a custom message says what the assertion was for', async ({ page }) => {
    const drinks = await page.getByTestId('product-card').count();

    // This inner assertion is supposed to fail: there are five drinks, not six. Give it a custom
    // message (the second argument of expect) so the report explains the intent in plain words.
    let failure = '';
    try {
      expect(drinks).toBe(6);
    } catch (error) {
      failure = (error as Error).message;
    }

    expect(failure).toContain('the menu should list six drinks');
  });
});
