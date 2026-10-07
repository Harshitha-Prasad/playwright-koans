# 19 · CI/CD pipelines and Docker

No koans here. Pipeline concepts, GitHub Actions, GitLab CI, Jenkins, and Docker for test engineers. For Playwright's own reporting and CI setup, see note 08.

## Interviewers ask

### Concepts

**CI vs CD vs CD?**
Continuous Integration: merge frequently, build and test automatically on every change. Continuous Delivery: every change is releasable, deploy is a manual button. Continuous Deployment: every passing change deploys automatically.

Source: interview handbook, not checked against documentation.

**Typical pipeline stages?**
Checkout → install (cached) → lint + type-check → unit tests → build → deploy to test env (or start app) → API/integration tests → E2E (smoke on PR, full on merge/nightly) → security/dependency scans → package/publish → deploy staging → post-deploy smoke → production (with approvals/canary).

Source: interview handbook, not checked against documentation.

**Where should E2E tests run and how often?**
PR: fast subset (smoke, changed-area tests via tags/path filters) within a time budget (e.g. <10 min). Merge to main: full regression, sharded. Nightly/scheduled: cross-browser, visual, long suites. Post-deploy: smoke against the real environment.

Source: interview handbook, not checked against documentation.

**What is a quality gate?**
A condition that blocks progression: tests pass, coverage threshold, no critical vulnerabilities, no new lint errors, performance budget. Enforce via required checks.

Source: interview handbook, not checked against documentation.

**Artefacts, caching, secrets, environments?**
Artefacts: reports, traces, screenshots, build outputs retained for a period. Cache: `node_modules`/npm cache and Playwright browser binaries keyed by lockfile hash. Secrets: encrypted variables, never printed, masked in logs, scoped to environments with approvals.

Source: interview handbook, not checked against documentation.

**How do you keep pipelines fast and reliable?**
Caching, parallel jobs/sharding, Docker images with browsers pre-installed, test impact analysis, quarantine of flaky tests, retries only at test level with reporting, timeouts on jobs, fail-fast where appropriate, monitoring pipeline duration and flake rate.

Source: interview handbook, not checked against documentation.

**Blue/green, canary, feature flags, what's QA's role?**
Validate in production safely: canary exposes a percentage of users; QA defines the smoke and monitoring checks that gate promotion, tests both flag states, and owns rollback criteria.

Source: interview handbook, not checked against documentation.

### GitHub Actions

**Core vocabulary?**
Workflow (`.github/workflows/*.yml`) → triggered by events (`push`, `pull_request`, `schedule`, `workflow_dispatch`) → jobs (run on runners, in parallel unless `needs`) → steps (`run` commands or `uses` actions). Contexts: `${{ github.* }}`, `${{ secrets.* }}`, `${{ matrix.* }}`, `env`.

Source: interview handbook, not checked against documentation.

**A minimal Playwright workflow, be able to write it**
```yaml
name: e2e
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=${{ matrix.shard }}/4
        env: { BASE_URL: ${{ secrets.STAGING_URL }} }
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: blob-report-${{ matrix.shard }}, path: blob-report }
```

Then a `merge-reports` job that downloads all blobs and runs `npx playwright merge-reports --reporter html`. Alternative: run in the official `mcr.microsoft.com/playwright:v<version>-jammy` container to skip browser installs.

Source: interview handbook, not checked against documentation.

**Matrix, `needs`, `if`, `continue-on-error`, reusable workflows, composite actions?**
Matrix expands a job across combinations (browser × shard). `needs` orders jobs. `if:` conditions (`github.event_name == 'schedule'`). Reusable workflows (`workflow_call`) and composite actions to DRY setup across repos.

Source: interview handbook, not checked against documentation.

**Caching Playwright browsers?**
`actions/cache` on `~/.cache/ms-playwright` keyed by Playwright version, or use the Docker image. Know the trade-off: cache restore vs. install time.

Source: interview handbook, not checked against documentation.

**Concurrency and cancelling superseded runs?**
`concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` so new pushes cancel old PR runs.

Source: interview handbook, not checked against documentation.

**Security in Actions?**
Pin actions to SHAs, least-privilege `permissions:`, avoid `pull_request_target` with untrusted code, never echo secrets, use OIDC for cloud auth instead of long-lived keys (e.g. Workload Identity Federation for GCP).

Source: interview handbook, not checked against documentation.

### GitLab CI and Jenkins

**GitLab CI basics?**
`.gitlab-ci.yml` with `stages`, `jobs`, `image`, `script`, `artifacts` (incl. `reports: junit:`), `cache`, `rules`/`only`, `parallel: 4` with `CI_NODE_INDEX/CI_NODE_TOTAL` for sharding, `needs` for DAG pipelines, protected variables, environments, review apps.

Source: interview handbook, not checked against documentation.

**Jenkins basics?**
Declarative `Jenkinsfile` (`pipeline { agent, stages { stage { steps } }, post { always { junit, archiveArtifacts } } }`), agents/nodes, plugins (HTML Publisher, Allure, JUnit), credentials binding, parameters, shared libraries, parallel stages. Know `post { always }` for report publishing and workspace cleanup.

Source: interview handbook, not checked against documentation.

**Compare the three from a test-automation perspective**
GitHub Actions: simplest, huge marketplace, tight PR integration. GitLab CI: built-in registry, review apps, strong DAG/parallel support. Jenkins: maximum flexibility and self-hosting, plugin maintenance burden. Say what you've used (Jenkins/GitLab from your profile; GitHub Actions from your course).

Source: interview handbook, not checked against documentation.

### Docker

**Image vs container vs registry? Dockerfile basics?**
Image = immutable template (layers); container = running instance; registry (Docker Hub, GCR/Artifact Registry) stores images. Dockerfile instructions: `FROM, WORKDIR, COPY, RUN, ENV, ARG, EXPOSE, CMD/ENTRYPOINT`. Layer caching: copy `package*.json` and `npm ci` *before* copying the rest.

Source: interview handbook, not checked against documentation.

**Why run Playwright tests in Docker?**
Identical environment locally and in CI (fonts, browsers, OS → stable visual tests), no browser install step, isolation, easy parallel runners. Official image: `mcr.microsoft.com/playwright:v1.xx.x-jammy`, version must match `@playwright/test`.

Source: interview handbook, not checked against documentation.

**A Dockerfile for a Playwright repo?**
```dockerfile
FROM mcr.microsoft.com/playwright:v1.55.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]
```

Run: `docker build -t e2e . && docker run --rm -e BASE_URL=... -v $PWD/playwright-report:/app/playwright-report e2e`.

Source: interview handbook, not checked against documentation.

**docker-compose for test environments?**
Spin up app + DB + mocks + tests together; `depends_on` with healthchecks; networks so tests reach `http://app:3000`; `docker compose up --abort-on-container-exit --exit-code-from e2e`.

Source: interview handbook, not checked against documentation.

**Volumes, networks, environment variables, `.dockerignore`?**
Volumes persist/share data (reports out of the container); networks connect services by name; env via `-e`/`env_file`; `.dockerignore` excludes `node_modules`, reports, `.git`.

Source: interview handbook, not checked against documentation.

**Common Docker issues with browsers and how you fix them?**
Shared memory (`--shm-size=1g` or `--ipc=host`), running as non-root user, missing fonts/locales, time zone (`TZ`), headless-only, `--init` for zombie processes, image/Playwright version mismatch.

Source: interview handbook, not checked against documentation.

**What about Kubernetes?**
Enough to explain pods, deployments, services, namespaces, `kubectl logs/exec/port-forward`, and that E2E runners can be Jobs; Selenium Grid / Playwright with browser servers in K8s for scale.

Source: interview handbook, not checked against documentation.
