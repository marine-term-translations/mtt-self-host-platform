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
- **Security & Auth Guards**: Confirms that `/api/me`, `/api/users`, `/api/flow/next`, `/api/notifications`, and `/api/admin/users` reject unauthenticated requests with `401`/`403`, and that forged session cookies are rejected.

---

## Daily Cron Job Configuration

To monitor the live backend continuously, configure a cron job to run the live test suite daily (for instance, at 02:00 AM UTC):

```bash
# Open crontab editor
crontab -e

# Add daily health check entry:
0 2 * * * cd /data/projects/mtt-self-host-platform/backend && npm run test:live >> /var/log/mtt-api-health.log 2>&1
```

The script exits with code `0` when all tests pass, and code `1` if any endpoint fails or times out.
