# 25 · Performance, security, test data and the command line

No koans here. The neighbouring topics a senior test engineer is expected to hold a conversation about.

## Command line basics

Expect to be asked to debug a CI runner or a container:

```bash
ls -la; cd; pwd; cat / less / tail -f app.log     # navigate, read logs, follow a log live
grep -rn "ERROR" logs/ | head                     # search
grep -c "status=500" access.log                   # count matches
ps aux | grep node; kill <pid>                    # processes
lsof -i :3000                                     # what is using the port
df -h; du -sh node_modules                        # disk space
chmod +x run.sh; ./run.sh                         # permissions
env | grep BASE_URL; export BASE_URL=…            # environment variables
curl / jq (see note 17)                               # HTTP and JSON
docker ps; docker logs -f <id>; docker exec -it <id> sh
```

Pipes (`|`), redirects (`>`, `>>`, `2>&1`) and exit codes (`echo $?`: a non-zero exit code is what fails a CI step) come up often. Know them.

## Interviewers ask

### Performance testing

**Types of performance test**
- **Load:** expected traffic, to check that response times hold.
- **Stress:** beyond expected traffic, to find the breaking point and see how the system fails.
- **Spike:** a sudden surge of traffic.
- **Soak / endurance:** a long run to find memory leaks and slow degradation.
- **Scalability:** does adding instances add capacity?
- **Volume:** large amounts of data.

Source: interview handbook, not checked against documentation.

**Key metrics**
Response time at **P50/P95/P99** (never just the average, because averages hide slow outliers), throughput (requests per second), error rate, concurrent users, and resource use (CPU, memory, DB connections). On Cloud Run, also watch cold starts and instance count.

Source: interview handbook, not checked against documentation.

**A k6 script**
k6 scripts are JavaScript, so they fit a Playwright team:

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // ramp up to 50 virtual users
    { duration: '3m', target: 50 },    // hold
    { duration: '1m', target: 0 },     // ramp down
  ],
  thresholds: {                        // the run FAILS in CI if these are breached
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500 ms
    http_req_failed: ['rate<0.01'],    // under 1% errors
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/products`);
  check(res, { 'status is 200': r => r.status === 200 });
  sleep(1);                            // think time between user actions
}
// k6 run -e BASE_URL=https://staging.example.com load.js
```

Other tools to name: JMeter (GUI, widely used), Gatling, Artillery, and Locust (Python). **Lighthouse** covers front-end performance (Core Web Vitals: LCP, INP, CLS).

Source: interview handbook, not checked against documentation.

**How do you run a meaningful performance test?**
1. Define goals with product (e.g. P95 < 500 ms at 200 requests per second).
2. Use a production-like environment and data volume.
3. Model realistic user journeys and think time, not a single endpoint hammered in a loop.
4. Warm up first.
5. Establish a baseline, then change one thing at a time.
6. Watch the server-side metrics alongside the load tool: Cloud Monitoring, DB slow logs, traces.
7. Put a small smoke load test with thresholds in CI to catch regressions. Run the big tests on a schedule.

Source: interview handbook, not checked against documentation.

### Security testing

**What security checks can QA own?**
- **OWASP Top 10** awareness: broken access control, injection, auth failures, security misconfiguration, vulnerable dependencies, and others.
- **Access-control tests:** every endpoint with no token, an expired token, the wrong role, and another user's IDs (IDOR). These are some of the most valuable security tests an SDET can automate.
- **Input tests:** SQL injection strings, XSS payloads (`<script>alert(1)</script>` must be escaped when displayed), oversized inputs, special characters.
- **Headers:** `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, secure and HttpOnly cookie flags.
- **Pipeline scans:** dependency scanning (`npm audit`, Dependabot, Snyk), SAST (CodeQL), and a DAST baseline scan with OWASP ZAP against staging.
- **Secrets:** none in the repo, logs, screenshots or traces. Playwright traces can capture tokens, so treat them as sensitive artefacts.

```ts
test('users cannot read another user\'s order (IDOR)', async ({ playwright }) => {
  const alice = await apiAs(playwright, 'alice');
  const bob = await apiAs(playwright, 'bob');
  const { id } = await (await alice.post('/orders', { data: { sku: 'HAT' } })).json();
  const res = await bob.get(`/orders/${id}`);
  expect([403, 404]).toContain(res.status());          // 404 also avoids revealing that the order exists
});
```

Source: interview handbook, not checked against documentation.

### Test data and privacy

**Strategies for test data**
- **Create per test** through the API or builders, then clean up in fixture teardown. This is the most reliable option.
- **Seeded baseline** data sets, restored before a run (DB snapshots, containers).
- **Synthetic data** generators such as `@faker-js/faker`. Use a fixed seed so a failure can be reproduced.
- **Unique identifiers** per run or worker (`test-${Date.now()}-${test.info().parallelIndex}`) to avoid clashes in parallel runs.
- **Service virtualisation** for third-party data.

Source: interview handbook, not checked against documentation.

**GDPR and test data**
Never copy production personal data into test environments without a legal basis. The usual approach is anonymisation (irreversible) or pseudonymisation (reversible with a separately stored key; still counts as personal data), plus data minimisation, access control for test environments, retention and deletion rules, and no real personal data in screenshots, videos, traces or bug tickets. Also test the product's GDPR features themselves: consent banners, data export (right of access), deletion (right to be forgotten, including backups and search indexes), and purpose limitation.

Source: interview handbook, not checked against documentation.
