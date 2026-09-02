# Marine Term Translations — Backend

Backend Node.js service for the Marine Term Translations (MTT) platform.

---

## Testing & Health Checks

### Offline Unit Tests
Run the offline unit test suites:
```bash
npm test
```
All unit tests in `tests/*.test.js` run using an isolated SQLite database and local mocks without external network dependencies.

### Live API Health Check & Security Guard Runner
A standalone, zero-dependency runner is available in `scripts/live-api-check.js` to perform end-to-end sanity tests and security guard verification against a live deployed backend (defaulting to `https://mtt.vliz.be`).

#### Manual Execution
```bash
# Run against default live host (https://mtt.vliz.be)
npm run test:live

# Or run directly with node
node scripts/live-api-check.js

# Target another host (e.g. local or staging)
node scripts/live-api-check.js --url=http://localhost:5000

# Custom timeout and delay
node scripts/live-api-check.js --timeout=15000 --delay=200
```

#### What Is Tested
- **Health & Infrastructure**: `/api/sparql/health` (GraphDB status) and `/api/docs.json` (OpenAPI 3.x spec).
- **Core Public Read APIs**: `/api/browse`, `/api/terms`, `/api/stats`, `/api/stats/contributions-over-time`, `/api/communities`, `/api/events`, `/api/languages`, `/api/sources`, and `/api/leaderboard/public` (ensuring sensitive data is sanitized).
- **Security & Auth Guards (GET & POST)**:
  - **GET Guards**: Confirms that protected endpoints (`/api/me`, `/api/users`, `/api/flow/next`, `/api/notifications`, `/api/admin/users`) reject unauthenticated requests with `401`/`403`, and forged session cookies are rejected.
  - **Unauthenticated POST Guards**: Confirms that attempts to mutate resources across terms, appeals, vocabulary requests, flow sessions/reviews, communities, events, user preferences/API keys, admin configurations, tasks, schedulers, docker restarts, and KPI executions are strictly blocked with `401 Unauthorized`.

---

## Daily Cron Job & Scheduled Monitoring

### 1. GitHub Actions (Automated Cloud Schedule)
A GitHub Actions workflow is provided at [`.github/workflows/daily-api-health-check.yml`](../.github/workflows/daily-api-health-check.yml).
- **Schedule**: Automatically runs daily at 02:00 AM UTC (`0 2 * * *`).
- **Manual Trigger**: Can also be manually dispatched from the GitHub Actions tab against any custom target URL.
- **Alerting**: Fails with non-zero exit code if any endpoint degradation is detected, triggering GitHub's notification/email system for failed workflow runs.

### 2. Linux Server Crontab (On-Premise / Host Schedule)
To run the live check directly from the host server or VM:

```bash
# Open crontab editor
crontab -e

# Add daily health check entry (runs daily at 02:00 AM UTC):
0 2 * * * cd /data/projects/mtt-self-host-platform/backend && npm run test:live >> /var/log/mtt-api-health.log 2>&1
```

The script exits with code `0` when all tests pass, and code `1` if any endpoint fails or times out.

