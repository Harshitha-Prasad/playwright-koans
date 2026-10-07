# 17 · API testing

No koans here. HTTP and REST, what to test in an API, Postman, and the code you may be asked to write. For API tests written with Playwright itself, see note 05.

## Status codes at a glance

200 OK · 201 Created · 204 No Content · 301/302 Redirect · 304 Not Modified · 400 Bad Request · 401 Unauthorized (means not authenticated) · 403 Forbidden · 404 Not Found · 409 Conflict · 422 Unprocessable Content · 429 Too Many Requests · 500 Internal Server Error · 502 Bad Gateway · 503 Service Unavailable · 504 Gateway Timeout

## Interviewers ask

### HTTP and REST fundamentals

**What is REST? What makes an API RESTful?**
Architectural style: resources identified by URIs, standard HTTP methods, stateless requests, representations (usually JSON), HATEOAS in theory. Most "REST" APIs are pragmatic JSON-over-HTTP.

Source: interview handbook, not checked against documentation.

**HTTP methods and idempotency?**
`GET` read (safe, idempotent), `POST` create/action (not idempotent), `PUT` full replace (idempotent), `PATCH` partial update (not guaranteed idempotent), `DELETE` (idempotent), `HEAD`, `OPTIONS`. Idempotent = repeating the call has the same effect, matters for retries.

Source: [Idempotent - Glossary | MDN](https://developer.mozilla.org/en-US/docs/Glossary/Idempotent), [HTTP request methods - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)

**Status code families and the ones to know**
1xx info; 2xx success (200 OK, 201 Created, 202 Accepted, 204 No Content); 3xx redirect (301, 302, 304); 4xx client (400 Bad Request, 401 Unauthorized (it means not authenticated), 403 Forbidden, 404, 405, 409 Conflict, 415, 422 Unprocessable Content (validation), 429 Too Many Requests); 5xx server (500, 502, 503, 504).

Source: [HTTP response status codes - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)

**401 vs 403?**
401: not authenticated (missing/invalid credentials). 403: authenticated but not authorised for this resource.

Source: [401 Unauthorized - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401), [403 Forbidden - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403)

**Important headers?**
`Content-Type`, `Accept`, `Authorization`, `Cache-Control`, `ETag`/`If-None-Match`, `Location`, `Set-Cookie`, `X-Request-ID`/correlation IDs (great for RCA), CORS headers (`Access-Control-Allow-Origin`), `Retry-After`.

Source: [HTTP headers - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers)

**Authentication mechanisms?**
Basic, API key, Bearer tokens (JWT), OAuth 2.0 flows (authorization code + PKCE, client credentials for machine-to-machine), session cookies, mTLS. Know JWT structure (header.payload.signature), that the payload is only base64url-encoded, not encrypted, and expiry/refresh handling in tests.

Source: [RFC 7519: JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519), [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)

**What is CORS and does it affect API tests?**
Browser-enforced policy restricting cross-origin requests. Server-side/API tests (Postman, Playwright `request`) are unaffected; UI tests can surface CORS errors as failed fetches in the console/network, check them.

Source: [Cross-Origin Resource Sharing (CORS) - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

**REST vs GraphQL vs gRPC, testing differences?**
GraphQL: single endpoint, POST with `query`/`variables` (GET is allowed for queries), errors often inside a 200 response (`errors` array), assert on body, not only status; test resolvers, N+1 and depth limits. gRPC: protobuf over HTTP/2, needs client stubs or tools like grpcurl. REST: as above.

Source: [Serving over HTTP | GraphQL](https://graphql.org/learn/serving-over-http/), [FAQ | gRPC](https://grpc.io/docs/what-is-grpc/faq/)

**What is an OpenAPI/Swagger spec and how do you use it in testing?**
Machine-readable contract. Generate typed clients, validate responses against schemas, drive contract tests, spot undocumented behaviour, feed tools (Postman import, Schemathesis for property-based fuzzing).

Source: [Introduction | OpenAPI Documentation](https://learn.openapis.org/introduction.html)

### What to test in an API

**Categories of API test cases?**
- Contract/schema (fields, types, required, formats).
- Functional/business rules (happy path, boundaries, validation errors, state transitions).
- Negative (missing/invalid fields, wrong types, injection strings, oversized payloads).
- Auth/authorisation (no token, expired, wrong role, IDOR, accessing another user's resource).
- Idempotency and concurrency (double submit, race conditions).
- Pagination, filtering, sorting.
- Error responses (structure, no stack traces leaked).
- Performance basics (response time budgets), rate limiting.
- Backwards compatibility/versioning.

Source: experience, not documentation.

**What is contract testing and consumer-driven contracts (Pact)?**
Consumer defines expectations; provider verifies them in its own CI. Catches breaking changes between services without full integration environments. Distinguish from schema validation (one-sided).

Source: [Introduction | Pact Docs](https://docs.pact.io/), [How Pact works | Pact Docs](https://docs.pact.io/getting_started/how_pact_works)

**How do you test an asynchronous API (202 Accepted / webhooks / queues)?**
Poll a status endpoint with `expect.poll`/backoff and a deadline; subscribe to the callback with a test webhook receiver (e.g. a small server or a mock service); check side effects (DB record, message on topic); assert on idempotency of retries. This is directly relevant to Cloud Tasks / Pub/Sub flows.

Source: [202 Accepted - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202), [Assertions | Playwright](https://playwright.dev/docs/test-assertions#expectpoll)

**How do you handle test data and environment dependencies in API tests?**
Data builders + API-level setup/teardown; dedicated test tenants; seeded databases; feature flags; service virtualisation (WireMock, Mockoon, Prism) for third parties; contract tests to reduce the need for full environments.

Source: experience, not documentation.

**When and how would you implement a retry mechanism in API automation?**
Interviewers ask this to check judgement more than code. A good answer covers four points: which failures deserve a retry, which must never be retried, how the retry is built, and how you keep it from hiding real bugs.

*When to retry: transient failures that aren't the thing under test.*

- Network errors: connection reset, DNS hiccup, socket timeout.
- `429 Too Many Requests`, waiting as long as the `Retry-After` header says.
- `502 / 503 / 504` (and `408`): gateway or instance restarts, cold starts on Cloud Run, a deploy in progress.
- **Test setup and teardown calls** (creating a user or seeding data) against a shared environment. There, a transient error makes the test fail for a reason unrelated to what it checks.

*When NOT to retry:*

- **4xx errors (400, 401, 403, 404, 409, 422).** These are deterministic. Retrying wastes time and hides a real defect or a broken test.
- **Non-idempotent calls** such as `POST /orders` or `POST /payments`, unless the API supports an idempotency key. Otherwise a retry after a timeout can create two orders. The request may have succeeded even though the response never arrived.
- **The call under test itself**, when the behaviour you're verifying is the error. If the test checks that the API returns 503 during maintenance, a retry breaks the test.
- **As a fix for flaky tests.** A retry that turns a red test green without an understood cause is hiding a bug. Find the root cause instead.

*Three different mechanisms. Know which one fits:*

| Mechanism | Use it for | Tool |
| --- | --- | --- |
| **Request-level retry** | Transient infrastructure errors on a single call | A wrapper like `withRetry` below |
| **Polling until a state is reached** | Asynchronous work: a `202 Accepted` job, a Cloud Task, eventual consistency | `expect.poll` / `expect(...).toPass()` |
| **Test-level retry** | A safety net in CI, reported as "flaky" | `retries: 2` in `playwright.config.ts` |

Mixing these up is a common weak answer. Polling for a job to reach `COMPLETED` is not a retry, because nothing failed. And test-level retries re-run the whole test, including its setup.

*How to build it: a request-level wrapper in TypeScript for Playwright's `request` fixture:*

```ts
import type { APIResponse } from '@playwright/test';

const RETRYABLE = [408, 429, 502, 503, 504];

export async function withRetry(
  send: () => Promise<APIResponse>,
  { attempts = 3, baseDelayMs = 500, maxDelayMs = 8000, retryOn = RETRYABLE } = {},
): Promise<APIResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await send();
      // Return on success, on a non-retryable status, or when out of attempts
      if (!retryOn.includes(res.status()) || attempt === attempts) return res;

      const retryAfter = Number(res.headers()['retry-after']);      // seconds, if the server says
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))    // exponential backoff…
          * (0.5 + Math.random() / 2);                              // …with jitter
      console.log(`attempt ${attempt}: ${res.status()}, retrying in ${Math.round(delay)}ms`);
      await new Promise(r => setTimeout(r, delay));
    } catch (err) {                                                 // network error / timeout
      lastError = err;
      if (attempt === attempts) throw err;
      await new Promise(r => setTimeout(r, Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))));
    }
  }
  throw lastError;
}

// Usage: pass a function, so each attempt sends a fresh request
const res = await withRetry(() => request.post('/users', { data: buildUser() }));
await expect(res).toBeOK();
```

Design points to say out loud:

- **Only retry the listed status codes.** Anything else, such as a 400, is returned immediately so the test fails with the real response.
- **Exponential backoff with jitter** (0.5s → 1s → 2s, randomised). Many parallel workers then don't hammer a struggling service at the same moment.
- **Follow `Retry-After`** on 429 and 503.
- **Cap the attempts and the delay** so a dead service fails the test quickly. Keep the total wait well inside the Playwright test timeout.
- **Log every retry.** A retry that nobody can see is a hidden flake. Attach the attempts to the report with `test.info().annotations.push({ type: 'retry', description: … })` so frequent retries show up as a trend.
- **Idempotency.** For `POST` calls, send an `Idempotency-Key: <uuid>` header (if the API supports it) that stays the same across attempts, so the server can drop duplicates. Otherwise only retry GET, PUT and DELETE.
- **Keep it in one place.** Put it in your API client or a fixture, not copied into individual tests.

*Polling for async results is a different tool:*

```ts
const { id } = await (await request.post('/reports')).json();   // returns 202 Accepted
await expect.poll(
  async () => (await (await request.get(`/reports/${id}`)).json()).status,
  { intervals: [1_000, 2_000, 5_000], timeout: 30_000 },
).toBe('COMPLETED');
```

*In Postman* (works only in a collection run with the Collection Runner, the Postman CLI or Newman, not when you send a single request), add this to the request's post-response script:

```js
const max = 3;
const n = Number(pm.collectionVariables.get('retryCount') || 0);
if ([502, 503, 504].includes(pm.response.code) && n < max) {
  pm.collectionVariables.set('retryCount', n + 1);
  setTimeout(() => {}, 1000 * 2 ** n);              // backoff
  pm.execution.setNextRequest(pm.info.requestName); // run this request again
} else {
  pm.collectionVariables.unset('retryCount');
  pm.test('status is 2xx', () => pm.response.to.be.success);
}
```

*How to test the retry helper itself.* Interviewers like this follow-up because it's the SDET angle. Unit-test it against a fake. For example, return 503, 503 and then 200, and assert three calls and a final 200. Return 400 and assert exactly one call. Return 429 with `Retry-After: 2` and assert a 2-second wait. Throw `ECONNRESET` every time and assert it throws after the maximum number of attempts. For UI-level checks, `page.route()` can fail the first N calls to simulate the same thing.

*Senior close:* "Retries are for infrastructure noise, never for product behaviour. We retry only transient status codes and network errors, with backoff and a cap, log every retry, and track the retry rate. If it rises, that's a signal about the environment or the service, not something to tune away."

Source: [Retry-After header - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After), [Assertions | Playwright](https://playwright.dev/docs/test-assertions#expectpoll), [Customize request order in a collection run | Postman Docs](https://learning.postman.com/docs/collections/running-collections/building-workflows/), and checked by running the code.

### Postman

**Collections, folders, environments, variables?**
Collection = organised set of requests with shared auth/scripts. Variable scopes (narrowest wins): local → data → environment → collection → global. Use environments for base URLs. Keep secrets in Postman Vault, never hard-code tokens.

Source: [Store and reuse values using variables | Postman Docs](https://learning.postman.com/docs/sending-requests/variables/variables/)

**Pre-request and test scripts?**
JavaScript sandbox (`pm.*` API). Pre-request: build auth headers, generate data, set variables. Post-response (the tab was called Tests): `pm.test`, `pm.expect` (Chai), `pm.response.json()`, `pm.response.to.have.status(200)`, save values for chaining (`pm.environment.set`). Schema validation with `pm.response.to.have.jsonSchema`, which uses Ajv.

Source: [Scripting in Postman | Postman Docs](https://learning.postman.com/docs/tests-and-scripts/write-scripts/intro-to-scripts/), [pm.response | Postman Docs](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-response/)

**How do you chain requests (e.g. login → create → verify)?**
Extract token/ID in a post-response script into a variable, reference `{{token}}` in subsequent requests; control flow with `pm.execution.setNextRequest` (the old `postman.setNextRequest` is deprecated).

Source: [Customize request order in a collection run | Postman Docs](https://learning.postman.com/docs/collections/running-collections/building-workflows/)

**Data-driven runs?**
Collection Runner, Postman CLI or Newman with a CSV/JSON data file; iterate once per row; reference columns as `{{column}}`.

Source: [Run collections using imported data | Postman Docs](https://learning.postman.com/docs/collections/running-collections/working-with-data-files/)

**Newman and CI?**
`newman run collection.json -e env.json --reporters cli,junit` (`htmlextra` is a separate npm package); run in GitHub Actions/Jenkins; Newman exits with a non-zero code when a test fails, which fails the build; export reports as artefacts. Postman now recommends the Postman CLI (`postman collection run`). Newman only reads the v2.1 collection format, not the v3 format of Postman v12 and later.

Source: [Newman command reference | Postman Docs](https://learning.postman.com/docs/collections/using-newman-cli/newman-options/), [Migrate scripts from Newman to the Postman CLI](https://learning.postman.com/docs/reference/newman-cli/migrate-to-postman-cli), and checked by running the code.

**Mock servers and monitors?**
Mock server returns example responses for a collection (front-end/parallel development). Monitors schedule collection runs against live environments (synthetic checks).

Source: [Set up a mock server | Postman Docs](https://learning.postman.com/docs/design-apis/mock-apis/set-up-mock-servers/), [Monitor your APIs in Postman | Postman Docs](https://learning.postman.com/docs/monitoring-your-api/intro-monitors/)

**When would you *not* use Postman for automation?**
When tests need to live with the code, share types/builders, and run in the same pipeline as UI tests, then Playwright's API testing or a code-based client (supertest, axios + Jest) fits better. Postman excels for exploration, documentation, quick chaining and non-developer collaboration.

Source: experience, not documentation.

### Hands-on

**Hands-on: validate a response against a schema**
There are two common approaches. Know both.

*zod* (TypeScript-first: one definition gives you both the runtime check and the type):

```ts
import { z } from 'zod';
const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  email: z.email(),                               // Zod 4; z.string().email() is deprecated
  role: z.enum(['admin', 'editor', 'viewer']),
  active: z.boolean(),
});
type User = z.infer<typeof UserSchema>;          // no separate interface to keep in sync

const res = await request.get('/api/users');
expect(res.status()).toBe(200);
expect(res.headers()['content-type']).toContain('application/json');
const result = z.array(UserSchema).safeParse(await res.json());
expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);   // readable failure message
```

*ajv* (standard JSON Schema, which you can often reuse from the OpenAPI spec):

```ts
import Ajv from 'ajv';
const validate = new Ajv({ allErrors: true }).compile({
  type: 'object',
  required: ['id', 'name', 'email', 'role', 'active'],
  properties: {
    id: { type: 'integer' }, name: { type: 'string', minLength: 1 }, email: { type: 'string' },
    role: { enum: ['admin', 'editor', 'viewer'] }, active: { type: 'boolean' },
  },
  additionalProperties: false,   // catches unexpected new fields (contract drift)
});
const body = await (await request.get('/api/users/1')).json();
expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
```

Why validate the schema at all? TypeScript types disappear at runtime, so `as User` checks nothing. A schema catches renamed fields, fields that turned into `null`, or numbers that became strings, even when the values you assert on still look right.

Source: [Migration guide | Zod](https://zod.dev/v4/changelog), and checked by running the code.

**Hands-on: negative test**
Assert on the status code *and* the error body:

```ts
const res = await request.get('/api/users/999');
expect(res.status()).toBe(404);
expect(await res.json()).toEqual({ error: 'not found' });   // and no stack trace or internal details leaked
```

Source: checked by running the code, not documentation.

**Hands-on: multipart file upload**
```ts
const res = await request.post('/api/upload', {
  multipart: {
    file: { name: 'report.csv', mimeType: 'text/csv', buffer: Buffer.from('id,name\n1,Anna\n') },
    description: 'monthly report',
  },
});
expect(res.status()).toBe(201);
```

Test cases to mention: wrong file type, empty file, a file over the size limit (expect `413`), a file name with umlauts or spaces, and path traversal in the name (`../../etc/passwd`).

Source: [APIRequestContext | Playwright](https://playwright.dev/docs/api/class-apirequestcontext#api-request-context-post), [413 Content Too Large - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/413), and checked by running the code.

**Hands-on: tokens: get one once and reuse it**
```ts
// fixtures.ts: a worker-scoped API client authenticated once per worker
import { test as base, type APIRequestContext } from '@playwright/test';
export const test = base.extend<{}, { api: APIRequestContext }>({
  api: [async ({ playwright }, use) => {
    const auth = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    const { token } = await (await auth.post('/auth/login', {
      data: { user: process.env.API_USER, password: process.env.API_PASSWORD },
    })).json();
    const api = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    await use(api);
    await api.dispose(); await auth.dispose();
  }, { scope: 'worker' }],
});
```

**Decode a JWT** to check its claims or expiry. You don't need a library for this, because the payload is only base64url-encoded:

```ts
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
expect(payload.role).toBe('admin');
expect(payload.exp * 1000).toBeGreaterThan(Date.now());   // exp is in seconds
```

Auth test cases: no token → 401; expired or tampered token → 401; a valid token with the wrong role → 403; user A's token used on user B's resource → 403 or 404 (IDOR).

Source: [RFC 7519: JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519), and checked by running the code.

**Hands-on: curl and jq**
Expect to reproduce or debug a call from the terminal:

```bash
curl -s -X POST https://api.example.com/users \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Anna","email":"anna@x.io"}' -w '\nHTTP %{http_code} in %{time_total}s\n'

curl -s https://api.example.com/users | jq '.[] | select(.active) | .email'   # filter JSON
curl -sI https://api.example.com/health                                      # headers only
```

`-v` also shows the request and response headers, and the TLS handshake on HTTPS. `-w` prints the status code and timing. Browser DevTools and Postman can both export a request as a curl command, which is handy in bug reports.

Source: [curl man page](https://curl.se/docs/manpage.html), [jq Manual](https://jqlang.org/manual/), and checked by running the code.

**Hands-on: pagination, filtering and sorting tests**
- The first page, the last page, and one page past the end (expect an empty list, not a 500).
- `limit=0`, a negative limit, and a limit above the maximum. Is it capped or rejected?
- No duplicates or gaps across pages: collect every ID from all pages and compare the count with the total.
- Sorting is stable when two items have equal values, and the sort field is validated (`?sort=password` must not work).

Source: experience, not documentation.

**Hands-on: idempotency and concurrency**
Send the same `POST` twice at once with `Promise.all([...])`, then check that only one resource was created, or that the second call gets a `409`. Double-clicking a submit button is the UI version of the same bug.

Source: checked by running the code, not documentation.
