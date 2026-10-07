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

Source: [IAM overview](https://docs.cloud.google.com/iam/docs/overview), [Best practices for managing service account keys](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)

**Compute options in one sentence each?**
Compute Engine (VMs), GKE (Kubernetes), Cloud Run (containers, serverless, scales to zero), Cloud Functions/Cloud Run functions (event-driven functions), App Engine (PaaS).

Source: [Compare AWS and Azure services to Google Cloud](https://docs.cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison), [What is Cloud Run](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run)

**Storage/data services?**
Cloud Storage (object/bucket), Cloud SQL (managed PostgreSQL/MySQL/SQL Server), Firestore (document DB), BigQuery (analytics warehouse), Memorystore (Redis/Valkey), Pub/Sub (messaging), Cloud Tasks (task queues), Cloud Scheduler (cron).

Source: [Compare AWS and Azure services to Google Cloud](https://docs.cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison)

### Cloud Logging and Logs Explorer

**What is Cloud Logging and what does Logs Explorer do?**
Central log management for Google Cloud services (collected automatically) and your own apps (via the Ops Agent, client libraries or the API). Logs Explorer queries logs with the Logging query language, shows a timeline histogram, lets you save queries and create log-based metrics/alerts.

Source: [Cloud Logging overview](https://docs.cloud.google.com/logging/docs/overview), [View logs by using the Logs Explorer](https://docs.cloud.google.com/logging/docs/view/logs-explorer-interface)

**Structure of a log entry?**
`timestamp`, `severity` (DEFAULT, DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY), `resource.type` and `resource.labels` (e.g. `cloud_run_revision`, `service_name`), `logName`, one payload: `textPayload`, `jsonPayload` or `protoPayload`, `httpRequest`, `labels`, `trace`/`spanId`, `insertId`. Structured JSON logs are far easier to query, advocate for them.

Source: [LogEntry](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry), [Structured logging](https://docs.cloud.google.com/logging/docs/structured-logging)

**Write a query to find errors for one service in the last hour with a correlation ID**
```
resource.type="cloud_run_revision"
resource.labels.service_name="orders-api"
severity>=ERROR
jsonPayload.requestId="abc-123"
```

Operators: `=`, `!=`, `:` (has, substring match), `=~` and `!~` (regex), `AND`/`OR`/`NOT` (must be upper case; separate lines are joined with `AND`), comparisons on severity/timestamps; time range via the picker or `timestamp>="2026-10-07T09:00:00Z"`; `httpRequest.status>=500`; `trace="projects/…/traces/…"` to follow one request across services.

Source: [Logging query language](https://docs.cloud.google.com/logging/docs/view/logging-query-language)

**How do you do RCA with logs, traces and metrics together?**
Start from the symptom (alert, failed test, user report) → find the request by correlation/trace ID → follow it across services in Logs Explorer and Cloud Trace → correlate with Cloud Monitoring metrics (latency, error rate, instance count) and Error Reporting groupings → identify first failing component → check recent deploys/revisions → reproduce in test environment → write the missing test.

Source: experience, not documentation.

**Log-based metrics and alerts?**
User-defined counter or distribution metrics from log filters (e.g. count of `severity>=ERROR` per service) → alerting policies → notification channels. QA can use these for post-deploy health checks.

Source: [Log-based metrics overview](https://docs.cloud.google.com/logging/docs/logs-based-metrics)

**Log sinks, retention, exclusions, and cost?**
Sinks route logs to a log bucket, BigQuery, Cloud Storage, Pub/Sub or another project. `_Default` keeps logs 30 days by default and can be set from 1 to 3650 days; `_Required` keeps 400 days and cannot be changed. Exclusion filters on a sink cut noise/cost. Know that debugging an incident older than the retention period (30 days by default) needs a longer retention or a sink set up beforehand.

Source: [Route log entries](https://docs.cloud.google.com/logging/docs/routing/overview), [Quotas and limits (Cloud Logging)](https://docs.cloud.google.com/logging/quotas)

**Logs Explorer vs Log Analytics?**
Logs Explorer is for troubleshooting with the Logging query language and has no aggregation. Log Analytics (the current docs call it Observability Analytics) runs SQL over log buckets upgraded for analytics, for example to aggregate error rates per endpoint; a linked BigQuery dataset is optional.

Source: [Query and analyze logs with Observability Analytics](https://docs.cloud.google.com/logging/docs/log-analytics)

### Cloud Tasks

**What is Cloud Tasks and how does it differ from Pub/Sub and Cloud Scheduler?**
Cloud Tasks: explicit, individually addressable tasks delivered to an HTTP/App Engine target with configurable schedule time, rate limits, retries and de-duplication by task name, the *producer controls* execution. Pub/Sub: publish/subscribe messaging, fan-out, at-least-once delivery, publishers do not know their subscribers (implicit invocation). Cloud Scheduler: cron that triggers HTTP/Pub/Sub/App Engine, often used to *create* tasks or publish messages.

Source: [Choose Cloud Tasks or Pub/Sub](https://docs.cloud.google.com/tasks/docs/comp-pub-sub), [Cloud Scheduler overview](https://docs.cloud.google.com/scheduler/docs/overview)

**Queue configuration knobs?**
Rate limits (`maxDispatchesPerSecond`, `maxConcurrentDispatches`), retry config (`maxAttempts`, `minBackoff`, `maxBackoff`, `maxDoublings`, `maxRetryDuration`), task `scheduleTime` (at most 30 days ahead), task names for dedup, HTTP target with OIDC/OAuth token for authenticated Cloud Run endpoints, pause/purge queue.

Source: [REST Resource: projects.locations.queues](https://docs.cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues), [RetryConfig](https://docs.cloud.google.com/tasks/docs/reference/rest/v2/RetryConfig), [Quotas and limits (Cloud Tasks)](https://docs.cloud.google.com/tasks/docs/quotas)

**How do you use Cloud Tasks in testing?**
Trigger asynchronous backend jobs deterministically (e.g. schedule-generation, notifications) instead of waiting for a scheduler; verify handler behaviour by creating a task via `gcloud tasks create-http-task` or the client library and asserting on the side effects; test retry/idempotency by making the handler fail once; purge queues between runs; inspect task attempts and handler logs in Logs Explorer (`resource.type="cloud_tasks_queue"` and the target service's logs). Queue logs are off by default: enable them with `--log-sampling-ratio=1.0` on the queue.

Source: [gcloud tasks create-http-task](https://docs.cloud.google.com/sdk/gcloud/reference/tasks/create-http-task), [Use Cloud Logging (Cloud Tasks)](https://docs.cloud.google.com/tasks/docs/logging)

**What are the correctness concerns for task handlers, and how do you test them?**
At-least-once delivery → handlers must be idempotent; retries with backoff; deadlines (`dispatchDeadline`, 10 minutes by default and 30 minutes at most for HTTP tasks) → long handlers must ack fast and offload; ordering not guaranteed; poison tasks → dead-letter strategy (a task that exhausts its retries is deleted, no dead-letter queue is documented, so handlers must record failures); authentication of the invoking service account. Tests: duplicate-task test, timeout test, unauthorised-caller test, load test against rate limits.

Source: [Common pitfalls (Cloud Tasks)](https://docs.cloud.google.com/tasks/docs/common-pitfalls), [REST Resource: projects.locations.queues.tasks](https://docs.cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues.tasks), [Configure Cloud Tasks queues](https://docs.cloud.google.com/tasks/docs/configuring-queues)

**Emulating locally?**
No official Cloud Tasks emulator (the docs list a local emulator as not available); common approaches: unofficial community emulators, invoking the handler endpoint directly in tests, or abstracting the queue behind an interface with an in-memory implementation.

Source: [Migrate from Task Queues to Cloud Tasks](https://docs.cloud.google.com/tasks/docs/migrating), [gcloud beta emulators](https://docs.cloud.google.com/sdk/gcloud/reference/beta/emulators)

### Cloud Run and deployment

**Cloud Run concepts an SDET should know?**
Services and revisions, traffic splitting between revisions (canary!), concurrency per instance (default 80, maximum 1000), min/max instances (cold starts), request timeout (default 5 minutes, maximum 60), environment variables and secrets from Secret Manager, IAM invoker role (`roles/run.invoker`), ingress settings, `gcloud run deploy`, `gcloud run services describe`.

Source: [What is Cloud Run](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run), [Maximum concurrent requests for services](https://docs.cloud.google.com/run/docs/about-concurrency), [Set request timeout for services](https://docs.cloud.google.com/run/docs/configuring/request-timeout)

**How do you smoke-test a new Cloud Run revision before shifting traffic?**
Deploy with `--no-traffic --tag=candidate`, hit the tagged URL (`https://candidate---<service>-<hash>.a.run.app`) with the smoke suite, then `gcloud run services update-traffic <service> --to-tags=candidate=10` → 100; monitor error rate and latency; roll back by shifting traffic back with `--to-revisions=<previous>=100`.

Source: [Rollbacks, gradual rollouts, and traffic migration](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration), [gcloud run services update-traffic](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update-traffic)

**`gcloud` commands you actually use?**
`gcloud auth login / auth application-default login`, `gcloud config set project`, `gcloud logging read '<filter>' --limit 50 --format json`, `gcloud tasks queues list/describe/purge`, `gcloud tasks create-http-task`, `gcloud run services list/describe/logs read`, `gcloud pubsub topics publish`, `gcloud scheduler jobs run`.

Source: [gcloud logging read](https://docs.cloud.google.com/sdk/gcloud/reference/logging/read), [gcloud tasks queues](https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues)

**Pub/Sub testing basics?**
Topics, subscriptions (pull, push, export), acknowledgement deadline, at-least-once → idempotent consumers, dead-letter topics, message ordering keys, the Pub/Sub emulator for local tests, `gcloud pubsub subscriptions pull --auto-ack` to inspect.

Source: [Subscription overview](https://docs.cloud.google.com/pubsub/docs/subscription-overview), [Testing apps locally with the emulator](https://docs.cloud.google.com/pubsub/docs/emulator)

**How do you authenticate CI/E2E tests to GCP services safely?**
Workload Identity Federation from GitHub Actions/GitLab (OIDC, no JSON keys), least-privilege service account (e.g. invoker + logging viewer + tasks enqueuer), short-lived ID tokens for calling Cloud Run (`gcloud auth print-identity-token --audiences=<service URL>`; the audience must be the URL of the receiving service), secrets via Secret Manager.

Source: [Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation), [Authenticating service-to-service](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)

**Observability stack: Monitoring, Trace, Error Reporting, Profiler, where does QA use each?**
Monitoring: SLOs/SLIs, dashboards, alerts used as post-deploy gates. Trace: request latency breakdown across services for performance RCA. Error Reporting: grouped exceptions with notifications for new errors → detect regressions after release. Profiler: CPU/memory hotspots for performance work.

Source: [Google Cloud Observability documentation](https://docs.cloud.google.com/stackdriver/docs), [Manage errors](https://docs.cloud.google.com/error-reporting/docs/managing-errors)
