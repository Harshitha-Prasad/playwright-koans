// Challenges for the "Flaky tests" track of the playground: a test that passes on one machine and
// fails on another. The learner repairs it until it passes under every condition.
//
//   starter   the flaky test, shown in the editor
//   story     how the flakiness shows up in the team
//   runs      the conditions the test is run under, in order. `pace` multiplies every delay of the
//             practice page (2 = half speed), `order: 'reversed'` flips the list of specials.
//             `starter` says whether the unrepaired test passes under that condition.
//   solution  one good repair
//   check     JavaScript run inside the practice page after each run; must return true
//   forbid    things a repair must not use (see site/assets/rules.js)
//   cause     the explanation shown once it is repaired
//
// CI runs every starter and every solution under every condition twice, in the playground's runtime
// and in real Playwright, and fails if they disagree or if a `starter` flag is wrong.

const FAST = { label: 'A fast laptop', pace: 0.5 };
const NORMAL = { label: 'Your machine', pace: 1 };
const SLOW = { label: 'A busy CI runner', pace: 2 };

export const flakyChallenges = [
  {
    id: 'fixed-sleep',
    group: 'Timing',
    title: 'The sleep that was long enough',
    story: 'Green on every laptop for months. In CI it fails about one run in five, always with "Expected: 3, Received: 0".',
    prompt: 'Repair the test so that it passes at any speed.',
    starter: `const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');

await page.getByRole('button', { name: 'Load specials' }).click();
await page.waitForTimeout(1500); // the specials need about a second
expect(await specials.count()).toBe(3);
`,
    runs: [{ ...FAST, starter: true }, { ...NORMAL, starter: true }, { ...SLOW, starter: false }],
    solution: `const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');

await page.getByRole('button', { name: 'Load specials' }).click();
await expect(specials).toHaveCount(3);`,
    check: `return document.querySelectorAll('#specials li').length === 3;`,
    require: ['assertion'],
    forbid: ['waitForTimeout'],
    hint: 'count() reads the page once, at that instant. Which assertion keeps looking until the number is right?',
    cause:
      'A fixed sleep is a guess about speed, and a slower machine proves the guess wrong. count() then reads the list once, before the items exist. toHaveCount() retries until the list has three items or the timeout runs out, so it is as fast as the page and as patient as it needs to be.',
  },
  {
    id: 'missed-toast',
    group: 'Timing',
    title: 'Fails only on the fast machine',
    story: 'This one is green in CI and red on the new laptops. The message appears for a moment and is gone before the test looks.',
    prompt: 'Repair the test so that it sees the confirmation at any speed.',
    starter: `await page.getByRole('button', { name: 'Save preferences' }).click();
await page.waitForTimeout(1200); // give the page a moment to save
await expect(page.getByRole('alert')).toHaveText('Preferences saved');
`,
    runs: [{ ...FAST, starter: false }, { ...NORMAL, starter: true }, { ...SLOW, starter: true }],
    solution: `await page.getByRole('button', { name: 'Save preferences' }).click();
await expect(page.getByRole('alert')).toHaveText('Preferences saved');`,
    check: `return document.querySelector('#toast-area [role="alert"]') !== null;`,
    require: ['assertion'],
    forbid: ['waitForTimeout'],
    hint: 'The message removes itself after a while. What is the test doing while the message is on screen?',
    cause:
      'The message is only on screen for a while. On a fast machine it had come and gone during the sleep. A sleep can be too long as well as too short. Assert straight after the click: the assertion starts looking at once and catches the message whenever it appears.',
  },
  {
    id: 'forced-click',
    group: 'Timing',
    title: 'The click that was forced',
    story: 'Someone added force: true after "element is not enabled" showed up in CI. The error went away. Now the last line fails instead, and only in CI.',
    prompt: 'Repair the test so that the payment goes through at any speed.',
    starter: `await page.waitForTimeout(1200); // the button needs a second to become active
await page.getByRole('button', { name: 'Pay now' }).click({ force: true });
await expect(page.getByTestId('payment-status')).toHaveText('Payment received');
`,
    runs: [{ ...FAST, starter: true }, { ...NORMAL, starter: true }, { ...SLOW, starter: false }],
    solution: `await page.getByRole('button', { name: 'Pay now' }).click();
await expect(page.getByTestId('payment-status')).toHaveText('Payment received');`,
    check: `return document.querySelector('[data-testid="payment-status"]').textContent === 'Payment received';`,
    require: ['assertion'],
    forbid: ['waitForTimeout', 'force'],
    hint: 'click() already waits until the button is enabled. What does force: true switch off?',
    cause:
      'The button is disabled while the page prepares the payment. A normal click() waits for it to become enabled. force: true skips that wait, so on a slow machine the click lands on a disabled button and nothing happens. The first error was the useful one: it said exactly what the test had to wait for.',
  },
  {
    id: 'tight-timeout',
    group: 'Timing',
    title: 'The timeout that was lowered',
    story: 'The timeout was reduced "so that failures show up faster". They do. Some of them are not failures.',
    prompt: 'Repair the test so that a slow order still passes.',
    starter: `await page.getByRole('button', { name: 'Start order' }).click();
await expect(page.getByTestId('order-status')).toHaveText('Ready for pickup', { timeout: 2000 });
`,
    runs: [{ ...FAST, starter: true }, { ...NORMAL, starter: true }, { ...SLOW, starter: false }],
    solution: `await page.getByRole('button', { name: 'Start order' }).click();
await expect(page.getByTestId('order-status')).toHaveText('Ready for pickup');`,
    check: `return document.querySelector('[data-testid="order-status"]').textContent === 'Ready for pickup';`,
    require: ['assertion'],
    forbid: ['waitForTimeout'],
    hint: 'A retrying assertion returns as soon as it passes. So what does a longer timeout cost on a fast machine?',
    cause:
      'A timeout is the longest the assertion may wait, not how long it does wait: it returns the moment the text is right. Lowering it saves nothing on a passing run and turns a slow run into a failure. Here the default of 5 seconds is enough. Raise a timeout only where you know an operation is slow, and say why in a comment.',
  },
  {
    id: 'data-order',
    group: 'Data',
    title: 'The first item in the list',
    story: 'The test checks that the Pumpkin Spice Latte is on today\'s specials. The kitchen now and then sends the list in a different order, and then it fails.',
    prompt: 'Repair the test so that it passes whatever the order of the list.',
    starter: `const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');

await page.getByRole('button', { name: 'Load specials' }).click();
await expect(specials.first()).toContainText('Pumpkin Spice Latte');
`,
    runs: [{ ...NORMAL, starter: true }, { label: 'The list arrives in another order', pace: 1, order: 'reversed', starter: false }, { label: 'Another order, on a busy CI runner', pace: 2, order: 'reversed', starter: false }],
    solution: `const specials = page.getByRole('list', { name: 'Specials' }).getByRole('listitem');

await page.getByRole('button', { name: 'Load specials' }).click();
await expect(specials.filter({ hasText: 'Pumpkin Spice Latte' })).toHaveCount(1);`,
    check: `return [...document.querySelectorAll('#specials li')].some((item) => item.textContent.includes('Pumpkin Spice Latte'));`,
    require: ['assertion'],
    forbid: ['waitForTimeout'],
    hint: 'The test cares that the item is in the list, not where. filter({ hasText }) picks an item by what it says.',
    cause:
      'The test relied on something it did not mean to check: the position of the item. Any change in the data order broke it. Locating the item by its text states the real requirement. The other sound repair is to take control of the data: page.route() can answer the request with a list the test defines.',
  },
];
