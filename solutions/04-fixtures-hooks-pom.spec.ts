// 04 · Fixtures, hooks and page objects
// Notes: notes/04-fixtures-hooks-pom.md
// Pages under test: /locators.html, /login.html, /dashboard.html

import { test as base, expect, type Locator, type Page } from '@playwright/test';

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
    await this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('heading', { name: drink, exact: true }) })
      .getByRole('button', { name: 'Add to cart' })
      .click();
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
    const menuPage = new MenuPage(page);
    await menuPage.goto();
    await use(menuPage);
  },

  order: async ({ request }, use) => {
    // Everything before use() is setup...
    const response = await request.post('/api/orders', { data: { customer: 'Fixture Fiona', item: 'Flat White' } });
    const order: Order = await response.json();
    await use(order);
    // ...and everything after it is teardown, which runs even when the test fails.
    await request.delete(`/api/orders/${order.id}`);
  },

  dashboard: async ({ page, request }, use) => {
    // Logging in through the API is faster and less flaky than typing into the login form
    // before every test.
    const response = await request.post('/api/login', { data: { username: 'ada', password: 'playwright' } });
    const { token } = await response.json();
    await page.addInitScript((value) => localStorage.setItem('token', value), token);
    await page.goto('/dashboard.html');
    await use(page);
  },
});

// ---------- the koans ----------

test.describe('04 · Fixtures, hooks and page objects', () => {
  test.describe('hooks', () => {
    // Both tests need the menu page open. Open it once, in one place, for every test in this block.
    test.beforeEach(async ({ page }) => {
      await page.goto('/locators.html');
    });

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

    expect(tokenSeenByOtherContext).toBe(null);
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
    expect(log).toEqual(['beforeEach', 'fixture setup', 'test', 'afterEach']);
  });

  traced('hooks and fixtures run in a fixed order', async ({ machine }) => {
    log.push('test');
    expect(machine).toBe('La Marzocco');
  });
});
