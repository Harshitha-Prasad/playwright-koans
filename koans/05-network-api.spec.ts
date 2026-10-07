// 05 · Network: API tests, mocking and waiting for responses
// Notes: notes/05-network-api.md
// Page under test: /network.html · API: see app/server.mjs (reading it is not cheating)

import { test, expect, type APIResponse } from '@playwright/test';
import { todo } from '../support/koan';

type Special = { id: number; name: string; price: number };

test.describe('05 · Network and API', () => {
  test('GET: status, headers and body', { tag: '@diagnostic' }, async ({ request }) => {
    // `request` talks HTTP directly. No browser is started for this test.
    const response = await request.get('/api/specials');

    expect(response.status()).toBe(todo('the HTTP status of a successful GET'));
    expect(response.headers()['content-type']).toContain(todo('the media type of a JSON response'));

    const specials: Special[] = todo('parse the response body as JSON');
    expect(specials).toHaveLength(3);
    expect(specials[0]).toMatchObject({ name: 'Pumpkin Spice Latte', price: 4.5 });
  });

  test('POST: create, read back, and reject bad input', async ({ request }) => {
    const created = await request.post('/api/orders', { data: { customer: 'Ada', item: 'Espresso' } });
    expect(created.status()).toBe(todo('which status means "created"?'));

    const order = await created.json();
    const fetched = await request.get(`/api/orders/${order.id}`);
    expect(await fetched.json()).toEqual(order);

    const invalid = await request.post('/api/orders', { data: { customer: 'Ada' } });
    expect(invalid.status()).toBe(todo('which status does the server use for a missing field?'));
    expect(await invalid.json()).toEqual({ error: todo('the error message') });
  });

  test('authenticated requests carry a token', async ({ request }) => {
    const anonymous = await request.get('/api/profile');
    expect(anonymous.status()).toBe(401);

    const authorised: APIResponse = todo('log in via POST /api/login (any username, password "playwright"), then call /api/profile with the token as a Bearer header');

    expect(authorised.status()).toBe(200);
    expect(await authorised.json()).toEqual({ name: 'Ada', loyaltyPoints: 42 });
  });

  test('a route must be registered before the request is made', { tag: '@diagnostic' }, async ({ page }) => {
    // The mock is correct, but the page has already fetched the real data by the time it is installed.
    await page.goto('/network.html');
    await page.route('**/api/specials', (route) => route.fulfill({ json: [] }));

    await expect(page.getByText('No specials today')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Specials' }).getByRole('listitem')).toHaveCount(0);
  });

  test('mock a server error to test the unhappy path', async ({ page }) => {
    // TODO: make GET /api/specials answer with HTTP 500 so the page shows its error state.
    await page.goto('/network.html');

    await expect(page.getByRole('alert')).toHaveText('Could not load specials');
  });

  test('patch a real response instead of faking all of it', async ({ page }) => {
    await page.route('**/api/specials', async (route) => {
      const response = await route.fetch(); // the real backend answers...
      const specials: Special[] = await response.json();
      // TODO: ...and you add one more special before the page sees it: 'Koan Cortado' for 1 euro.
      await route.fulfill({ response, json: specials });
    });
    await page.goto('/network.html');

    const items = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');
    await expect(items).toHaveCount(4);
    await expect(items.last()).toHaveText('Koan Cortado — €1.00');
  });

  test('start waiting for a response before triggering it', async ({ page }) => {
    await page.goto('/network.html');
    await expect(page.getByRole('list', { name: 'Specials' }).getByRole('listitem')).toHaveCount(3);

    // By the time the UI says "Updated", the response has come and gone, so waitForResponse
    // sits there waiting for a second one. Reorder: create the promise, click, then await it.
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.getByTestId('refresh-status')).toHaveText('Updated just now');
    const response = await page.waitForResponse('**/api/specials', { timeout: 2_000 });

    expect(response.status()).toBe(200);
    expect(await response.json()).toHaveLength(3);
  });

  test('block requests you do not need', async ({ page }) => {
    // TODO: abort every request for an .svg file before the page loads.
    await page.goto('/locators.html');

    // An <img> that failed to load has a natural width of 0.
    const logoWidth = await page.getByAltText('Koans Café logo').evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(logoWidth).toBe(0);
  });
});
