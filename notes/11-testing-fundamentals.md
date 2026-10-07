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

Source: ISTQB Foundation Level syllabus (not checked online)

**Regression testing vs retesting?**
Retesting (confirmation testing) checks that a specific fixed defect is really fixed. Regression testing checks that the change did not break things that worked before. Retesting is planned per defect; regression is a standing suite and the best candidate for automation.

Source: [Certified Tester Foundation Level (CTFL) v4.0 Overview](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/)

**Smoke vs sanity testing?**
A smoke test is a broad, shallow check that a new build is stable enough to test at all: it starts, you can log in, the main pages load. A sanity test is a narrow, deeper check of one area after a small change. In practice teams use the words loosely, so say what you mean by them.

Source: experience, not documentation.

**What makes a good bug report?**
A title that states the problem, the exact steps to reproduce it, what you expected, what happened, the environment and build, evidence (screenshot, trace, log lines, request ids) and an assessment of impact. The test of a good report: a developer can reproduce it without asking you anything.

Source: ISTQB Foundation Level syllabus (not checked online)

**What would you automate, and what not?**
Automate what is repeated, stable and valuable: regression of core flows, smoke checks, API contracts, data-driven cases. Do not automate what changes every week, what runs once, what needs human judgement (usability, look and feel), or what costs more to maintain than to do by hand. Exploratory testing stays manual on purpose.

Source: experience, not documentation.

**What is the test pyramid, and where do end-to-end tests fit?**
A guideline for the shape of an automated suite: most tests at the unit level, some at the API or integration level, few through the UI. End-to-end tests are for the journeys that matter most to the business. Anything that can be checked below the UI should be, because it will be faster and more stable there.

Source: ISTQB Foundation Level syllabus (not checked online)

**What are entry and exit criteria?**
Entry criteria say when testing can start: build deployed, environment and data ready, smoke test green. Exit criteria say when it can stop: planned tests executed, no open critical defects, agreed coverage reached, known risks accepted by the right person. "We ran out of time" is the exit criterion teams fall back on when they have not defined any.

Source: ISTQB Foundation Level syllabus (not checked online)

**How do you decide how much testing is enough?**
By risk. Rank features by the likelihood of failure and the damage a failure would do, and spend effort where both are high. Make the remaining risk visible to whoever owns the release decision, because that decision is theirs and not the tester's.

Source: ISTQB Foundation Level syllabus (not checked online)

**What does shift-left mean?**
Moving testing activities earlier: reviewing requirements and designs, agreeing acceptance criteria before development starts, developers writing unit tests, running automated checks on every commit. Shift-right is its counterpart: learning from production through monitoring, feature flags and canary releases.

Source: [Certified Tester Foundation Level (CTFL) v4.0 Overview](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/)

**Functional vs non-functional testing?**
Functional testing checks what the system does: given this input, that result. Non-functional testing checks how well it does it: speed, load, security, accessibility, usability, reliability. Non-functional requirements are often unwritten, which is a good reason to ask about them early.

Source: [Certified Tester Foundation Level (CTFL) v4.0 Overview](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/)

**What is the difference between a test plan, a test strategy and a test case?**
A strategy describes the approach for an organisation or product: levels, types, tools, environments. A plan applies it to one release or project: scope, schedule, people, risks. A test case is one concrete check with preconditions, steps and an expected result.

Source: ISTQB Foundation Level syllabus (not checked online)

**Black-box vs white-box testing?**
Black-box tests are designed from the specification, without looking at the code: the techniques in the table above. White-box tests are designed from the structure of the code, aiming at statements, branches and paths. Most QA work is black-box or grey-box, where some knowledge of the internals guides where to look.

Source: [Certified Tester Foundation Level (CTFL) v4.0 Overview](https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/)

### Core concepts

**What is the difference between error, defect and failure?**
An *error* (mistake) is a human action that produces an incorrect result. A *defect* (bug) is the flaw in the software caused by the error. A *failure* is the observable deviation from expected behaviour when the defect is executed. Not every defect causes a failure (dead code), and not every failure is caused by a defect (environment, hardware).

Source: interview handbook, not checked against documentation.

**What are the seven testing principles?**
1. Testing shows the presence of defects, not their absence.
2. Exhaustive testing is impossible.
3. Early testing saves time and money (shift-left).
4. Defects cluster together (Pareto).
5. Beware of the pesticide paradox, repeated tests stop finding new bugs.
6. Testing is context dependent.
7. Absence-of-errors is a fallacy, a bug-free system can still fail the user.

Senior answer: give a concrete example of at least two, e.g. "we applied defect clustering by focusing regression on the checkout module after RCA showed 60% of production incidents came from there."

Source: interview handbook, not checked against documentation.

**Verification vs validation?**
Verification: are we building the product right? (reviews, static analysis, checking against specs). Validation: are we building the right product? (does it meet user needs, acceptance testing, UAT).

Source: interview handbook, not checked against documentation.

**Explain the test levels**
Unit (component) → Integration (component and system integration) → System → Acceptance (user, operational, contractual, alpha/beta). Each level has different objectives, test basis, test objects, and typical defects.

Source: interview handbook, not checked against documentation.

**Explain the test types**
Functional (what the system does), non-functional (how well, performance, security, usability, reliability, maintainability, portability), structural/white-box (coverage-based), change-related (confirmation/re-testing and regression).

Source: interview handbook, not checked against documentation.

**Static vs dynamic testing?**
Static: no execution, reviews, walkthroughs, inspections, static analysis (linters, type checkers). Dynamic: executing the software. Static testing finds defects earlier and cheaper. TypeScript's type checker and ESLint are static testing tools you use daily, say so.

Source: interview handbook, not checked against documentation.

### Test design techniques

**Equivalence partitioning and boundary value analysis?**
EP: divide inputs into classes where the system should behave the same; test one value per class (valid and invalid). BVA: defects cluster at boundaries, so test the boundary and the values immediately either side (2-value or 3-value BVA). Example: age field 18–65 → partitions <18, 18–65, >65; boundaries 17, 18, 19, 64, 65, 66.

Source: interview handbook, not checked against documentation.

**Decision table testing?**
For business rules with combinations of conditions. Columns = rules, rows = conditions and actions. Ensures every combination is considered and reveals ambiguous or missing rules. Collapse redundant columns.

Source: interview handbook, not checked against documentation.

**State transition testing?**
For systems with states and events (order status, login lockout). Model states, transitions, events and actions; test valid transitions, invalid transitions, and sequences (0-switch, 1-switch coverage).

Source: interview handbook, not checked against documentation.

**Use case / scenario testing?**
End-to-end user flows including main path and alternative/exception flows. Basis for E2E automation scenarios.

Source: interview handbook, not checked against documentation.

**Pairwise / orthogonal array testing?**
Most defects are triggered by interactions of at most two parameters. Pairwise testing covers every pair of parameter values with far fewer tests than a full cartesian product. Tools: PICT, AllPairs.

Source: interview handbook, not checked against documentation.

**Error guessing and exploratory testing, how do you make them systematic?**
Error guessing uses experience to target likely defect areas (nulls, empties, unicode, concurrency, time zones). Exploratory testing = simultaneous learning, design and execution. Make it systematic with **session-based test management**: time-boxed charters, session notes, debriefs. Heuristics: SFDIPOT (structure, function, data, interfaces, platform, operations, time), the "Test Heuristics Cheat Sheet" (Hendrickson).

Source: interview handbook, not checked against documentation.

### Test process and management

**Describe the test process activities**
Planning → monitoring & control → analysis → design → implementation → execution → completion. Be able to name outputs: test plan, test conditions, test cases, test procedures/scripts, test data, defect reports, test summary report.

Source: interview handbook, not checked against documentation.

**What goes in a test plan?**
Scope, objectives, test approach/strategy, test levels and types, entry/exit criteria, environment, tools, roles, schedule, risks and mitigations, deliverables. IEEE 829 / ISO 29119 structure.

Source: interview handbook, not checked against documentation.

**Explain the defect life cycle**
New → Assigned/Open → In Progress → Fixed → Ready for Retest → Retest → Closed / Reopened; plus Rejected, Deferred, Duplicate, Not a Bug. Know the fields of a good bug report: title, environment, build, steps, expected vs actual, severity, priority, evidence (logs, screenshots, HAR, trace).

Source: interview handbook, not checked against documentation.

**What is risk-based testing?**
Prioritise test effort by product risk = likelihood × impact. Identify risks (with devs, product), score them, and allocate depth of testing accordingly. Senior: describe how you used it to decide what goes into the smoke suite vs. full regression vs. exploratory.

Source: interview handbook, not checked against documentation.

**What metrics do you report, and which do you distrust?**
Useful: defect density per module, defect leakage (found in prod vs. pre-prod), test coverage of requirements/risks, automation pass rate over time, flaky-test rate, mean time to detect/resolve. Distrust: raw test-case counts and "% automated" without context, they measure activity, not quality.

Source: interview handbook, not checked against documentation.

### Agile and modern practice

**Role of QA in Scrum? What happens in the Three Amigos?**
QA participates in refinement (acceptance criteria, testability, edge cases), sprint planning (estimation includes testing), daily stand-up, review and retro. Three Amigos: PO, dev, QA agree on acceptance criteria before work starts, often written as Gherkin scenarios.

Source: interview handbook, not checked against documentation.

**Definition of Ready vs Definition of Done?**
DoR: story is clear, sized, has acceptance criteria and testable conditions before it enters a sprint. DoD: code reviewed, unit tests passing, automated tests added, deployed to staging, documentation updated, acceptance criteria verified.

Source: interview handbook, not checked against documentation.

**BDD, what is it really, and what is it not?**
BDD is a collaboration practice: discover behaviour through examples, formalise them (Gherkin: Given/When/Then), automate them. It is *not* "writing Cucumber". Senior view: Gherkin adds value when the business actually reads it; otherwise it adds a translation layer with maintenance cost. Be honest about when you would and would not use it.

Source: interview handbook, not checked against documentation.

**What is your test strategy for a microservices-based web product?**
Unit tests per service (dev-owned); contract tests between consumers and providers (Pact / OpenAPI-based); API/integration tests per service in isolation with mocked dependencies; a thin E2E layer through the UI for critical journeys; non-functional tests (load on key endpoints, security scans in CI); observability and synthetic monitoring in production. Ownership and where each runs in the pipeline matter as much as the tests.

Source: interview handbook, not checked against documentation.

**How do you do root cause analysis for a production incident?**
Reproduce → gather evidence (logs, traces, metrics, user reports) → timeline → identify contributing causes (5 Whys, fishbone) → distinguish root cause from trigger → corrective actions (fix + test gap + process change) → verify and share (blameless post-mortem). For test gaps: ask why no test caught it, missing test, wrong level, wrong environment, flaky and ignored?

Source: interview handbook, not checked against documentation.
