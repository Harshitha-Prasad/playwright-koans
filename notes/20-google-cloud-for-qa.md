# 20 · Google Cloud for QA

No koans here. What a test engineer needs on Google Cloud: reading logs for root cause analysis, Cloud Tasks, Cloud Run and Pub/Sub. Interviewers value practical fluency over certification trivia.

## Cheat sheet

```
gcloud config set project my-proj
gcloud logging read 'resource.type="cloud_run_revision" severity>=ERROR' --limit 20 --freshness=1h
gcloud tasks queues describe my-queue --location=europe-west1
gcloud tasks create-http-task --queue=my-queue --url=https://svc/run --method=POST --location=europe-west1
gcloud run services describe my-svc --region=europe-west1
gcloud auth print-identity-token
```

## Interviewers ask

### Core vocabulary

**Projects, IAM, service accounts?**
Everything lives in a project (billing, quotas, resources). IAM: who (principal) can do what (role: basic/predefined/custom) on which resource. Service accounts are identities for workloads; keys are a liability, prefer Workload Identity Federation from CI.

Source: interview handbook, not checked against documentation.

**Compute options in one sentence each?**
Compute Engine (VMs), GKE (Kubernetes), Cloud Run (containers, serverless, scales to zero), Cloud Functions/Cloud Run functions (event-driven functions), App Engine (PaaS).

Source: interview handbook, not checked against documentation.

**Storage/data services?**
Cloud Storage (object/bucket), Cloud SQL (managed Postgres/MySQL), Firestore (document DB), BigQuery (analytics warehouse), Memorystore (Redis), Pub/Sub (messaging), Cloud Tasks (task queues), Cloud Scheduler (cron).

Source: interview handbook, not checked against documentation.

### Cloud Logging and Logs Explorer

**What is Cloud Logging and what does Logs Explorer do?**
Central log ingestion for all GCP services and apps (via agents/SDK). Logs Explorer queries logs with the Logging query language, shows histograms, lets you save queries and create log-based metrics/alerts.

Source: interview handbook, not checked against documentation.

**Structure of a log entry?**
`timestamp`, `severity` (DEBUG…EMERGENCY), `resource.type` and `resource.labels` (e.g. `cloud_run_revision`, `service_name`), `logName`, `textPayload` or `jsonPayload`, `httpRequest`, `labels`, `trace`/`spanId`, `insertId`. Structured JSON logs are far easier to query, advocate for them.

Source: interview handbook, not checked against documentation.

**Write a query to find errors for one service in the last hour with a correlation ID**
```
resource.type="cloud_run_revision"
resource.labels.service_name="orders-api"
severity>=ERROR
jsonPayload.requestId="abc-123"
```

Operators: `=`, `!=`, `:` (contains), `=~` (regex), `AND/OR/NOT`, comparisons on severity/timestamps; time range via the picker; `httpRequest.status>=500`; `trace="projects/…/traces/…"` to follow one request across services.

Source: interview handbook, not checked against documentation.

**How do you do RCA with logs, traces and metrics together?**
Start from the symptom (alert, failed test, user report) → find the request by correlation/trace ID → follow it across services in Logs Explorer and Cloud Trace → correlate with Cloud Monitoring metrics (latency, error rate, instance count) and Error Reporting groupings → identify first failing component → check recent deploys/revisions → reproduce in test environment → write the missing test.

Source: interview handbook, not checked against documentation.

**Log-based metrics and alerts?**
Counter/distribution metrics from log filters (e.g. count of `severity>=ERROR` per service) → alerting policies → notification channels. QA can use these for post-deploy health checks.

Source: interview handbook, not checked against documentation.

**Log sinks, retention, exclusions, and cost?**
Sinks export logs to BigQuery/Cloud Storage/Pub/Sub for long-term analysis; retention defaults (30 days for `_Default`) can be configured; exclusion filters cut noise/cost. Know that debugging a two-week-old incident may require a sink.

Source: interview handbook, not checked against documentation.

**Logs Explorer vs Log Analytics?**
Log Analytics enables SQL over log buckets in BigQuery style, aggregate error rates per endpoint, etc.

Source: interview handbook, not checked against documentation.

### Cloud Tasks

**What is Cloud Tasks and how does it differ from Pub/Sub and Cloud Scheduler?**
Cloud Tasks: explicit, individually addressable tasks delivered to an HTTP/App Engine target with configurable schedule time, rate limits, retries and de-duplication by task name, the *producer controls* execution. Pub/Sub: publish/subscribe messaging, fan-out, at-least-once delivery, the *subscriber controls* consumption. Cloud Scheduler: cron that triggers HTTP/Pub/Sub/App Engine, often used to *create* tasks or publish messages.

Source: interview handbook, not checked against documentation.

**Queue configuration knobs?**
Rate limits (`maxDispatchesPerSecond`, `maxConcurrentDispatches`), retry config (`maxAttempts`, `minBackoff`, `maxBackoff`, `maxDoublings`, `maxRetryDuration`), task `scheduleTime`, task names for dedup, HTTP target with OIDC/OAuth token for authenticated Cloud Run endpoints, pause/purge queue.

Source: interview handbook, not checked against documentation.

**How do you use Cloud Tasks in testing?**
Trigger asynchronous backend jobs deterministically (e.g. schedule-generation, notifications) instead of waiting for a scheduler; verify handler behaviour by creating a task via `gcloud tasks create-http-task` or the client library and asserting on the side effects; test retry/idempotency by making the handler fail once; purge queues between runs; inspect task attempts and handler logs in Logs Explorer (`resource.type="cloud_tasks_queue"` and the target service's logs).

Source: interview handbook, not checked against documentation.

**What are the correctness concerns for task handlers, and how do you test them?**
At-least-once delivery → handlers must be idempotent; retries with backoff; deadlines (`dispatchDeadline`) → long handlers must ack fast and offload; ordering not guaranteed; poison tasks → dead-letter strategy (Cloud Tasks has no built-in DLQ, handlers must record failures); authentication of the invoking service account. Tests: duplicate-task test, timeout test, unauthorised-caller test, load test against rate limits.

Source: interview handbook, not checked against documentation.

**Emulating locally?**
No official Cloud Tasks emulator; common approaches: community emulators, invoking the handler endpoint directly in tests, or abstracting the queue behind an interface with an in-memory implementation.

Source: interview handbook, not checked against documentation.

### Cloud Run and deployment

**Cloud Run concepts an SDET should know?**
Services and revisions, traffic splitting between revisions (canary!), concurrency per instance, min/max instances (cold starts), request timeout, environment variables and secrets from Secret Manager, IAM invoker role (`roles/run.invoker`), ingress settings, `gcloud run deploy`, `gcloud run services describe`.

Source: interview handbook, not checked against documentation.

**How do you smoke-test a new Cloud Run revision before shifting traffic?**
Deploy with `--no-traffic`, hit the revision-specific URL (tagged revision) with the smoke suite, then `gcloud run services update-traffic` to 10% → 100%; monitor error rate and latency; roll back by shifting traffic to the previous revision.

Source: interview handbook, not checked against documentation.

**`gcloud` commands you actually use?**
`gcloud auth login / auth application-default login`, `gcloud config set project`, `gcloud logging read '<filter>' --limit 50 --format json`, `gcloud tasks queues list/describe/purge`, `gcloud tasks create-http-task`, `gcloud run services list/describe/logs read`, `gcloud pubsub topics publish`, `gcloud scheduler jobs run`.

Source: interview handbook, not checked against documentation.

**Pub/Sub testing basics?**
Topics, subscriptions (push/pull), acknowledgement deadline, at-least-once → idempotent consumers, dead-letter topics, message ordering keys, the Pub/Sub emulator for local tests, `gcloud pubsub subscriptions pull --auto-ack` to inspect.

Source: interview handbook, not checked against documentation.

**How do you authenticate CI/E2E tests to GCP services safely?**
Workload Identity Federation from GitHub Actions/GitLab (OIDC, no JSON keys), least-privilege service account (e.g. invoker + logging viewer + tasks enqueuer), short-lived ID tokens for calling Cloud Run (`gcloud auth print-identity-token`), secrets via Secret Manager.

Source: interview handbook, not checked against documentation.

**Observability stack: Monitoring, Trace, Error Reporting, Profiler, where does QA use each?**
Monitoring: SLOs/SLIs, dashboards, alerts used as post-deploy gates. Trace: request latency breakdown across services for performance RCA. Error Reporting: grouped exceptions with first/last seen → detect regressions after release. Profiler: CPU/memory hotspots for performance work.

Source: interview handbook, not checked against documentation.
