// What an answer in the "Test steps" track must and must not use, beyond producing the right page.
// `usage` is the tally the runtime keeps of what the test code called.

const REQUIRE = {
  assertion: 'Add an assertion: await expect(...) on what the user should see.',
  press: "Use locator.press('Enter') for this one.",
  hover: 'Use hover() to open the menu, as a user would.',
  selectOption: 'Use selectOption() for the dropdown.',
  setInputFiles: 'Use setInputFiles() for the upload.',
  route: 'Use page.route() to intercept the request.',
  waitForResponse: 'Use page.waitForResponse() to capture the response.',
};

const FORBID = {
  waitForTimeout: 'It works, but with a fixed sleep. Remove waitForTimeout: an assertion that retries waits exactly as long as needed.',
  force: 'It works, but force: true skips the checks a real user depends on. Remove it.',
  click: 'Do this one without click().',
};

/** Returns the list of rule violations for a run; an empty list means all rules are met. */
export function brokenRules(challenge, usage) {
  const problems = [];
  for (const name of challenge.require ?? []) {
    if (!usage[name]) problems.push(REQUIRE[name] ?? `Use ${name}.`);
  }
  for (const name of challenge.forbid ?? []) {
    if (usage[name]) problems.push(FORBID[name] ?? `Do not use ${name}.`);
  }
  return problems;
}
