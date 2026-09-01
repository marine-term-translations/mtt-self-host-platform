// backend/tests/contributions-over-time.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_contributions_stats.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');

async function run() {
  console.log("Running contributions over time stats test...");
  initializeDatabase();
  const db = getDatabase();

  // Setup mock users and activity
  db.prepare("INSERT INTO users (id, username) VALUES (1, 'alice')").run();
  db.prepare("INSERT INTO users (id, username) VALUES (2, 'bob')").run();

  // Insert mock activities
  db.prepare(`
    INSERT INTO user_activity (user_id, action, created_at)
    VALUES 
      (1, 'translation_created', datetime('now', '-2 days')),
      (1, 'translation_reviewed', datetime('now', '-2 days')),
      (2, 'translation_discussion', datetime('now', '-2 days')),
      (2, 'translation_created', datetime('now', '-1 days'))
  `).run();

  // Test the route handler
  const termsRoutes = require('../src/routes/terms.routes');
  const routeLayer = termsRoutes.stack.find(s => s.route && s.route.path === '/stats/contributions-over-time');
  assert.notStrictEqual(routeLayer, undefined, "Route /stats/contributions-over-time should exist");

  const handler = routeLayer.route.stack[routeLayer.route.stack.length - 1].handle;
  const req = { query: { timeframe: 'last_7_days' } };
  let resJson = null;
  const res = {
    json: (d) => { resJson = d; return res; },
    status: (code) => ({ json: (d) => { resJson = { status: code, ...d }; } })
  };

  handler(req, res);

  assert.strictEqual(resJson.timeframe, 'last_7_days');
  assert.strictEqual(resJson.summary.totalActions, 4, "Total actions should be 4");
  assert.strictEqual(resJson.summary.totalUniqueUsers, 2, "Unique users should be 2");
  assert.strictEqual(resJson.data.length >= 2, true, "Should contain at least 2 date entries");

  const twoDaysAgo = resJson.data.find(d => d.total_actions === 3);
  assert.notStrictEqual(twoDaysAgo, undefined, "Should have entry with 3 actions");
  assert.strictEqual(twoDaysAgo.active_users, 2, "Two days ago had 2 active users");
  assert.strictEqual(twoDaysAgo.translations, 1);
  assert.strictEqual(twoDaysAgo.reviews, 1);
  assert.strictEqual(twoDaysAgo.discussions, 1);

  console.log("✓ Contributions over time backend tests passed!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err.message);
  process.exit(1);
});
