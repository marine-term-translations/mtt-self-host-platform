// backend/tests/stale-rejected-translations.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_stale_rejections.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');
const flowService = require('../src/services/flow.service');

async function run() {
  console.log("Running stale rejected translations cleanup test...");
  initializeDatabase();
  const db = getDatabase();

  // Setup users, term, and fields
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (1, 'translator1', 10)").run();
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (2, 'translator2', 15)").run();
  db.prepare("INSERT INTO terms (id, uri) VALUES (10, 'http://example.com/term/1')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (101, 10, 'label', 'Coralline', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (102, 10, 'def', 'Marine structure', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (103, 10, 'habitat', 'Reef', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (104, 10, 'depth', '100m', '[\"translatable\"]')").run();

  // 1. Stale rejected translation (> 7 days old, no appeal) -> SHOULD BE REVERTED
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, rejection_reason, created_at, updated_at)
    VALUES (501, 101, 'nl', 'Koraal', 'rejected', 1, 'Inaccurate term', datetime('now', '-10 days'), datetime('now', '-8 days'))
  `).run();

  // 2. Recent rejected translation (< 7 days old) -> SHOULD NOT BE REVERTED
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, rejection_reason, created_at, updated_at)
    VALUES (502, 102, 'nl', 'Structuur', 'rejected', 1, 'Spelling error', datetime('now', '-3 days'), datetime('now', '-2 days'))
  `).run();

  // 3. Stale rejected translation (> 7 days old) with OPEN appeal -> SHOULD NOT BE REVERTED
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, rejection_reason, created_at, updated_at)
    VALUES (503, 103, 'nl', 'Rif', 'rejected', 1, 'Dubious', datetime('now', '-12 days'), datetime('now', '-9 days'))
  `).run();
  db.prepare("INSERT INTO appeals (id, translation_id, opened_by_id, status) VALUES (1, 503, 1, 'open')").run();

  // 4. Stale rejected translation (> 7 days old) with CLOSED appeal -> SHOULD BE REVERTED
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, rejection_reason, created_at, updated_at)
    VALUES (504, 104, 'nl', 'Diepte', 'rejected', 1, 'Wrong unit', datetime('now', '-15 days'), datetime('now', '-8 days'))
  `).run();
  db.prepare("INSERT INTO appeals (id, translation_id, opened_by_id, status) VALUES (2, 504, 1, 'closed')").run();

  // Run the cleanup function with 7 days threshold
  const result = flowService.revertStaleRejectedTranslations({ daysOverride: 7 });

  assert.strictEqual(result.revertedCount, 2, "Expected exactly 2 stale translations to be reverted");

  // Verify DB state
  const t501 = db.prepare("SELECT * FROM translations WHERE id = 501").get();
  assert.strictEqual(t501, undefined, "Translation 501 should be deleted");

  const t502 = db.prepare("SELECT * FROM translations WHERE id = 502").get();
  assert.notStrictEqual(t502, undefined, "Translation 502 should still exist (recent)");

  const t503 = db.prepare("SELECT * FROM translations WHERE id = 503").get();
  assert.notStrictEqual(t503, undefined, "Translation 503 should still exist (open appeal)");

  const t504 = db.prepare("SELECT * FROM translations WHERE id = 504").get();
  assert.strictEqual(t504, undefined, "Translation 504 should be deleted (closed appeal)");

  // Verify user_activity log entry
  const activity = db.prepare("SELECT * FROM user_activity WHERE action = 'translation_stale_reverted' AND term_field_id = 101").get();
  assert.notStrictEqual(activity, undefined, "Activity log entry should exist for reverted translation 501");
  assert.strictEqual(activity.user_id, 1, "Activity log should associate with the original translator");
  const extra = JSON.parse(activity.extra);
  assert.strictEqual(extra.previous_value, 'Koraal');
  assert.strictEqual(extra.previous_rejection_reason, 'Inaccurate term');

  // Verify term field 101 is now available for user 2 via getRandomUntranslated
  const untranslated = flowService.getRandomUntranslated(2, 'nl');
  assert.notStrictEqual(untranslated, null, "Should return an untranslated term");
  assert.strictEqual(untranslated.term_field_id, 101, "Freed field 101 should now be available for translation");

  console.log("✓ Stale rejected translations cleanup tests passed!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err.message);
  process.exit(1);
});
