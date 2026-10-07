# 05 · Network: API tests, mocking and waiting for responses

Koans: `koans/05-network-api.spec.ts` · Page: `/network.html` · API: `app/server.mjs` · Run: `npm run koan -- 05-network`

## The idea in six lines

- The `request` fixture is an HTTP client (`APIRequestContext`). It needs no browser, picks up `baseURL` and `extraHTTPHeaders` from the config, and makes Playwright a capable API test tool on its own.
- `page.route(pattern, handler)` intercepts the page's requests. The handler decides: `fulfill` (answer with a mock), `continue` (let it through, optionally modified), `abort` (fail it), or `fetch` then `fulfill` (take the real response and change it).
- A route only affects requests made **after** it is registered, so set it up before `goto`.
- `page.waitForResponse(...)` returns a promise. Create it **before** the action that triggers the request, await it afterwards.
- Mix the layers: create data through the API, check the UI; act in the UI, verify through the API.
- Mock what you do not own (payment providers, analytics) and the states you cannot produce on demand (500s, empty lists, slow responses).

## The four route moves

```ts
await page.route('**/api/specials', (route) => route.fulfill({ json: [] }));           // mock
await page.route('**/api/specials', (route) => route.fulfill({ status: 500 }));        // error state
await page.route('**/*.svg', (route) => route.abort());                                // block
await page.route('**/api/specials', async (route) => {                                 // patch
  const response = await route.fetch();
  const body = await response.json();
  await route.fulfill({ response, json: [...body, extra] });
});
```

`context.route` does the same for every page in the context. `page.routeFromHAR` replays a recorded HAR file.

## Also worth knowing

- **Handler order.** When several routes match, the one registered last runs first. `route.fallback()` passes the request on to the next matching handler; `route.continue()` sends it to the network and skips the others. ([Route](https://playwright.dev/docs/api/class-route#route-fallback))
- **Glob rules.** `*` matches anything except `/`, `**` matches anything including `/`, `{a,b}` lists alternatives, and the pattern has to match the whole URL. ([Glob URL patterns](https://playwright.dev/docs/network#glob-url-patterns))
- **Page routes win over context routes**, and switching routing on disables the HTTP cache. ([BrowserContext.route](https://playwright.dev/docs/api/class-browsercontext#browser-context-route))
- **Service workers** can swallow requests before your routes see them. If network events seem to be missing, set `serviceWorkers: 'block'` on the context. ([Network](https://playwright.dev/docs/network#missing-network-events-and-service-workers))
- **WebSockets** are mocked with `page.routeWebSocket()`. ([Mock WebSockets](https://playwright.dev/docs/mock#mock-websockets))
- **HAR files.** `routeFromHAR(file, { update: true })` records; without `update` it replays, matching URL and method strictly. ([Mocking with HAR files](https://playwright.dev/docs/mock#mocking-with-har-files))
- **Cookies in assertions.** `request.headers()` leaves out security-related headers such as cookies. Use `request.allHeaders()` for those. ([Request](https://playwright.dev/docs/api/class-request#request-headers))
- **Log in through the API, browse as that user.** Storage state can be passed between an `APIRequestContext` and a browser context. ([Reusing authentication state](https://playwright.dev/docs/api-testing#reusing-authentication-state))

## Interviewers ask

**How do you mock an API response in Playwright?**
`page.route` with `route.fulfill`, registered before the page makes the request. Be ready to say what you would *not* mock: the core flows of your own backend, where a mock would hide integration bugs.

Source: [Mock APIs](https://playwright.dev/docs/mock#mock-api-requests)

**Why create the `waitForResponse` promise before clicking?**
Because the response can arrive before the next line runs. If you start waiting afterwards, you wait for a second response that never comes.

Source: [Network](https://playwright.dev/docs/network#network-events)

**`request` fixture vs `page.request`?**
The `request` fixture is an isolated client with its own cookie jar. `page.request` (and `context.request`) shares cookies with the browser context, so it acts as the logged-in user.

Source: [API testing](https://playwright.dev/docs/api-testing#context-request-vs-global-request)

**How do you test how the UI handles a server error?**
Fulfil the call with a 500 (or abort it) and assert on the error state the user sees. No need to break a real environment.

Source: [Route](https://playwright.dev/docs/api/class-route#route-fulfill)

**How do you combine UI and API in one test?**
Seed or clean up data through the API in a fixture, drive the scenario through the UI, and where it matters verify the result with another API call. It is faster and more stable than doing all the setup through the UI.

Source: [API testing](https://playwright.dev/docs/api-testing#sending-api-requests-from-ui-tests)

**Can Playwright replace Postman?**
For automated API checks in a pipeline, yes: requests, assertions, auth, fixtures and reports are all there. Postman is still handy for exploring an API by hand and sharing collections with people who do not write code.

Source: experience, not documentation.

**How do you assert on the request the page sent?**
`page.waitForRequest(...)`, then inspect `request.method()`, `request.postDataJSON()` and `request.headers()`.

Source: [Request](https://playwright.dev/docs/api/class-request)
