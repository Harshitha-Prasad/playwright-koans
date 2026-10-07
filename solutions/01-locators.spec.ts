// 01 · Locators
// Notes: notes/01-locators.md
// Page under test: http://localhost:4173/locators.html  (npm run app)

import { test, expect } from '@playwright/test';

test.describe('01 · Locators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/locators.html');
  });

  test('find elements the way a user would', { tag: '@diagnostic' }, async ({ page }) => {
    const email = page.getByLabel('Email address');
    const password = page.getByPlaceholder('Your password');
    const signIn = page.getByRole('button', { name: 'Sign in' });

    await email.fill('ada@example.com');
    await password.fill('s3cret');
    await signIn.click();

    await expect(page.getByRole('status')).toHaveText('Welcome back, ada@example.com');
  });

  test('a positional XPath breaks when the page changes', async ({ page }) => {
    // This XPath used to point at Flat White. Then "Double Espresso" joined the menu and every
    // position shifted by one. Replace it with a locator that survives the next menu change.
    const addFlatWhite = page
      .getByRole('list', { name: 'Menu' })
      .getByRole('listitem')
      .filter({ hasText: 'Flat White' })
      .getByRole('button', { name: 'Add to cart' });

    await addFlatWhite.click();

    await expect(page.getByRole('list', { name: 'Cart' }).getByRole('listitem')).toHaveText(['Flat White']);
  });

  test('strict mode: a locator used for an action must match one element', { tag: '@diagnostic' }, async ({ page }) => {
    // Run this first and read the error: Playwright lists every element the locator matched.
    // Then narrow it down to the Cold Brew button.
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Cold Brew' })
      .getByRole('button', { name: 'Add to cart' })
      .click();

    await expect(page.getByRole('list', { name: 'Cart' }).getByRole('listitem')).toHaveText(['Cold Brew']);
  });

  test('filter by a child element with { has }', async ({ page }) => {
    const cards = page.getByTestId('product-card');

    // hasText: 'Espresso' would match two cards. Filter by the heading instead.
    const espressoCard = cards.filter({ has: page.getByRole('heading', { name: 'Espresso', exact: true }) });

    await expect(cards).toHaveCount(5);
    await expect(espressoCard.locator('.price')).toHaveText('€2.20');
  });

  test('getByText matches substrings unless told otherwise', async ({ page }) => {
    // 'Espresso' appears in three places on this page. Make the locator match only the heading
    // that says exactly "Espresso".
    const espresso = page.getByText('Espresso', { exact: true });

    await expect(espresso).toBeVisible();
  });

  test('a locator is a recipe, not a snapshot', async ({ page }) => {
    // Created while the cart is still empty...
    const cartItems = page.getByRole('list', { name: 'Cart' }).getByRole('listitem');
    await expect(cartItems).toHaveCount(0);

    const add = (drink: string) =>
      page.getByRole('listitem').filter({ hasText: drink }).getByRole('button', { name: 'Add to cart' }).click();
    await add('Cappuccino');
    await add('Cold Brew');

    // ...and still usable afterwards, because it is resolved again every time it is used.
    await expect(cartItems).toHaveCount(2);
    await expect(cartItems.first()).toHaveText('Cappuccino');
  });

  test('alt text, title and test id cover what roles cannot', async ({ page }) => {
    const logo = page.getByAltText('Koans Café logo');
    const hours = page.getByTitle('Opening hours');
    const cartCount = page.getByTestId('cart-count');

    await expect(logo).toBeVisible();
    await expect(hours).toHaveText('Mon–Sat, 8:00–18:00');
    await expect(cartCount).toHaveText('0');
  });
});
