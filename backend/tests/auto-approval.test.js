// backend/tests/auto-approval.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_auto_approval.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');
const flowService = require('../src/services/flow.service');

async function run() {
  console.log("Running auto-approval task test...");
  initializeDatabase();
  const db = getDatabase();

  db.prepare("INSERT INTO users (id, username, reputation) VALUES (1, 'translator', 10)").run();
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (2, 'voter1', 50)").run();
  db.prepare("INSERT INTO terms (id, uri) VALUES (10, 'http://example.com/term')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value) VALUES (20, 10, 'label', 'Original')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value) VALUES (21, 10, 'def', 'Definition')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value) VALUES (22, 10, 'other', 'Other')").run();

  // 1. Expired translation older than 3 days
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at)
    VALUES (40, 20, 'nl', 'Expired Approved', 'review', 1, datetime('now', '-4 days'))
  `).run();
  // Add 1 approval
  db.prepare("INSERT INTO translation_reviews (translation_id, user_id, action) VALUES (40, 2, 'approve')").run();

  // 2. Expired translation with a rejection (should NOT auto-approve)
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at)
    VALUES (41, 21, 'nl', 'Expired Contested', 'review', 1, datetime('now', '-4 days'))
  `).run();
  db.prepare("INSERT INTO translation_reviews (translation_id, user_id, action) VALUES (41, 2, 'reject')").run();

  // 3. New translation (< 3 days) with approval (should NOT auto-approve yet)
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at)
    VALUES (42, 22, 'nl', 'New Translation', 'review', 1, datetime('now', '-1 days'))
  `).run();
  db.prepare("INSERT INTO translation_reviews (translation_id, user_id, action) VALUES (42, 2, 'approve')").run();

  // Trigger auto-approval worker
  flowService.autoApproveExpiredTranslations();

  // Verify results
  const t40 = db.prepare("SELECT status FROM translations WHERE id = 40").get();
  assert.strictEqual(t40.status, 'approved', "T40 should be approved");

  const t41 = db.prepare("SELECT status FROM translations WHERE id = 41").get();
  assert.strictEqual(t41.status, 'review', "T41 should remain in review (has rejection)");

  const t42 = db.prepare("SELECT status FROM translations WHERE id = 42").get();
  assert.strictEqual(t42.status, 'review', "T42 should remain in review (not expired)");

  console.log("✓ Auto-approval task tests passed!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err.message);
  process.exit(1);
});
