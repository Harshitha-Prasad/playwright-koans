// Challenges for the "Test steps" track of the playground: a few lines of Playwright test code,
// run against the practice page (site/assets/practice.html).
//
//   starter   what the editor shows at first
//   solution  one good answer
//   check     JavaScript run inside the practice page after the test code; must return true
//   require   things the answer has to use     (see RULES in site/assets/playground.js)
//   forbid    things the answer must not use
//   mistakes  typical wrong answers. kind 'error' fails outright; kind 'rule' works but breaks a rule
//
// Every solution and every mistake is executed twice in CI: by the in-browser runtime and by real
// Playwright. Both have to agree, which is what keeps the playground honest.

const text = (testId) => `document.querySelector('[data-testid="${testId}"]').textContent`;

export const stepChallenges = [
  {
    id: 'sign-in',
    group: 'Actions',
    title: 'Fill a form and submit it',
    prompt: 'Sign in as ada@example.com (any password), then assert that the page greets her.',
    starter: `// The practice page is already open. \`page\` and \`expect\` are ready to use.\n`,
    solution: `await page.getByLabel('Email address').fill('ada@example.com');
await page.getByLabel('Password').fill('s3cret');
await page.getByRole('button', { name: 'Sign in' }).click();

await expect(page.getByRole('status')).toHaveText('Welcome back, ada@example.com');`,
    check: `return document.getElementById('signin-status').textContent === 'Welcome back, ada@example.com';`,
    require: ['assertion'],
    hint: 'fill() for the two fields, click() for the button, then await expect(...).toHaveText(...) on the element with role "status".',
    mistakes: [
      {
        kind: 'error',
        why: 'Positional locators found the wrong fields: the third input is a checkbox, which cannot be filled.',
        code: `await page.locator('input').nth(1).fill('ada@example.com');
await page.locator('input').nth(2).fill('s3cret');
await page.getByRole('button', { name: 'Sign in' }).click();
await expect(page.getByRole('status')).toHaveText('Welcome back, ada@example.com');`,
      },
    ],
  },
  {
    id: 'press-enter',
    group: 'Actions',
    title: 'Submit with the keyboard',
    prompt: 'Sign in as grace@example.com without clicking the button: press Enter in the password field.',
    starter: `await page.getByLabel('Email address').fill('grace@example.com');\n`,
    solution: `await page.getByLabel('Email address').fill('grace@example.com');
await page.getByLabel('Password').fill('s3cret');
await page.getByLabel('Password').press('Enter');

await expect(page.getByRole('status')).toHaveText('Welcome back, grace@example.com');`,
    check: `return document.getElementById('signin-status').textContent === 'Welcome back, grace@example.com';`,
    require: ['assertion', 'press'],
    forbid: ['click'],
    hint: "locator.press('Enter') sends a key to the element. In a form field, Enter submits the form.",
  },
  {
    id: 'cart',
    group: 'Actions',
    title: 'Act on one of several similar elements',
    prompt: 'Add a Flat White and then a Cold Brew to the cart. Assert that the cart lists exactly those two, in that order.',
    starter: `const cart = page.getByRole('list', { name: 'Cart' }).getByRole('listitem');\n`,
    solution: `const cart = page.getByRole('list', { name: 'Cart' }).getByRole('listitem');
const add = (drink) =>
  page.getByRole('listitem').filter({ hasText: drink }).getByRole('button', { name: 'Add to cart' }).click();

await add('Flat White');
await add('Cold Brew');

await expect(cart).toHaveText(['Flat White', 'Cold Brew']);`,
    check: `return [...document.querySelectorAll('#cart li')].map((item) => item.textContent).join('|') === 'Flat White|Cold Brew';`,
    require: ['assertion'],
    hint: 'toHaveText accepts an array: one expected text per matched element, in order.',
    mistakes: [
      {
        kind: 'error',
        why: 'The locator matches all five buttons, so click() throws a strict mode violation.',
        code: `await page.getByRole('button', { name: 'Add to cart' }).click();`,
      },
    ],
  },
  {
    id: 'options',
    group: 'Actions',
    title: 'Radio buttons, checkboxes and dropdowns',
    prompt: 'Order with oat milk, size Large, to go. Assert the summary line under the options.',
    starter: `// The summary line has the test id "options-output".\n`,
    solution: `await page.getByRole('radio', { name: 'Oat' }).check();
await page.getByLabel('Size').selectOption('Large');
await page.getByRole('checkbox', { name: 'To go' }).check();

await expect(page.getByTestId('options-output')).toHaveText('Milk: Oat, size: Large, to go: yes');
await expect(page.getByRole('radio', { name: 'Whole' })).not.toBeChecked();`,
    check: `return ${text('options-output')} === 'Milk: Oat, size: Large, to go: yes';`,
    require: ['assertion', 'selectOption'],
    hint: 'check() for radios and checkboxes, selectOption() for a native <select>. A dropdown is not clicked open.',
  },
  {
    id: 'hover-menu',
    group: 'Actions',
    title: 'A menu that opens on hover',
    prompt: 'Sign out through the Account menu. The menu item only exists visually while the pointer is over "Account".',
    starter: `await page.getByRole('menuitem', { name: 'Sign out' }).click();\n\nawait expect(page.getByTestId('account-output')).toHaveText('Signed out');`,
    solution: `await page.getByRole('button', { name: 'Account' }).hover();
await page.getByRole('menuitem', { name: 'Sign out' }).click();

await expect(page.getByTestId('account-output')).toHaveText('Signed out');`,
    check: `return ${text('account-output')} === 'Signed out';`,
    require: ['assertion', 'hover'],
    forbid: ['force'],
    hint: 'Run the starter code first and read the call log: the element is not visible. hover() moves the pointer.',
    mistakes: [
      {
        kind: 'error',
        why: 'Without hovering first, the menu item is hidden and click() waits until the timeout.',
        code: `await page.getByRole('menuitem', { name: 'Sign out' }).click();
await expect(page.getByTestId('account-output')).toHaveText('Signed out');`,
      },
    ],
  },
  {
    id: 'table',
    group: 'Actions',
    title: 'Work inside a table row',
    prompt: "Cancel Grace's order. Assert that her status cell says Cancelled, her button is disabled, and Ada's order is untouched.",
    starter: `const graceRow = page.getByRole('row').filter({ hasText: 'Grace' });\n`,
    solution: `const graceRow = page.getByRole('row').filter({ hasText: 'Grace' });

await graceRow.getByRole('button', { name: 'Cancel' }).click();

await expect(graceRow.getByRole('cell').nth(2)).toHaveText('Cancelled');
await expect(graceRow.getByRole('button', { name: 'Cancel' })).toBeDisabled();
await expect(page.getByRole('row').filter({ hasText: 'Ada' }).getByRole('cell').nth(2)).toHaveText('Preparing');`,
    check: `const rows = [...document.querySelectorAll('tbody tr')]; return rows[1].children[2].textContent === 'Cancelled' && rows[0].children[2].textContent === 'Preparing' && rows[2].children[2].textContent === 'Ready';`,
    require: ['assertion'],
    hint: 'Locate the row once, then look for the button and the cells inside that row.',
  },
  {
    id: 'upload',
    group: 'Actions',
    title: 'Upload a file from memory',
    prompt: 'Upload a file called receipt.txt that contains the text "1x Espresso". Assert the line under the file input.',
    starter: `// No file on disk is needed: setInputFiles also accepts { name, mimeType, buffer }.\n`,
    solution: `await page.getByLabel('Upload receipt').setInputFiles({
  name: 'receipt.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('1x Espresso'),
});

await expect(page.getByTestId('upload-output')).toHaveText('receipt.txt (11 bytes)');`,
    check: `return ${text('upload-output')} === 'receipt.txt (11 bytes)';`,
    require: ['assertion', 'setInputFiles'],
    hint: "Buffer.from('1x Espresso') creates the file content.",
  },
  {
    id: 'wait-for-list',
    group: 'Waiting and assertions',
    title: 'Content that arrives late',
    prompt: 'Click "Load specials" and assert that three specials appear. They take about 1.2 seconds to arrive.',
    starter: `await page.getByRole('button', { name: 'Load specials' }).click();
const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');

await page.waitForTimeout(500);
expect(await specials.count()).toBe(3);`,
    solution: `await page.getByRole('button', { name: 'Load specials' }).click();
const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');

await expect(specials).toHaveCount(3);`,
    check: `return document.querySelectorAll('#specials li').length === 3;`,
    require: ['assertion'],
    forbid: ['waitForTimeout'],
    hint: 'count() reads the page once. await expect(locator).toHaveCount(3) keeps checking until it is true or the timeout is over.',
    mistakes: [
      {
        kind: 'error',
        why: 'count() reads once, immediately after the click, when the list is still empty.',
        code: `await page.getByRole('button', { name: 'Load specials' }).click();
const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');
expect(await specials.count()).toBe(3);`,
      },
      {
        kind: 'rule',
        why: 'A two-second sleep passes here, and fails on the day the backend takes three.',
        code: `await page.getByRole('button', { name: 'Load specials' }).click();
const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');
await page.waitForTimeout(2000);
await expect(specials).toHaveCount(3);`,
      },
    ],
  },
  {
    id: 'disabled-button',
    group: 'Waiting and assertions',
    title: 'A button that is not ready yet',
    prompt: '"Pay now" is disabled for the first second after the page loads. Click it and assert that the payment went through.',
    starter: `await page.getByRole('button', { name: 'Pay now' }).click({ force: true });

await expect(page.getByTestId('payment-status')).toHaveText('Payment received');`,
    solution: `await page.getByRole('button', { name: 'Pay now' }).click();

await expect(page.getByTestId('payment-status')).toHaveText('Payment received');`,
    check: `return ${text('payment-status')} === 'Payment received';`,
    require: ['assertion'],
    forbid: ['force', 'waitForTimeout'],
    hint: 'click() already waits for the button to be enabled. force: true skips that check, and a disabled button ignores the click.',
    mistakes: [
      {
        kind: 'error',
        why: 'force: true clicks straight away. The button is still disabled, so nothing happens.',
        code: `await page.getByRole('button', { name: 'Pay now' }).click({ force: true });
await expect(page.getByTestId('payment-status')).toHaveText('Payment received');`,
      },
    ],
  },
  {
    id: 'text-changes',
    group: 'Waiting and assertions',
    title: 'Text that changes after a while',
    prompt: 'Start an order and assert that its status becomes "Ready for pickup". It says "Preparing…" for the first 1.5 seconds.',
    starter: `await page.getByRole('button', { name: 'Start order' }).click();
const status = page.getByTestId('order-status');

expect(await status.textContent()).toBe('Ready for pickup');`,
    solution: `await page.getByRole('button', { name: 'Start order' }).click();
const status = page.getByTestId('order-status');

await expect(status).toHaveText('Ready for pickup');`,
    check: `return ${text('order-status')} === 'Ready for pickup';`,
    require: ['assertion'],
    forbid: ['waitForTimeout'],
    hint: 'textContent() returns what is there right now. toHaveText() retries.',
    mistakes: [
      {
        kind: 'error',
        why: 'textContent() returns "Preparing…", the text at that moment.',
        code: `await page.getByRole('button', { name: 'Start order' }).click();
expect(await page.getByTestId('order-status').textContent()).toBe('Ready for pickup');`,
      },
    ],
  },
  {
    id: 'toast',
    group: 'Waiting and assertions',
    title: 'Something that appears and disappears',
    prompt: 'Click "Save preferences". Assert that the "Preferences saved" message appears, and then that it goes away again.',
    starter: `await page.getByRole('button', { name: 'Save preferences' }).click();
const toast = page.getByRole('alert');

expect(await toast.isVisible()).toBe(true);`,
    solution: `await page.getByRole('button', { name: 'Save preferences' }).click();
const toast = page.getByRole('alert');

await expect(toast).toHaveText('Preferences saved');
await expect(toast).toBeHidden();`,
    check: `return document.querySelector('#toast-area [role="alert"]') === null;`,
    require: ['assertion'],
    forbid: ['waitForTimeout'],
    hint: 'isVisible() answers immediately and never waits. Use toBeVisible() or toHaveText(), then toBeHidden().',
    mistakes: [
      {
        kind: 'error',
        why: 'isVisible() is asked before the message exists, so it answers false.',
        code: `await page.getByRole('button', { name: 'Save preferences' }).click();
expect(await page.getByRole('alert').isVisible()).toBe(true);`,
      },
    ],
  },
  {
    id: 'confirm-dialog',
    group: 'Dialogs',
    title: 'Accept a confirmation',
    prompt: 'Click "Delete order" and accept the confirmation dialog. Assert that the order was deleted.',
    starter: `await page.getByRole('button', { name: 'Delete order' }).click();

await expect(page.getByTestId('dialog-output')).toHaveText('Order deleted');`,
    solution: `page.once('dialog', (dialog) => dialog.accept());
await page.getByRole('button', { name: 'Delete order' }).click();

await expect(page.getByTestId('dialog-output')).toHaveText('Order deleted');`,
    check: `return ${text('dialog-output')} === 'Order deleted';`,
    require: ['assertion'],
    hint: "Playwright dismisses dialogs unless a listener handles them. Register page.once('dialog', ...) before the click.",
    mistakes: [
      {
        kind: 'error',
        why: 'With no listener the dialog is dismissed automatically, so the order is kept.',
        code: `await page.getByRole('button', { name: 'Delete order' }).click();
await expect(page.getByTestId('dialog-output')).toHaveText('Order deleted');`,
      },
    ],
  },
  {
    id: 'prompt-dialog',
    group: 'Dialogs',
    title: 'Answer a prompt',
    prompt: 'Rename the order to "Morning rush" by answering the prompt. Also assert that the prompt asked "New order name".',
    starter: `let question = '';\n`,
    solution: `let question = '';
page.once('dialog', async (dialog) => {
  question = dialog.message();
  await dialog.accept('Morning rush');
});
await page.getByRole('button', { name: 'Rename order' }).click();

await expect(page.getByTestId('dialog-output')).toHaveText('Renamed to Morning rush');
expect(question).toBe('New order name');`,
    check: `return ${text('dialog-output')} === 'Renamed to Morning rush';`,
    require: ['assertion'],
    hint: 'dialog.message() gives the question, dialog.accept(text) types the answer and confirms.',
  },
  {
    id: 'mock-empty',
    group: 'Network',
    title: 'Mock a response',
    prompt: 'Make the request for specials.json return an empty list. Then load the specials and assert that the page says "No specials today".',
    starter: `// Register the route before the click that triggers the request.\n`,
    solution: `await page.route('**/specials.json', (route) => route.fulfill({ json: [] }));

await page.getByRole('button', { name: 'Load specials' }).click();

await expect(page.getByTestId('specials-status')).toHaveText('No specials today');
await expect(page.getByRole('list', { name: 'Specials' }).getByRole('listitem')).toHaveCount(0);`,
    check: `return ${text('specials-status')} === 'No specials today' && document.querySelectorAll('#specials li').length === 0;`,
    require: ['assertion', 'route'],
    hint: "page.route('**/specials.json', (route) => route.fulfill({ json: [] }))",
  },
  {
    id: 'mock-error',
    group: 'Network',
    title: 'Test the unhappy path',
    prompt: 'Make the request for specials.json fail with HTTP 500. Load the specials and assert that the page shows its error message.',
    starter: `// The page shows the error in an element with role "alert".\n`,
    solution: `await page.route('**/specials.json', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }));

await page.getByRole('button', { name: 'Load specials' }).click();

await expect(page.getByRole('alert')).toHaveText('Could not load specials');`,
    check: `return ${text('specials-status')} === 'Could not load specials';`,
    require: ['assertion', 'route'],
    hint: 'route.fulfill takes a status. route.abort() would also make the page show its error state.',
  },
  {
    id: 'patch-response',
    group: 'Network',
    title: 'Change a real response',
    prompt: 'Let the real request go through, but add one more special to the answer: "Koan Cortado" for 1 euro. Assert that four specials are listed and the last one is the new one.',
    starter: `await page.route('**/specials.json', async (route) => {
  const response = await route.fetch();
  const specials = await response.json();
  // add the extra special here
  await route.fulfill({ response, json: specials });
});
`,
    solution: `await page.route('**/specials.json', async (route) => {
  const response = await route.fetch();
  const specials = await response.json();
  specials.push({ name: 'Koan Cortado', price: 1 });
  await route.fulfill({ response, json: specials });
});

await page.getByRole('button', { name: 'Load specials' }).click();

const items = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');
await expect(items).toHaveCount(4);
await expect(items.last()).toHaveText('Koan Cortado, €1.00');`,
    check: `const items = document.querySelectorAll('#specials li'); return items.length === 4 && items[3].textContent === 'Koan Cortado, €1.00';`,
    require: ['assertion', 'route'],
    hint: 'route.fetch() performs the real request. Change the parsed JSON, then pass it to route.fulfill.',
  },
  {
    id: 'wait-for-response',
    group: 'Network',
    title: 'Wait for a response',
    prompt: 'Click "Load specials" and capture the response to specials.json. Assert that its status is 200 and that it contains three specials.',
    starter: `await page.getByRole('button', { name: 'Load specials' }).click();
await expect(page.getByRole('list', { name: 'Specials' }).getByRole('listitem')).toHaveCount(3);

// By now the response has come and gone, so this waits for a second one that never arrives.
const response = await page.waitForResponse('**/specials.json', { timeout: 1000 });

expect(response.status()).toBe(200);
expect(await response.json()).toHaveLength(3);`,
    solution: `const responsePromise = page.waitForResponse('**/specials.json');
await page.getByRole('button', { name: 'Load specials' }).click();
const response = await responsePromise;

expect(response.status()).toBe(200);
expect(await response.json()).toHaveLength(3);`,
    check: `return true;`,
    require: ['waitForResponse'],
    hint: 'Create the promise first, without await. Then click. Then await the promise.',
    mistakes: [
      {
        kind: 'error',
        why: 'The wait starts after the response has already arrived, so it times out.',
        code: `await page.getByRole('button', { name: 'Load specials' }).click();
await expect(page.getByRole('list', { name: 'Specials' }).getByRole('listitem')).toHaveCount(3);
const response = await page.waitForResponse('**/specials.json', { timeout: 1000 });
expect(response.status()).toBe(200);`,
      },
    ],
  },
];
