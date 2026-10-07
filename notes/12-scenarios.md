# 12 · Scenario questions

No koans here. These are the open questions senior interviews are built on. There is no single right answer: the interviewer is listening for how you think.

## How to answer any of them

1. **Ask before you solve.** One or two questions about context (team size, release cadence, what has been tried) show more seniority than a fast answer.
2. **Find the cause before the cure.** Say how you would find out what is really going on.
3. **Give an order.** What you would do today, this sprint, and later.
4. **Name the trade-off.** Every option costs something. Say what.
5. **End with how you would know it worked.** A number, a signal, a check.

The answers below are outlines. They become convincing when you replace the generic parts with a situation you have lived through: what the system was, what you found, what changed.

## Scenarios

**The nightly UI suite used to take 20 minutes. Now it takes 90 and often times out. What do you do?**
- Measure first: per-test and per-file durations from the report, and when the slowdown started. A sudden jump points to one change; a slow creep points to growth.
- Look for the usual causes: tests added without parallelism, hard-coded sleeps, setup done through the UI before every test, a slow environment or dependency, retries hiding failures and tripling runtime.
- Quick wins: run in parallel workers, split jobs by tag or shard across machines, log in once and reuse the session, create data through the API.
- Structural fix: move checks that do not need a browser down to API level, and keep a small smoke set for every commit with the full suite on a schedule.
- Trade-off: more parallelism needs isolated test data. Verify with the duration trend over the next two weeks.

**A third of the failures in every run are flaky, and the team has stopped looking at the results. How do you get trust back?**
- Make the problem visible: tag or quarantine known flaky tests into a separate job, so the main run is green or red for real reasons.
- Classify each flaky test from its trace: test code (race, missing wait, shared data), environment (slow or unavailable dependency), or product (a real intermittent bug).
- Fix by category: retrying assertions in place of sleeps, isolated data per test, mocks for unstable third parties, bug reports for product issues.
- Set a rule: a quarantined test is fixed or deleted within a fixed time. A quarantine with no exit is a graveyard.
- Track the flaky rate as a number the team sees. Retries stay on as a safety net, not as the fix.

**You join a product with no test automation. Where do you start?**
- Learn the product and its risks first: what earns money, what breaks often, what scares the team at release time. Talk to support and developers.
- Start small and visible: a smoke suite of a handful of critical journeys that runs on every merge and that people come to rely on.
- Choose tooling that fits the team's language and skills, and put it in CI from day one. Tests that only run on one laptop do not count.
- Build the foundations early: test data strategy, stable locators agreed with developers, clear ownership of failures.
- Grow by risk, pushing checks to the API level where possible. Report progress as risks covered, not test counts.

**A bug shows up in staging but the developer cannot reproduce it locally. How do you move it forward?**
- Collect evidence that removes guessing: exact steps, account and data used, time, request ids, a trace or HAR file, and the matching server log lines.
- List what differs between the environments: build version, configuration and feature flags, data volume and shape, third-party integrations, browser, network, time zone.
- Narrow it down by changing one difference at a time, for example the same data locally, or the same flags.
- Reproduce it together with the developer on staging if needed. The goal is a shared understanding, not winning the argument.
- Afterwards, ask what would have caught it earlier: a missing test, a config difference worth removing.

**The release is tomorrow. The regression suite has 400 manual cases and you have one day. What do you do?**
- Do not pretend 400 cases fit. Prioritise by risk: what changed in this release, what those changes touch, and which flows hurt most if they break.
- Run automated checks first and use people for the changed and high-risk areas, plus a time-boxed exploratory session.
- Tell the release owner plainly what will be covered, what will not, and what the risk is. The decision to ship is theirs; your job is to make it an informed one.
- Reduce the blast radius if you can: feature flags, staged rollout, a tested rollback.
- After the release, fix the cause: a regression suite that cannot be run in the time available needs automating or trimming.

**Your tests depend on an external service, such as a payment or HR system, that is often down in the test environment. How do you keep the suite useful?**
- Separate two questions: "does our product work?" and "does the integration work?". Most tests only need the first.
- For the first, replace the dependency with a mock or stub at the network level, including its error cases, which you can rarely trigger on the real thing.
- For the second, keep a small set of contract or integration tests against the real service, run them separately, and label their failures as dependency issues.
- Add a health check before the run so a down dependency is reported once, not as two hundred failed tests.
- Trade-off: mocks can drift from reality. Contract tests and recorded responses keep them honest.

**A serious bug reached production. What do you do afterwards?**
- First help contain it: reproduce, assess impact, support the fix and verify it.
- Then find out how it escaped, without blame: was there a requirement, was there a test, did the test run, did someone ignore a red result, did test and production differ?
- Add the missing check at the lowest level that would have caught it, and look for the same gap in similar features.
- Fix the process cause, not only this instance: review step, test data, environment parity, release checklist.
- Share a short write-up. A team that learns in public from one escape has fewer of them.

**How would you test a login page?**
- Ask first: what are the rules? Lockout, password policy, single sign-on, remember me, supported browsers.
- Functional: valid login, wrong password, unknown user, empty fields, case sensitivity, whitespace, lockout after repeated failures, password reset, logout, session expiry.
- Security: no hint about which of user or password was wrong, protection against brute force, no credentials in URLs or logs, HTTPS, injection attempts, session handling after logout.
- Usability and accessibility: keyboard only, screen reader labels, error messages, password manager and autofill behaviour.
- Non-functional and compatibility: response time under load, browsers and devices.
- Then say what you would automate: the core positive and negative paths at API level, a few through the UI.

**You are asked to test a feature that has no written requirements. How do you proceed?**
- Find the sources that do exist: the ticket, design mock-ups, the developer, the product owner, similar features, competitor behaviour.
- Write down your understanding as examples ("given, when, then") and get it confirmed. Those examples become the acceptance criteria.
- Explore the feature with a charter and time box, noting questions and surprises as you go.
- Report findings as questions where the expected behaviour is unclear, not as bugs.
- Push for the lightweight version of requirements going forward: a few agreed examples before development starts.

**Your tests pass when run one at a time and fail when run in parallel. What is going on?**
- Almost always shared state: the same user account, the same record, a counter, a file, or a global setting changed by one test and read by another.
- Confirm it: run with one worker (passes), then with several (fails), and look at which tests overlap in the failing runs.
- Fix the isolation: unique data per test created through the API, one account per worker, cleanup in fixtures, no reliance on test order.
- Check the application too: some failures are real concurrency bugs that parallel tests have uncovered.
- Keep parallel running in CI as the default, so new shared-state problems show up immediately.

**A developer says your bug is "working as designed". You disagree. What do you do?**
- Check your own understanding first: reread the requirement, reproduce it again, and state the impact on a user in one sentence.
- Bring evidence, not opinion: the requirement, the behaviour, and what a user would expect.
- If the design itself is the problem, it is a product decision. Take it to the product owner with both views laid out fairly.
- Accept the outcome and record it, so the same discussion does not happen again in three months.
- Keep the relationship: the goal is the right product, not being right.

**Management wants 100% test automation. How do you respond?**
- Find out what they want from it: faster releases, fewer escaped bugs, lower cost. That goal is the thing to serve.
- Explain what automation is good at (repeated, stable, objective checks) and what it is not (exploration, usability, judgement, features still changing shape).
- Propose targets tied to the goal: critical journeys covered, feedback time under ten minutes, escaped defects trending down.
- Show the cost side: every automated test is code to maintain. Coverage numbers can be met with tests that check nothing.
- Offer a plan with an order of work and a review point.

**The team wants to use AI to generate all the tests. How would you use it responsibly?**
- Treat generated tests like code from a new colleague: useful drafts that need review. Check that each one asserts something meaningful and would fail if the feature broke.
- Use it where it is strong: boilerplate, data variations, first drafts of page objects, explaining failures, suggesting cases you missed.
- Keep humans on what needs context: deciding what is worth testing, risk, and whether a failure is a bug.
- Guard against the typical failure modes: brittle locators, assertions that mirror the implementation, invented APIs, and a large suite nobody understands.
- Mind the data you send: no production data or secrets in prompts.

**Locators break every sprint because the UI keeps changing. How do you make the suite resilient?**
- Look at what breaks: positional XPath and generated class names fail on every refactor, while roles, labels and visible text only change when the user-facing behaviour does.
- Move to user-facing locators, and agree on test ids with developers for elements that have no stable name.
- Keep locators in one place per page (page objects or components), so a UI change is one edit.
- Get earlier warning: run the affected tests on the pull request that changes the UI, so the developer sees the break.
- If the UI is still being redesigned weekly, test that area at API level for now and add UI tests when it settles.

**How do you decide whether to test something through the UI or through the API?**
- Ask what the test is meant to prove. Business rules, calculations, validation and permissions live behind the API and are faster and more stable to test there.
- Use the UI for what only exists in the UI: that a user can complete the journey, that the page shows the right state, that components work in a real browser.
- Combine them: set up and verify through the API, exercise the one UI interaction the test is about.
- Rule of thumb: many API tests for the rule and its edge cases, one or two UI tests to show it is wired up.

### Two that seniors are almost always asked

**How do you approach a flaky test?**
Treat it as a bug report about either the test or the product, and find out which before changing anything.

1. **Reproduce and measure.** Run it many times (`--repeat-each 20`, with and without parallel workers) so you know the failure rate, and whether it needs other tests running to fail.
2. **Read the evidence.** Open the trace of a failed attempt next to a passing one and compare the step where they part: what the page looked like, which requests were in flight, what the console said.
3. **Name the cause.** Nearly always one of: a missing wait for something the app does asynchronously, a locator that matches the wrong or more than one element, state shared between tests (same account, same record), test data that changes, an unstable environment or third party, or a real race in the product.
4. **Fix the cause, not the symptom.** A web-first assertion in place of a sleep, data the test owns, a mocked third party. If the product has the race, it is a product bug: report it with the trace.
5. **While you work on it,** tag or quarantine the test so it stops blocking others, with a ticket and a date. Retries are a way to see flakiness in the report, not a way to remove it.
6. **Prove it.** Repeat the run from step 1 and compare the failure rate. Then ask what allowed it in: a missing review rule, a shared account, a lint rule that could have caught the sleep.

Source: experience, not documentation.

**You have two days to test a feature. How do you approach it?**
Say the order out loud. The interviewer wants to hear you choose what not to test.

1. **First hour: understand it.** What does the feature do, for whom, and what is the worst thing that can go wrong? Read the ticket and the code changes, and ask the developer and the product owner what worries them.
2. **Rank by risk.** List the flows, score them by impact and likelihood, and agree the list with the team. This is also where you say what will not be covered.
3. **Day one: the top of the list.** The main flows end to end, then boundaries and negative cases for the riskiest ones, checked at the lowest level that can show them (an API call is faster than ten clicks). Explore in short, time-boxed sessions with a goal each, and report bugs as you find them so fixing starts early.
4. **Day two: widen and protect.** Integrations, permissions, the regression area around the change, one pass on other browsers or devices if relevant. Automate only the few checks that will pay back within the release, usually a smoke test of the main flow. Retest the fixes.
5. **End with a clear statement.** What was tested, what was not, what is still open, and your recommendation. The decision to ship belongs to the team, and they need the risks in plain words.

Source: experience, not documentation.

### Framework and strategy

**You join a team with 800 flaky Selenium tests taking 3 hours. What do you do in the first 90 days?**
Weeks 1–2: measure (pass rate, flaky rate, duration per test, coverage of critical flows), talk to devs/product, identify top-value journeys. Weeks 3–6: quarantine flaky tests, define a smoke suite (<15 min) that gates PRs, stabilise infra (Docker, parallelism). Weeks 7–12: pilot Playwright on the highest-value area, move data setup to API, delete redundant tests, establish ownership and a flaky-test SLA, publish dashboards. Communicate trade-offs and progress regularly.

Source: experience, not documentation.

**How do you convince developers to write testable code / add test IDs?**
Show the cost (flaky-test time, escaped defects), make it easy (lint rule, component library defaults), pair on it, include in DoD, celebrate wins; frame as shared ownership of quality, not QA's demand.

Source: experience, not documentation.

**How do you estimate testing effort for a feature?**
Break into test conditions by risk; estimate design, data, automation, exploratory, regression impact; add environment/dependency risk; give a range and assumptions; refine after refinement sessions.

Source: experience, not documentation.

**How do you measure the quality of your test automation?**
Defect detection (bugs found pre-prod vs escaped), flaky rate, execution time, maintenance effort per sprint, coverage of critical journeys and risks, mean time to diagnose a failure (traces!), team adoption (do devs run it?).

Source: experience, not documentation.

**Performance and security, what do you cover as an SDET?**
Performance: k6/JMeter/Artillery on critical APIs, budgets in CI, Lighthouse for page performance metrics (LCP, CLS, TBT); interpret P95/P99, throughput, error rate under load. Security: OWASP Top 10 awareness, ZAP baseline scans in CI (passive only, no attacks), dependency scanning, auth/authorisation test cases (IDOR, role escalation), secrets hygiene. Know your limits and when to bring in specialists.

Source: [ZAP - Baseline Scan](https://www.zaproxy.org/docs/docker/baseline-scan/), [Lighthouse performance scoring | Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring), [OWASP Top 10 | OWASP Foundation](https://owasp.org/www-project-top-ten/)

**Mobile? Non-functional? Accessibility? Localisation?**
Have one paragraph each: Appium/Detox vs. emulation; NFR checklists; axe + manual keyboard/screen-reader checks + WCAG 2.2 AA; locale/time zone/currency/RTL tests with data-driven runs (for example `de-DE` formats, umlauts, GDPR).

Source: [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)

### How would you test...?

For any "how would you test X" question, follow the same structure so you never ramble:

1. **Clarify:** users, requirements, constraints, platforms. Ask 2–3 questions first.
2. **Functional:** happy path, then boundaries and negative cases (equivalence partitions and boundary values).
3. **Non-functional:** performance, security, accessibility, usability, compatibility, localisation.
4. **Integration and data:** what it talks to, and what happens when that dependency fails.
5. **Automation plan:** what at the unit / API / UI level, and what stays exploratory.
6. **Risk:** what you'd test first if you had one hour.

**How would you test a search feature?**
Exact, partial and no match; case; umlauts (`Müller` vs `Mueller`); special characters and injection; empty query; very long queries; typos and suggestions; filters and sorting combined; pagination; response time with large data; debounce (no request on every keystroke); results respect permissions.

Source: experience, not documentation.

**How would you test a file upload?**
Allowed and disallowed types (check the content, not just the extension); size limit and the 0-byte case; name with spaces, umlauts or path traversal; duplicates; interrupted upload; virus scan; several files in parallel; progress bar; downloading back and comparing checksums.

Source: experience, not documentation.

**How would you test a REST endpoint such as `POST /orders`?**
The usual categories of API test cases (see the API testing note), plus idempotency, concurrency (two orders for the last item in stock), a downstream payment failure (the order must not be left half-created), and events or emails fired exactly once.

Source: experience, not documentation.

**How would you test a scheduling feature?**
Time zones, including users in two different zones; daylight-saving switch days (in the EU the last Sundays of March and October; other regions use other dates), when a day is 23 or 25 hours long and a night shift is an hour shorter or longer; overlapping shifts; shifts over midnight; leap years; regional public holidays; one person assigned twice; concurrent edits by two managers; notifications at the right local time; large rosters (performance); and generation jobs running through async tasks (retries, idempotency).

Source: [Directive 2000/84/EC on summer-time arrangements](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32000L0084)

**How would you test a pen, a lift or a vending machine?**
Use the same structure: clarify → functional → boundaries → non-functional (durability, safety, accessibility) → edge cases. Interviewers are testing your structure, not your knowledge of pens.

Source: experience, not documentation.
