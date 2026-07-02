// backend/tests/consensus.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_consensus.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');
const flowService = require('../src/services/flow.service');

async function run() {
  console.log("Running consensus logic test...");
  initializeDatabase();
  const db = getDatabase();

  // 1. Setup mock data
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (1, 'translator', 10)").run();
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (2, 'voter1', 50)").run(); // weight 1
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (3, 'voter2', 150)").run(); // weight 2
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (4, 'voter3', 350)").run(); // weight 4
  
  // Active translators setup (translator & voter1 are active)
  db.prepare("INSERT INTO terms (id, uri) VALUES (10, 'http://example.com/term1')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value) VALUES (20, 10, 'label', 'Original')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value) VALUES (21, 10, 'def', 'Definition')").run();
  
  // Translator created translation 30 (language: 'nl')
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at)
    VALUES (30, 20, 'nl', 'Vertaling', 'review', 1, datetime('now'))
  `).run();

  // Voter1 active translation to make active count = 2 in last 30 days for 'nl'
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at)
    VALUES (31, 21, 'nl', 'Vertaling 2', 'approved', 2, datetime('now'))
  `).run();

  // Test Self-Review Block
  assert.throws(() => {
    flowService.submitReview({
      userId: 1, // translator
      translationId: 30,
      action: 'approve'
    });
  }, /cannot review your own/i);

  // Voter 1 approves. Since active translators = 2 ('translator' & 'voter1'), threshold is 1 vote weight.
  // Voter 1 has reputation 50 -> weight = 1 + floor(50/100) = 1.
  // This should immediately approve the translation!
  const result1 = flowService.submitReview({
    userId: 2,
    translationId: 30,
    action: 'approve'
  });
  
  assert.strictEqual(result1.success, true);
  let trans = db.prepare("SELECT status FROM translations WHERE id = 30").get();
  assert.strictEqual(trans.status, 'approved', "Translation should be approved when reaching threshold");

  // Test Duplicate Review Block
  // We reset translation 30 to review status
  db.prepare("UPDATE translations SET status = 'review' WHERE id = 30").run();
  db.prepare("DELETE FROM translation_reviews").run();

  // Add 4 more active translators (total = 6, which is > 5 active translators, so threshold is 3)
  for (let i = 1; i <= 4; i++) {
    db.prepare(`INSERT INTO users (id, username, reputation) VALUES (${10 + i}, 'user${i}', 50)`).run();
    db.prepare(`INSERT INTO term_fields (id, term_id, field_uri, original_value) VALUES (${21 + i}, 10, 'field${i}', 'Original')`).run();
    db.prepare(`
      INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at)
      VALUES (${100 + i}, ${21 + i}, 'nl', 'Active translation ${i}', 'approved', ${10 + i}, datetime('now'))
    `).run();
  }

  // Voter 1 (weight 1) approves. Score is 1, which is < threshold (3), so status stays 'review'.
  flowService.submitReview({ userId: 2, translationId: 30, action: 'approve' });
  trans = db.prepare("SELECT status FROM translations WHERE id = 30").get();
  assert.strictEqual(trans.status, 'review', "Translation should stay in review when threshold is not reached");

  // Voter 1 tries to review again (duplicate) -> should throw!
  assert.throws(() => {
    flowService.submitReview({
      userId: 2, // duplicate
      translationId: 30,
      action: 'approve'
    });
  }, /already reviewed/i);

  console.log("✓ Consensus logic tests passed!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err.message);
  process.exit(1);
});
