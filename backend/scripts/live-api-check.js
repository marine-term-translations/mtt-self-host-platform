#!/usr/bin/env node
/**
 * Standalone Live API Health Check & Auth Guard Runner
 * 
 * Runs a suite of health, read data, and authentication guard checks against
 * the live MTT backend API. Designed to be run as a daily cron job or CLI test.
 * 
 * Usage:
 *   node backend/scripts/live-api-check.js
 *   node backend/scripts/live-api-check.js --url=https://mtt.vliz.be
 *   node backend/scripts/live-api-check.js --timeout=15000 --delay=200
 */

const process = require('node:process');

// Parse CLI flags and environment variables
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--url=')) acc.url = arg.split('=')[1];
  else if (arg.startsWith('--timeout=')) acc.timeout = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--delay=')) acc.delay = parseInt(arg.split('=')[1], 10);
  else if (arg === '--help' || arg === '-h') acc.help = true;
  return acc;
}, {});

if (args.help) {
  console.log(`
Live API Health Check & Auth Guard Runner
Usage: node live-api-check.js [options]

Options:
  --url=<url>        Target base URL (default: LIVE_API_URL env or https://mtt.vliz.be)
  --timeout=<ms>     Request timeout in ms (default: REQUEST_TIMEOUT_MS env or 10000)
  --delay=<ms>       Delay between requests in ms (default: REQUEST_DELAY_MS env or 100)
  --help, -h         Show this help message
  `);
  process.exit(0);
}

const BASE_URL = (args.url || process.env.LIVE_API_URL || 'https://mtt.vliz.be').replace(/\/$/, '');
const TIMEOUT_MS = args.timeout || parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 10000;
const DELAY_MS = args.delay || parseInt(process.env.REQUEST_DELAY_MS, 10) || 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Test case definitions
 */
const testCases = [
  // --- Group A: Health & Infrastructure ---
  {
    group: 'Health & Infrastructure',
    name: 'GraphDB connection health',
    method: 'GET',
    path: '/api/sparql/health',
    expectedStatus: [200],
    validate: (data) => data && typeof data === 'object'
  },
  {
    group: 'Health & Infrastructure',
    name: 'OpenAPI Swagger documentation spec',
    method: 'GET',
    path: '/api/docs.json',
    expectedStatus: [200],
    validate: (data) => data && typeof data.openapi === 'string' && data.openapi.startsWith('3.')
  },

  // --- Group B: Public Data & Sanity Checks ---
  {
    group: 'Public Data',
    name: 'Search & browse terms with facets',
    method: 'GET',
    path: '/api/browse?limit=1',
    expectedStatus: [200],
    validate: (data) => Array.isArray(data.results) && typeof data.total === 'number'
  },
  {
    group: 'Public Data',
    name: 'List SKOS/RDF terms',
    method: 'GET',
    path: '/api/terms?limit=1',
    expectedStatus: [200],
    validate: (data) => Array.isArray(data.terms)
  },
  {
    group: 'Public Data',
    name: 'Global translation stats',
    method: 'GET',
    path: '/api/stats',
    expectedStatus: [200],
    validate: (data) => typeof data.totalTerms === 'number' && typeof data.totalTranslations === 'number'
  },
  {
    group: 'Public Data',
    name: 'Contributions over time stats',
    method: 'GET',
    path: '/api/stats/contributions-over-time?timeframe=last_14_days',
    expectedStatus: [200],
    validate: (data) => Array.isArray(data.data)
  },
  {
    group: 'Public Data',
    name: 'Communities listing',
    method: 'GET',
    path: '/api/communities',
    expectedStatus: [200],
    validate: (data) => Array.isArray(data) || typeof data === 'object'
  },
  {
    group: 'Public Data',
    name: 'Events listing',
    method: 'GET',
    path: '/api/events',
    expectedStatus: [200],
    validate: (data) => Array.isArray(data) || typeof data === 'object'
  },
  {
    group: 'Public Data',
    name: 'ISO language codes catalog',
    method: 'GET',
    path: '/api/languages',
    expectedStatus: [200],
    validate: (data) => Array.isArray(data) && data.some((item) => item.code === 'en')
  },
  {
    group: 'Public Data',
    name: 'Data sources listing',
    method: 'GET',
    path: '/api/sources?limit=1',
    expectedStatus: [200],
    validate: (data) => Array.isArray(data.sources)
  },
  {
    group: 'Public Data',
    name: 'Public leaderboard ranking & privacy sanitization',
    method: 'GET',
    path: '/api/leaderboard/public?limit=5',
    expectedStatus: [200],
    validate: (data) => Array.isArray(data) && !data.some((u) => u.email || u.password)
  },

  // --- Group C: Auth Guards (GET) ---
  {
    group: 'Auth Guards (GET)',
    name: 'Current user without session cookie rejects 401',
    method: 'GET',
    path: '/api/me',
    expectedStatus: [401]
  },
  {
    group: 'Auth Guards (GET)',
    name: 'Current user with forged session cookie rejects 401',
    method: 'GET',
    path: '/api/me',
    headers: { Cookie: 'mtt.sid=forged_unauthorized_token_xyz987' },
    expectedStatus: [401]
  },
  {
    group: 'Auth Guards (GET)',
    name: 'All users list without auth rejects 401',
    method: 'GET',
    path: '/api/users',
    expectedStatus: [401]
  },
  {
    group: 'Auth Guards (GET)',
    name: 'Translation flow next task without auth rejects 401',
    method: 'GET',
    path: '/api/flow/next',
    expectedStatus: [401]
  },
  {
    group: 'Auth Guards (GET)',
    name: 'User notifications without auth rejects 401',
    method: 'GET',
    path: '/api/notifications',
    expectedStatus: [401]
  },
  {
    group: 'Auth Guards (GET)',
    name: 'Admin users management without auth rejects 401/403',
    method: 'GET',
    path: '/api/admin/users',
    expectedStatus: [401, 403]
  },

  // --- Group D: Auth Guards (Unauthenticated POST) ---
  {
    group: 'Auth Guards (POST)',
    name: 'Create term without session rejects 401',
    method: 'POST',
    path: '/api/terms',
    body: { uri: 'https://vocab.vliz.be/terms/live_check_test' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create term with forged cookie rejects 401',
    method: 'POST',
    path: '/api/terms',
    headers: { Cookie: 'mtt.sid=forged_unauthorized_token_xyz987' },
    body: { uri: 'https://vocab.vliz.be/terms/live_check_test' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create term with empty body without auth rejects 401',
    method: 'POST',
    path: '/api/terms',
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Submit appeal without auth rejects 401',
    method: 'POST',
    path: '/api/appeals',
    body: { translation_id: 1, opened_by: 'unauth_user' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Submit vocabulary request without auth rejects 401',
    method: 'POST',
    path: '/api/vocabulary-requests',
    body: { label: 'Marine Ecology Term' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Start flow session without auth rejects 401',
    method: 'POST',
    path: '/api/flow/start',
    body: { language: 'fr' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Submit flow review without auth rejects 401',
    method: 'POST',
    path: '/api/flow/review',
    body: { translationId: 1, action: 'approve' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create community without auth rejects 401',
    method: 'POST',
    path: '/api/communities',
    body: { name: 'Unauthorized Community' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Join community without auth rejects 401',
    method: 'POST',
    path: '/api/communities/1/join',
    body: {},
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create community goal without auth rejects 401',
    method: 'POST',
    path: '/api/communities/1/goals',
    body: { target_count: 50 },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Invite to community without auth rejects 401',
    method: 'POST',
    path: '/api/communities/1/invite',
    body: { username: 'unauth_user' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Accept community invitation without auth rejects 401',
    method: 'POST',
    path: '/api/invitations/1/accept',
    body: {},
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create event without auth rejects 401',
    method: 'POST',
    path: '/api/events',
    body: { title: 'Unauthorized Event' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create event team without auth rejects 401',
    method: 'POST',
    path: '/api/events/1/teams',
    body: { name: 'Unauthorized Team' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Join event team without auth rejects 401',
    method: 'POST',
    path: '/api/events/1/join',
    body: { teamId: 1 },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Equip user title without auth rejects 401',
    method: 'POST',
    path: '/api/users/titles/equip',
    body: { titleId: 'master_translator' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Update user preferences without auth rejects 401',
    method: 'POST',
    path: '/api/user/preferences',
    body: { preferredLanguages: ['en', 'fr'] },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Save OpenRouter API key without auth rejects 401',
    method: 'POST',
    path: '/api/user/preferences/openrouter-key',
    body: { apiKey: 'sk-or-v1-fake-unauthorized-key' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Update email preferences without auth rejects 401',
    method: 'POST',
    path: '/api/user/preferences/email',
    body: { enabled: true },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create data source without auth rejects 401',
    method: 'POST',
    path: '/api/sources',
    body: { name: 'Unauthorized Source' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create task without auth rejects 401',
    method: 'POST',
    path: '/api/tasks',
    body: { name: 'Unauthorized Task' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create task scheduler without auth rejects 401',
    method: 'POST',
    path: '/api/task-schedulers',
    body: { name: 'Unauthorized Scheduler' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Create admin community goal without auth rejects 401',
    method: 'POST',
    path: '/api/admin/community-goals',
    body: { title: 'Unauthorized Admin Goal' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Restart container without auth rejects 401',
    method: 'POST',
    path: '/api/admin/docker/containers/marine-backend/restart',
    body: {},
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Revert stale translations without auth rejects 401',
    method: 'POST',
    path: '/api/admin/revert-stale-translations',
    body: {},
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Admin moderation penalty without auth rejects 401',
    method: 'POST',
    path: '/api/admin/moderation/users/1/penalty',
    body: { penaltyType: 'warning' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  },
  {
    group: 'Auth Guards (POST)',
    name: 'Execute KPI query without auth rejects 401',
    method: 'POST',
    path: '/api/kpi/execute',
    body: { queryId: 'kpi_monthly_report' },
    expectedStatus: [401],
    validate: (data) => data && data.error === 'Not authenticated'
  }
];

async function runSingleTest(tc) {
  const url = `${BASE_URL}${tc.path}`;
  const startTime = Date.now();
  
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'MTT-Live-HealthCheck/1.0',
    ...(tc.headers || {})
  };

  const fetchOptions = {
    method: tc.method,
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS)
  };

  if (tc.body !== undefined) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    fetchOptions.body = typeof tc.body === 'string' ? tc.body : JSON.stringify(tc.body);
  }

  try {
    const res = await fetch(url, fetchOptions);
    
    const latency = Date.now() - startTime;
    const isStatusOk = tc.expectedStatus.includes(res.status);
    
    let body = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        body = await res.json();
      } catch (err) {
        // failed to parse json
      }
    }

    if (!isStatusOk) {
      return {
        passed: false,
        name: tc.name,
        group: tc.group,
        path: tc.path,
        status: res.status,
        expected: tc.expectedStatus.join('/'),
        latency,
        error: `Expected status ${tc.expectedStatus.join('/')} but got ${res.status}`
      };
    }

    if (tc.validate && body !== null) {
      const isValid = tc.validate(body);
      if (!isValid) {
        return {
          passed: false,
          name: tc.name,
          group: tc.group,
          path: tc.path,
          status: res.status,
          expected: tc.expectedStatus.join('/'),
          latency,
          error: 'Response validation failed against schema check'
        };
      }
    }

    return {
      passed: true,
      name: tc.name,
      group: tc.group,
      path: tc.path,
      status: res.status,
      expected: tc.expectedStatus.join('/'),
      latency
    };
  } catch (err) {
    const latency = Date.now() - startTime;
    return {
      passed: false,
      name: tc.name,
      group: tc.group,
      path: tc.path,
      status: 'ERR',
      expected: tc.expectedStatus.join('/'),
      latency,
      error: err.name === 'TimeoutError' ? `Timeout after ${TIMEOUT_MS}ms` : err.message
    };
  }
}

async function main() {
  const runStart = Date.now();
  const timestamp = new Date().toISOString();

  console.log('='.repeat(80));
  console.log(` MTT LIVE API HEALTH CHECK & SECURITY GUARD RUNNER`);
  console.log(` Timestamp : ${timestamp}`);
  console.log(` Target Host: ${BASE_URL}`);
  console.log(` Timeout    : ${TIMEOUT_MS}ms | Request Delay: ${DELAY_MS}ms`);
  console.log('='.repeat(80));

  const results = [];
  let currentGroup = '';

  for (const tc of testCases) {
    if (tc.group !== currentGroup) {
      currentGroup = tc.group;
      console.log(`\n--- [${currentGroup}] ---`);
    }

    const result = await runSingleTest(tc);
    results.push(result);

    if (result.passed) {
      console.log(` ✔ [${result.status}] ${tc.method} ${tc.path.padEnd(45)} (${result.latency}ms) - ${result.name}`);
    } else {
      console.error(` ✖ [FAIL] ${tc.method} ${tc.path.padEnd(45)} (${result.latency}ms) - ${result.name}`);
      console.error(`          Reason: ${result.error}`);
    }

    if (DELAY_MS > 0) {
      await sleep(DELAY_MS);
    }
  }

  const totalDuration = Date.now() - runStart;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n' + '='.repeat(80));
  console.log(` SUMMARY REPORT`);
  console.log('='.repeat(80));
  console.log(` Total Tests    : ${results.length}`);
  console.log(` Passed         : ${passedCount}`);
  console.log(` Failed         : ${failedCount}`);
  console.log(` Total Duration : ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(` Overall Status : ${failedCount === 0 ? 'HEALTHY (PASS)' : 'DEGRADED/FAILED'}`);
  console.log('='.repeat(80));

  if (failedCount > 0) {
    console.error(`\n[ALERT] ${failedCount} health check test(s) failed on ${BASE_URL}.`);
    process.exit(1);
  } else {
    console.log(`\n[OK] All ${passedCount} health check tests passed successfully.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running live API health checks:', err);
  process.exit(1);
});
