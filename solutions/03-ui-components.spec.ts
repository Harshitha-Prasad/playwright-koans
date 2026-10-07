// 03 · UI components
// Notes: notes/03-ui-components.md
// Page under test: http://localhost:4173/components.html

import { test, expect } from '@playwright/test';

test.describe('03 · UI components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components.html');
  });

  test('native dropdowns: single and multiple', { tag: '@diagnostic' }, async ({ page }) => {
    // TODO: choose "Large" in the Size dropdown.
    // TODO: choose both "Oat milk" and "Extra shot" in the Extras list.
    // (A <select> is not clicked open like a custom dropdown. There is a dedicated method.)
    await page.getByLabel('Size').selectOption('Large');
    await page.getByLabel('Extras').selectOption(['Oat milk', 'Extra shot']);

    await expect(page.getByTestId('size-output')).toHaveText('Size: Large');
    await expect(page.getByTestId('extras-output')).toHaveText('Extras: Oat milk, Extra shot');
  });

  test('radio buttons and checkboxes', async ({ page }) => {
    // TODO: pick Oat milk and tick "To go".
    await page.getByRole('radio', { name: 'Oat' }).check();
    await page.getByRole('checkbox', { name: 'To go' }).check();

    await expect(page.getByRole('radio', { name: 'Oat' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Whole' })).not.toBeChecked();
    await expect(page.getByTestId('options-output')).toHaveText('Milk: Oat · To go: yes');
  });

  test('upload a file without touching the disk', async ({ page }) => {
    // TODO: attach a file called receipt.txt whose content is the text "1x Espresso".
    // No fixture file needed: the upload method also accepts { name, mimeType, buffer }.
    await page.getByLabel('Upload receipt').setInputFiles({
      name: 'receipt.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('1x Espresso'),
    });

    await expect(page.getByTestId('upload-output')).toHaveText('receipt.txt (11 bytes)');
  });

  test('confirm dialogs are dismissed unless you say otherwise', { tag: '@diagnostic' }, async ({ page }) => {
    // Playwright closes native dialogs for you by pressing Cancel. Accept this one.
    // The listener has to exist before the click that opens the dialog.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete order' }).click();

    await expect(page.getByTestId('dialog-output')).toHaveText('Order deleted');
  });

  test('prompt dialogs: read the message, type an answer', async ({ page }) => {
    let message = '';
    // TODO: when the prompt opens, remember its message and answer "Morning rush".
    page.once('dialog', async (dialog) => {
      message = dialog.message();
      await dialog.accept('Morning rush');
    });
    await page.getByRole('button', { name: 'Rename order' }).click();

    await expect(page.getByTestId('dialog-output')).toHaveText('Renamed to Morning rush');
    expect(message).toBe('New order name');
  });

  test('an iframe is a separate document', async ({ page }) => {
    // The payment form lives inside <iframe title="Payment">. Locators on `page` cannot see
    // into it. Point `payment` at the frame instead.
    const payment = page.frameLocator('iframe[title="Payment"]');

    await payment.getByLabel('Card holder').fill('Ada Lovelace');
    await payment.getByRole('button', { name: 'Pay' }).click();

    await expect(payment.getByRole('status')).toHaveText('Paid by Ada Lovelace');
  });

  test('shadow DOM: Playwright locators pierce it, XPath does not', async ({ page }) => {
    // The button is inside the open shadow root of <loyalty-card>.
    const collect = page.getByRole('button', { name: 'Collect stamp' });

    await collect.click();
    await collect.click();

    await expect(page.getByText('Stamps: 2')).toBeVisible();
  });

  test('a link that opens a new tab gives you a new Page', { tag: '@diagnostic' }, async ({ page }) => {
    // The receipt opens in a new tab, so asserting on `page` looks at the wrong tab.
    // Start waiting for the popup before the click, then use the page it resolves to.
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Open receipt' }).click();
    const receipt = await popupPromise;

    await expect(receipt.getByRole('heading', { level: 1 })).toHaveText('Receipt #1042');
    await expect(receipt.getByText('Total: €7.60')).toBeVisible();
  });

  test('menus that only appear on hover', async ({ page }) => {
    // "Sign out" exists in the DOM but is hidden until the pointer is over "Account".
    await page.getByRole('button', { name: 'Account' }).hover();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page.getByTestId('account-output')).toHaveText('Signed out');
  });

  test('tables: find the row first, then act inside it', async ({ page }) => {
    const graceRow = page.getByRole('row').filter({ hasText: 'Grace' });

    await graceRow.getByRole('button', { name: 'Cancel' }).click();

    await expect(graceRow.getByRole('cell').nth(2)).toHaveText('Cancelled');
    await expect(graceRow.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    // The other rows are untouched.
    await expect(page.getByRole('row').filter({ hasText: 'Ada' }).getByRole('cell').nth(2)).toHaveText('Preparing');
  });

  test('downloads are events too', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download report' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('report.csv');
    expect(await download.failure()).toBeNull();
  });
});
