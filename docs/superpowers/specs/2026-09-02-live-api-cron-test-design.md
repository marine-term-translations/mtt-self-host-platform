# Live API Health Check & Auth Guard Cron Test — Design Spec

**Date**: 2026-09-02  
**Target Host**: `https://mtt.vliz.be`  
**Location**: `backend/scripts/live-api-check.js`  

---

## 1. Purpose & Overview

Provide an automated, zero-external-dependency health check script that can run via cron jobs (or CI/CD/CLI) to verify that the live Marine Term Translations (MTT) backend API (`https://mtt.vliz.be/api/*`) is operating normally.

The script runs a suite of:
1. **Infrastructure & Health checks** (GraphDB connectivity, OpenAPI spec generation).
2. **Core Public GET endpoints** (browse, terms, stats, communities, events, languages, sources, public leaderboard).
3. **Authentication & Authorization Guard checks** (verifying that protected endpoints reject unauthenticated calls with HTTP 401/403, and forged session cookies are rejected).

---

## 2. Architecture & Script Design

### 2.1 File Location & Dependencies
- **Script Path**: `backend/scripts/live-api-check.js`
- **Helper npm script**: `"test:live": "node scripts/live-api-check.js"` in `backend/package.json`
- **Dependencies**: Native Node.js `fetch` (built into Node 18+) and standard library modules (`node:process`, `node:util`). No additional npm packages are required.
- **Isolation**: Stored under `backend/scripts/` so it is not executed during offline unit test sweeps (`npm test` targets `backend/tests/*.test.js`).

### 2.2 Configuration Options
The script is zero-config by default, targeting the live environment, but allows flexible overrides via environment variables and CLI arguments:

| Config Option | Default | CLI Flag | Env Var | Description |
|---|---|---|---|---|
| Target Base URL | `https://mtt.vliz.be` | `--url=<url>` | `LIVE_API_URL` | Base host URL of the API |
| Request Timeout | `10000` (10s) | `--timeout=<ms>` | `REQUEST_TIMEOUT_MS` | Timeout per HTTP request |
| Request Delay | `100` (100ms) | `--delay=<ms>` | `REQUEST_DELAY_MS` | Delay between requests to prevent rate limiting |

---

## 3. Test Cases & Endpoint Coverage

### Group A: Health & Infrastructure
1. **`GET /api/sparql/health`**
   - **Expected Status**: `200`
   - **Assertion**: Confirms GraphDB / SPARQL connectivity is active.
2. **`GET /api/docs.json`**
   - **Expected Status**: `200`
   - **Assertion**: Response is a valid OpenAPI JSON spec containing `openapi` version `3.x`.

### Group B: Public Read Endpoints
3. **`GET /api/browse?limit=1`**
   - **Expected Status**: `200`
   - **Assertion**: Response contains `results` array and numerical `total`.
4. **`GET /api/terms?limit=1`**
   - **Expected Status**: `200`
   - **Assertion**: Response contains `terms` array.
5. **`GET /api/stats`**
   - **Expected Status**: `200`
   - **Assertion**: Response contains `totalTerms` and `totalTranslations`.
6. **`GET /api/stats/contributions-over-time?timeframe=last_14_days`**
   - **Expected Status**: `200`
   - **Assertion**: Response contains `data` array with time series items.
7. **`GET /api/communities`**
   - **Expected Status**: `200`
   - **Assertion**: Response returns community data array/object.
8. **`GET /api/events`**
   - **Expected Status**: `200`
   - **Assertion**: Response returns event data array/object.
9. **`GET /api/languages`**
   - **Expected Status**: `200`
   - **Assertion**: Response contains ISO language list including standard codes (e.g. `'en'`).
10. **`GET /api/sources?limit=1`**
    - **Expected Status**: `200`
    - **Assertion**: Response contains `sources` array.
11. **`GET /api/leaderboard/public?limit=5`**
    - **Expected Status**: `200`
    - **Assertion**: Response contains sanitized public contributor ranking; sensitive fields (`email`, password hashes) are omitted.

### Group C: Auth & Security Guards (Must Reject)
12. **`GET /api/me` (unauthenticated)**
    - **Expected Status**: `401 Unauthorized`
13. **`GET /api/me` (with invalid `Cookie: mtt.sid=invalid_test_cookie_12345`)**
    - **Expected Status**: `401 Unauthorized` (confirms invalid session tokens are rejected).
14. **`GET /api/users` (unauthenticated)**
    - **Expected Status**: `401 Unauthorized`
15. **`GET /api/flow/next` (unauthenticated)**
    - **Expected Status**: `401 Unauthorized`
16. **`GET /api/notifications` (unauthenticated)**
    - **Expected Status**: `401 Unauthorized`
17. **`GET /api/admin/users` (unauthenticated)**
    - **Expected Status**: `401 Unauthorized` or `403 Forbidden`

---

## 4. Execution Engine, Error Handling & Output

### 4.1 Execution Flow
- Starts by displaying run timestamp, target URL, and environment parameters.
- Runs each test sequentially with a small delay (~100ms) between calls to prevent rate-limit trips (`apiLimiter`).
- Uses `AbortSignal.timeout(timeoutMs)` for each HTTP call to guarantee requests never hang indefinitely.
- Measures latency (ms) for every request.
- Catches errors per request so that one endpoint failure does not abort the entire suite; all tests run and report.

### 4.2 Console Output Formatting
- On each test:
  - Success: `✔ [status] METHOD path (latency_ms)`
  - Failure: `✖ [FAIL] METHOD path — reason (latency_ms)`
- At completion:
  - Prints summary table: Total tests, passed count, failed count, total elapsed time.
  - If `failedCount === 0`: Exits with code `0`.
  - If `failedCount > 0`: Exits with code `1`.

---

## 5. Cron Job Usage & Integration

### Daily Crontab Setup Example
To run daily at midnight (00:00) or early morning (02:00) and append results to a health log:
```bash
# Run daily at 02:00 AM UTC
0 2 * * * cd /data/projects/mtt-self-host-platform/backend && node scripts/live-api-check.js >> /var/log/mtt-api-health.log 2>&1
```

### Manual Run Examples
```bash
# Run against default live host (https://mtt.vliz.be)
node backend/scripts/live-api-check.js

# Run against custom or local URL
node backend/scripts/live-api-check.js --url=http://localhost:5000

# Run with custom timeout
LIVE_API_URL=https://mtt.vliz.be REQUEST_TIMEOUT_MS=15000 node backend/scripts/live-api-check.js
```
