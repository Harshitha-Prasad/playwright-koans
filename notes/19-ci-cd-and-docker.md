# 19 · CI/CD pipelines and Docker

No koans here. Pipeline concepts, GitHub Actions, GitLab CI, Jenkins, and Docker for test engineers. For Playwright's own reporting and CI setup, see note 08.

## Interviewers ask

### Concepts

**CI vs CD vs CD?**
Continuous Integration: merge frequently, build and test automatically on every change. Continuous Delivery: every change is releasable, deploy is a manual button. Continuous Deployment: every passing change deploys automatically.

Source: [Continuous integration](https://docs.github.com/en/actions/get-started/continuous-integration), [Continuous deployment](https://docs.github.com/en/actions/get-started/continuous-deployment), [Continuous delivery](https://docs.cloud.google.com/architecture/devops/devops-tech-continuous-delivery)

**Typical pipeline stages?**
Checkout → install (cached) → lint + type-check → unit tests → build → deploy to test env (or start app) → API/integration tests → E2E (smoke on PR, full on merge/nightly) → security/dependency scans → package/publish → deploy staging → post-deploy smoke → production (with approvals/canary).

Source: experience, not documentation.

**Where should E2E tests run and how often?**
PR: fast subset (smoke, changed-area tests via tags/path filters) within a time budget (e.g. <10 min). Merge to main: full regression, sharded. Nightly/scheduled: cross-browser, visual, long suites. Post-deploy: smoke against the real environment.

Source: experience, not documentation.

**What is a quality gate?**
A condition that blocks progression: tests pass, coverage threshold, no critical vulnerabilities, no new lint errors, performance budget. Enforce via required checks.

Source: experience, not documentation.

**Artefacts, caching, secrets, environments?**
Artefacts: reports, traces, screenshots, build outputs retained for a period. Cache: the npm cache (`~/.npm`) keyed by lockfile hash. Playwright does not recommend caching browser binaries. Secrets: encrypted variables, never printed, masked in logs (masking is not guaranteed). Environments: deployment targets with their own secrets and required reviewers.

Source: [Dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching), [Secrets](https://docs.github.com/en/actions/concepts/security/secrets), [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [Continuous Integration | Playwright](https://playwright.dev/docs/ci#caching-browsers)

**How do you keep pipelines fast and reliable?**
Caching, parallel jobs/sharding, Docker images with browsers pre-installed, test impact analysis, quarantine of flaky tests, retries only at test level with reporting, timeouts on jobs, fail-fast where appropriate, monitoring pipeline duration and flake rate.

Source: experience, not documentation.

**Blue/green, canary, feature flags, what's QA's role?**
Validate in production safely: canary updates a small part of the fleet, so only a small percentage of users see the new version; QA defines the smoke and monitoring checks that gate promotion, tests both flag states, and owns rollback criteria.

Source: [Canary deployments | GitLab Docs](https://docs.gitlab.com/user/project/canary_deployments/)

### GitHub Actions

**Core vocabulary?**
Workflow (`.github/workflows/*.yml`) → triggered by events (`push`, `pull_request`, `schedule`, `workflow_dispatch`) → jobs (run on runners, in parallel unless `needs`) → steps (`run` commands or `uses` actions). Contexts: `${{ github.* }}`, `${{ secrets.* }}`, `${{ matrix.* }}`, `env`.

Source: [Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions), [Contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)

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
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=${{ matrix.shard }}/4 --reporter=blob
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report
```

Write values that contain `${{ }}` in block style, not `{ key: ${{ ... }} }`: the braces break a YAML flow mapping. Then a `merge-reports` job (`needs: [test]`) that downloads all blobs with `actions/download-artifact` and runs `npx playwright merge-reports --reporter html ./all-blob-reports`. Alternative: run in the official `mcr.microsoft.com/playwright:v<version>-noble` container to skip browser installs. Action major versions move on; check the current ones.

Source: [Sharding | Playwright](https://playwright.dev/docs/test-sharding#github-actions-example), [Setting up CI | Playwright](https://playwright.dev/docs/ci-intro), [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)

**Matrix, `needs`, `if`, `continue-on-error`, reusable workflows, composite actions?**
Matrix expands a job across combinations (browser × shard). `needs` orders jobs. `if:` conditions (`github.event_name == 'schedule'`). `continue-on-error: true` lets the job pass when that step fails, or the run pass when that job fails. Reusable workflows (`workflow_call`) reuse whole jobs; composite actions bundle several steps into one step. Both DRY setup across repos.

Source: [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Reusing workflow configurations](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations)

**Caching Playwright browsers?**
Playwright does not recommend it: restoring the cache takes about as long as downloading the binaries, and the operating system dependencies on Linux cannot be cached. If you still want it, use `actions/cache` on `~/.cache/ms-playwright` keyed by the Playwright version, or use the Docker image.

Source: [Continuous Integration | Playwright](https://playwright.dev/docs/ci#caching-browsers)

**Concurrency and cancelling superseded runs?**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

New pushes then cancel the older run in the same group.

Source: [Control the concurrency of workflows and jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

**Security in Actions?**
Pin actions to full-length commit SHAs, least-privilege `permissions:` for `GITHUB_TOKEN`, avoid `pull_request_target` with untrusted code, never echo secrets, use OIDC for cloud auth instead of long-lived keys (e.g. Workload Identity Federation for GCP).

Source: [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use), [OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)

### GitLab CI and Jenkins

**GitLab CI basics?**
`.gitlab-ci.yml` with `stages`, `jobs`, `image`, `script`, `artifacts` (incl. `reports: junit:`), `cache`, `rules` (`only`/`except` are deprecated), `parallel: 4` with `CI_NODE_INDEX/CI_NODE_TOTAL` for sharding, `needs` for DAG pipelines, protected variables, environments, review apps.

Source: [CI/CD YAML syntax reference | GitLab Docs](https://docs.gitlab.com/ci/yaml/), [Predefined CI/CD variables reference | GitLab Docs](https://docs.gitlab.com/ci/variables/predefined_variables/)

**Jenkins basics?**
Declarative `Jenkinsfile` (`pipeline { agent, stages { stage { steps } }, post { always { junit, archiveArtifacts } } }`), agents/nodes, plugins (HTML Publisher, Allure, JUnit), credentials binding, parameters, shared libraries, parallel stages. Know `post { always }` for report publishing and workspace cleanup.

Source: [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/), [Recording tests and artifacts](https://www.jenkins.io/doc/pipeline/tour/tests-and-artifacts/)

**Compare the three from a test-automation perspective**
GitHub Actions: simplest, huge marketplace, tight PR integration. GitLab CI: built-in registry, review apps, strong DAG/parallel support. Jenkins: maximum flexibility and self-hosting, plugin maintenance burden. Say which ones you have used.

Source: experience, not documentation.

### Docker

**Image vs container vs registry? Dockerfile basics?**
Image = immutable template (layers); container = running instance; registry (Docker Hub, Google Artifact Registry) stores images. Dockerfile instructions: `FROM, WORKDIR, COPY, RUN, ENV, ARG, EXPOSE, CMD/ENTRYPOINT`. Layer caching: copy `package*.json` and `npm ci` *before* copying the rest.

Source: [What is Docker?](https://docs.docker.com/get-started/docker-overview/), [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)

**Why run Playwright tests in Docker?**
Identical environment locally and in CI (fonts, browsers, OS → stable visual tests), no browser install step, isolation, easy parallel runners. Official image: `mcr.microsoft.com/playwright:v1.xx.x-noble` (Ubuntu 24.04), version must match `@playwright/test`. The image has browsers and system dependencies, not the Playwright package itself.

Source: [Docker | Playwright](https://playwright.dev/docs/docker)

**A Dockerfile for a Playwright repo?**
```dockerfile
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]
```

Run: `docker build -t e2e . && docker run --rm --init --ipc=host -e BASE_URL=... -v $PWD/playwright-report:/app/playwright-report e2e`.

Source: [Docker | Playwright](https://playwright.dev/docs/docker), [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)

**docker-compose for test environments?**
Spin up app + DB + mocks + tests together from `compose.yaml`; `depends_on` with `condition: service_healthy` and a `healthcheck`; services reach each other by service name, so tests use `http://app:3000`; `docker compose up --exit-code-from e2e` (it implies `--abort-on-container-exit`).

Source: [docker compose up](https://docs.docker.com/reference/cli/docker/compose/up/), [Control startup and shutdown order in Compose](https://docs.docker.com/compose/how-tos/startup-order/), [Networking in Compose](https://docs.docker.com/compose/how-tos/networking/)

**Volumes, networks, environment variables, `.dockerignore`?**
Volumes persist/share data (reports out of the container); networks connect services by name; env via `-e`/`env_file`; `.dockerignore` keeps files such as `node_modules`, reports and `.git` out of the build context.

Source: [docker container run](https://docs.docker.com/reference/cli/docker/container/run/), [Networking in Compose](https://docs.docker.com/compose/how-tos/networking/), [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)

**Common Docker issues with browsers and how you fix them?**
Chromium running out of shared memory and crashing (`--ipc=host`, or a larger `--shm-size`), the image runs as root by default, which disables the Chromium sandbox (use `--user pwuser` with the seccomp profile for untrusted sites), missing fonts/locales, time zone (`TZ`), headed mode needs `xvfb-run`, `--init` for zombie processes, image/Playwright version mismatch (browsers are not found).

Source: [Docker | Playwright](https://playwright.dev/docs/docker), [Continuous Integration | Playwright](https://playwright.dev/docs/ci#running-headed)

**What about Kubernetes?**
Enough to explain pods, deployments, services, namespaces, `kubectl logs/exec/port-forward`, and that E2E runners can be Jobs (pods that run to completion).

Source: [Jobs | Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/job/), [kubectl Quick Reference | Kubernetes](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
