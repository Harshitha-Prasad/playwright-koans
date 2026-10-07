# 11 · Testing fundamentals

No koans here. These are the questions that open most QA interviews, whatever the tool.

## The idea in six lines

- Testing can show that defects are present. It cannot prove that there are none, and testing everything is impossible, so the job is choosing **what** to test based on risk.
- Finding a defect early is cheaper than finding it late. Reviewing requirements is testing too.
- **Verification** asks "are we building it right?" (does it match the specification). **Validation** asks "are we building the right thing?" (does it solve the user's problem).
- Test **levels** say where in the system you test: unit, integration, system, acceptance. Test **types** say what you are looking for: functional, performance, security, usability, accessibility, compatibility.
- Test design techniques exist to get the most defects out of the fewest test cases.
- A test that nobody trusts is worse than no test, because it still costs time to run and to ignore.

## Test design techniques, with one example

A field accepts an age from 18 to 65.

| Technique | What it gives you | Example values |
| --- | --- | --- |
| Equivalence partitioning | One value per group that should behave the same | 10 (too young), 40 (valid), 80 (too old) |
| Boundary value analysis | Values at the edges, where off-by-one bugs live | 17, 18, 65, 66 |
| Decision table | Every combination of conditions and the expected action | member? × order over €20? → discount or not |
| State transition | Valid and invalid moves between states | order: queued → brewing → done; done → queued must be rejected |
| Pairwise | Each pair of parameter values at least once, without every combination | browser × language × payment method |
| Error guessing, exploratory | What experience says tends to break | empty input, emoji, double submit, back button, two tabs |

## The automation pyramid

Many fast, focused tests at the bottom (unit), fewer at the service or API level, and a small number of end-to-end UI tests on top. The higher a test sits, the more it covers per test and the slower, more expensive and more fragile it is. A suite shaped like an ice-cream cone, with most checks at the UI level, is slow and flaky by construction.

## Interviewers ask

**What is the difference between severity and priority?**
Severity is the impact of the defect on the system: how bad is it. Priority is the urgency of fixing it: how soon. They differ often. A typo in the company name on the home page is low severity and high priority. A crash in a report that one admin runs once a year is high severity and low priority.

**Regression testing vs retesting?**
Retesting (confirmation testing) checks that a specific fixed defect is really fixed. Regression testing checks that the change did not break things that worked before. Retesting is planned per defect; regression is a standing suite and the best candidate for automation.

**Smoke vs sanity testing?**
A smoke test is a broad, shallow check that a new build is stable enough to test at all: it starts, you can log in, the main pages load. A sanity test is a narrow, deeper check of one area after a small change. In practice teams use the words loosely, so say what you mean by them.

**What makes a good bug report?**
A title that states the problem, the exact steps to reproduce it, what you expected, what happened, the environment and build, evidence (screenshot, trace, log lines, request ids) and an assessment of impact. The test of a good report: a developer can reproduce it without asking you anything.

**What would you automate, and what not?**
Automate what is repeated, stable and valuable: regression of core flows, smoke checks, API contracts, data-driven cases. Do not automate what changes every week, what runs once, what needs human judgement (usability, look and feel), or what costs more to maintain than to do by hand. Exploratory testing stays manual on purpose.

**What is the test pyramid, and where do end-to-end tests fit?**
A guideline for the shape of an automated suite: most tests at the unit level, some at the API or integration level, few through the UI. End-to-end tests are for the journeys that matter most to the business. Anything that can be checked below the UI should be, because it will be faster and more stable there.

**What are entry and exit criteria?**
Entry criteria say when testing can start: build deployed, environment and data ready, smoke test green. Exit criteria say when it can stop: planned tests executed, no open critical defects, agreed coverage reached, known risks accepted by the right person. "We ran out of time" is the exit criterion teams fall back on when they have not defined any.

**How do you decide how much testing is enough?**
By risk. Rank features by the likelihood of failure and the damage a failure would do, and spend effort where both are high. Make the remaining risk visible to whoever owns the release decision, because that decision is theirs and not the tester's.

**What does shift-left mean?**
Moving testing activities earlier: reviewing requirements and designs, agreeing acceptance criteria before development starts, developers writing unit tests, running automated checks on every commit. Shift-right is its counterpart: learning from production through monitoring, feature flags and canary releases.

**Functional vs non-functional testing?**
Functional testing checks what the system does: given this input, that result. Non-functional testing checks how well it does it: speed, load, security, accessibility, usability, reliability. Non-functional requirements are often unwritten, which is a good reason to ask about them early.

**What is the difference between a test plan, a test strategy and a test case?**
A strategy describes the approach for an organisation or product: levels, types, tools, environments. A plan applies it to one release or project: scope, schedule, people, risks. A test case is one concrete check with preconditions, steps and an expected result.

**Black-box vs white-box testing?**
Black-box tests are designed from the specification, without looking at the code: the techniques in the table above. White-box tests are designed from the structure of the code, aiming at statements, branches and paths. Most QA work is black-box or grey-box, where some knowledge of the internals guides where to look.
