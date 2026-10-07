# 24 · Design principles, unit testing and BDD

No koans here. Object-oriented design and patterns as they show up in a test framework, unit testing and test doubles, and Gherkin in practice.

## Interviewers ask

### OOP, SOLID and design patterns

**The four OOP pillars, each with a framework example**
- **Encapsulation:** a page object keeps its locators private and exposes only actions such as `login(user)`. Tests never touch the selectors.
- **Inheritance:** `LoginPage extends BasePage`, which provides shared navigation and header helpers. Don't make the hierarchy deep; prefer composition.
- **Polymorphism:** a `PaymentMethod` interface with `CardPayment` and `PayPalPayment` implementations. The checkout test calls `method.pay()` without knowing which one it has.
- **Abstraction:** an `ApiClient` hides the HTTP details, so tests call `api.createUser()`, not `request.post('/v2/users', …)`.

```ts
interface PaymentMethod { pay(amount: number): Promise<void>; }        // abstraction

abstract class BasePage {                                                // cannot be instantiated
  constructor(protected readonly page: Page) {}
  abstract readonly path: string;
  async open() { await this.page.goto(this.path); }                      // shared behaviour
}

class LoginPage extends BasePage {                                       // inheritance
  readonly path = '/login';
  private readonly email = this.page.getByLabel('Email');                // encapsulation
  private readonly password = this.page.getByLabel('Password');
  async login(user: string, pass: string) {
    await this.email.fill(user);
    await this.password.fill(pass);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
```

Source: interview handbook, not checked against documentation.

**Interface vs abstract class in TypeScript?**
An `interface` is a pure contract that disappears at compile time; a class can implement several. An `abstract class` can hold shared code and state; a class can extend only one. Access modifiers: `public`, `protected` (the class and its subclasses), `private` (the class only; `#field` makes it private at runtime too), and `readonly`.

Source: interview handbook, not checked against documentation.

**SOLID applied to test code**
- **S**ingle responsibility: a page object models one page. It doesn't also create test data or send emails.
- **O**pen/closed: add a new payment method by adding a class, not by adding another `if` to the checkout helper.
- **L**iskov substitution: every `PaymentMethod` implementation must work wherever the interface is expected.
- **I**nterface segregation: small interfaces (`Searchable`, `Paginated`) rather than one big `Page` interface.
- **D**ependency inversion: tests depend on abstractions that fixtures inject, not on concrete clients they create themselves.

Source: interview handbook, not checked against documentation.

**Design patterns you can name in your own framework**
| Pattern | Where it appears in test automation |
| --- | --- |
| **Page Object / Component Object** | UI locators and actions per page or widget |
| **Factory** | `PageFactory.create('login', page)`; creating the right driver or client for each environment |
| **Builder** | Test data: `new UserBuilder().withRole('admin').inactive().build()` |
| **Singleton** | One config or logger instance. Be careful: shared mutable state breaks parallel runs, and Playwright workers are separate processes anyway. |
| **Strategy** | Swappable behaviour: different login strategies (UI, API, SSO) behind one interface |
| **Facade** | One `ShopApi` class wrapping several endpoints into business actions |
| **Fixture / Dependency Injection** | Playwright fixtures inject what each test needs |
| **Screenplay** | Actors perform tasks and ask questions. An alternative to POM for large suites. |

```ts
class UserBuilder {                                   // Builder
  private user: User = { id: 0, name: 'Test User', email: `u${Date.now()}@test.io`, role: 'viewer', active: true };
  withRole(role: User['role']) { this.user.role = role; return this; }
  inactive() { this.user.active = false; return this; }
  build(): User { return { ...this.user }; }
}
const admin = new UserBuilder().withRole('admin').build();
```

Source: interview handbook, not checked against documentation.

### Unit testing and test doubles

**Mock vs stub vs spy vs fake vs dummy**
This is asked very often.

- **Dummy:** passed in but never used (fills a required parameter).
- **Stub:** returns canned answers (`getUser()` always returns Anna). It checks nothing.
- **Spy:** records how it was called (arguments, call count), and may call the real implementation.
- **Mock:** pre-programmed with *expectations*. The test fails if it isn't called the expected way.
- **Fake:** a working but simplified implementation, such as an in-memory database or a local email server.

In Playwright terms: `page.route(...).fulfill()` is a **stub** of the backend, and a **fake** is a mock server like WireMock that has real logic.

```ts
// Vitest / Jest
import { vi, expect, test } from 'vitest';
test('sends a welcome email once', async () => {
  const mailer = { send: vi.fn().mockResolvedValue({ ok: true }) };   // spy + stubbed return value
  await registerUser({ email: 'anna@x.io' }, mailer);
  expect(mailer.send).toHaveBeenCalledTimes(1);
  expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'anna@x.io' }));
});
```

Source: interview handbook, not checked against documentation.

**Unit test frameworks in the JavaScript and TypeScript world?**
Jest (the long-time standard), Vitest (fast, Vite-native, Jest-compatible API), Mocha + Chai, and Node's built-in `node:test`. Each test follows the same structure, **Arrange → Act → Assert**, with one reason to fail.

Source: interview handbook, not checked against documentation.

**Code coverage: what does it tell you, and what doesn't it?**
Statement, branch, function and line coverage (tools: Istanbul/`c8`, or `--coverage` in Jest and Vitest). It shows which code was *executed*, not whether it was *checked*. A test with no assertions can still reach 100% coverage. Treat coverage as a way to find untested code, not as a quality target. **Mutation testing** (Stryker) measures test strength: it makes small changes to the code and checks whether your tests fail.

Source: interview handbook, not checked against documentation.

**TDD in one sentence, and your honest view**
Red → green → refactor: write a failing test, write the minimum code to pass it, then clean up. It's mostly a developer practice. As an SDET you support it through pairing and by helping define acceptance tests up front (ATDD/BDD).

Source: interview handbook, not checked against documentation.

### BDD with Cucumber and Gherkin

**Gherkin keywords**
`Feature`, `Background` (steps shared by every scenario in the file), `Scenario`, `Scenario Outline` + `Examples` (data-driven), `Given` (context), `When` (action), `Then` (outcome), `And`/`But`, tags (`@smoke`), data tables and doc strings.

```gherkin
@checkout
Feature: Checkout

  Background:
    Given I am logged in as a "customer"

  Scenario Outline: Shipping cost depends on the order total
    Given my cart total is <total> EUR
    When I go to checkout
    Then the shipping cost is <shipping> EUR

    Examples:
      | total | shipping |
      | 29.99 | 4.95     |
      | 50.00 | 0.00     |

  Scenario: Add several items
    When I add these products:
      | name  | qty |
      | Shoes | 1   |
      | Hat   | 2   |
    Then the cart contains 3 items
```

Source: interview handbook, not checked against documentation.

**Step definitions with Playwright**
(using `playwright-bdd`, which runs Gherkin through the Playwright test runner so you keep fixtures, parallelism and traces):

```ts
import { createBdd } from 'playwright-bdd';
const { Given, When, Then } = createBdd();

Given('my cart total is {float} EUR', async ({ cartApi }, total: number) => {
  await cartApi.seedCartWithTotal(total);           // setup through the API, not the UI
});
When('I add these products:', async ({ page }, table: DataTable) => {
  for (const { name, qty } of table.hashes()) await addToCart(page, name, Number(qty));
});
Then('the shipping cost is {float} EUR', async ({ page }, shipping: number) => {
  await expect(page.getByTestId('shipping')).toHaveText(`${shipping.toFixed(2)} €`);
});
```

With classic `@cucumber/cucumber`, state is shared through the **World** object (`this`), and `Before`/`After` hooks handle setup and teardown, with tags for filtering (`Before({ tags: '@admin' }, …)`).

Source: interview handbook, not checked against documentation.

**Good vs bad Gherkin**
Write *declarative* steps that describe business behaviour, not *imperative* UI scripts. Good: `When I place an order`. Bad: `When I click "#btn-submit"`. Aim for one behaviour per scenario, 3–7 steps, no technical details, and reusable steps (with parameters) rather than near-duplicates.

Source: interview handbook, not checked against documentation.

**When does BDD pay off, and when doesn't it?**
It pays off when product owners and business analysts actually read or co-write the scenarios (Three Amigos), and the feature files serve as living documentation. It doesn't pay off when only QA reads them: then Gherkin is an extra layer between the test and the code, with duplicate step definitions and slower debugging. It's honest to say you'd use plain Playwright tests with `test.step()` for readability in that case.

Source: interview handbook, not checked against documentation.
