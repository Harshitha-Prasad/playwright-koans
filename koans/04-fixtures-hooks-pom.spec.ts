// 04 · Fixtures, hooks and page objects
// Notes: notes/04-fixtures-hooks-pom.md
// Pages under test: /locators.html, /login.html, /dashboard.html

import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { todo } from '../support/koan';

// ---------- a page object ----------

class MenuPage {
  readonly cartItems: Locator;

  constructor(private readonly page: Page) {
    this.cartItems = page.getByRole('list', { name: 'Cart' }).getByRole('listitem');
  }

  async goto() {
    await this.page.goto('/locators.html');
  }

  async addToCart(drink: string) {
    todo(`click the "Add to cart" button that belongs to ${drink}`);
  }
}

// ---------- custom fixtures ----------

type Order = { id: number; customer: string; item: string; status: string };

type Fixtures = {
  /** A MenuPage that is already open. */
  menuPage: MenuPage;
  /** An order that exists on the server for the duration of one test. */
  order: Order;
  /** The dashboard page, already logged in. */
  dashboard: Page;
};

const test = base.extend<Fixtures>({
  menuPage: async ({ page }, use) => {
    todo('create a MenuPage, open it, and hand it to the test with `await use(...)`');
  },

  order: async ({ request }, use) => {
    todo('POST /api/orders to create an order, pass it to use(), then DELETE it again');
  },

  dashboard: async ({ page, request }, use) => {
    todo('log in through POST /api/login, put the token into localStorage before the page loads, open /dashboard.html');
  },
});

// ---------- the koans ----------

test.describe('04 · Fixtures, hooks and page objects', () => {
  test.describe('hooks', () => {
    // Both tests need the menu page open. Open it once, in one place, for every test in this block.

    test('the menu lists five drinks', async ({ page }) => {
      await expect(page.getByTestId('product-card')).toHaveCount(5);
    });

    test('the cart starts empty', async ({ page }) => {
      await expect(page.getByTestId('cart-count')).toHaveText('0');
    });
  });

  test('browser contexts do not share storage', { tag: '@diagnostic' }, async ({ page, browser, baseURL }) => {
    await page.goto('/login.html');
    await page.evaluate(() => localStorage.setItem('token', 'koans-token'));

    // A second context is like a second incognito window. Every test gets a fresh one,
    // which is why tests cannot leak cookies or storage into each other.
    const otherContext = await browser.newContext({ baseURL });
    const otherPage = await otherContext.newPage();
    await otherPage.goto('/login.html');
    const tokenSeenByOtherContext = await otherPage.evaluate(() => localStorage.getItem('token'));
    await otherContext.close();

    expect(tokenSeenByOtherContext).toBe(todo("'koans-token' or null?"));
  });

  test('a page object handed over by a fixture', { tag: '@diagnostic' }, async ({ menuPage }) => {
    // Two things to finish above: MenuPage.addToCart and the menuPage fixture.
    await menuPage.addToCart('Espresso');
    await menuPage.addToCart('Cold Brew');

    await expect(menuPage.cartItems).toHaveText(['Espresso', 'Cold Brew']);
  });

  test('a fixture that creates test data and cleans up after itself', async ({ order, request }) => {
    const response = await request.get(`/api/orders/${order.id}`);

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ customer: 'Fixture Fiona', item: 'Flat White' });
  });

  test('skip the login form: authenticate through the API', async ({ dashboard }) => {
    await expect(dashboard.getByRole('heading', { level: 1 })).toHaveText('Hello, Ada');
    await expect(dashboard.getByTestId('points')).toHaveText('Loyalty points: 42');
  });
});

// A second, tiny test object to make the order of hooks and fixtures visible.
const log: string[] = [];

const traced = base.extend<{ machine: string }>({
  machine: async ({}, use) => {
    log.push('fixture setup');
    await use('La Marzocco');
    log.push('fixture teardown'); // runs after afterEach, so it is not in the log checked below
  },
});

traced.describe('04 · Fixtures, hooks and page objects', () => {
  traced.beforeEach(async () => {
    log.push('beforeEach');
  });

  traced.afterEach(async () => {
    log.push('afterEach');
    // A fixture is set up lazily: only when something asks for it, and not before.
    expect(log).toEqual(todo("put 'afterEach', 'beforeEach', 'fixture setup' and 'test' in the order they ran"));
  });

  traced('hooks and fixtures run in a fixed order', async ({ machine }) => {
    log.push('test');
    expect(machine).toBe('La Marzocco');
  });
});
