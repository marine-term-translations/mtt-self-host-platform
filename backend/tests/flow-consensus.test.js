const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_flow_consensus.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');
const flowService = require('../src/services/flow.service');

async function run() {
  console.log("Running flow consensus tests...");
  initializeDatabase();
  const db = getDatabase();

  // 1. Setup mock data
  // Create users: User 1 (translator), User 2 (Reviewer A, reputation 10), User 3 (Reviewer B, reputation 10)
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (1, 'translator', 10)").run();
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (2, 'reviewer_a', 10)").run(); // weight 1
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (3, 'reviewer_b', 10)").run(); // weight 1

  // Setup active translators count for language 'nl'
  // Insert translations from different users to make active count = 4 (requires 2 votes to approve)
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (4, 'dummy1', 10)").run();
  db.prepare("INSERT INTO users (id, username, reputation) VALUES (5, 'dummy2', 10)").run();

  db.prepare("INSERT INTO terms (id, uri) VALUES (10, 'http://example.com/term1')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (20, 10, 'label', 'Original', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (21, 10, 'def1', 'Definition 1', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (22, 10, 'def2', 'Definition 2', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (23, 10, 'def3', 'Definition 3', '[\"translatable\"]')").run();
  db.prepare("INSERT INTO term_fields (id, term_id, field_uri, original_value, field_roles) VALUES (24, 10, 'def4', 'Definition 4', '[\"translatable\"]')").run();

  // Dummy translations to elevate active translator count to 4 (requires 2 votes to approve)
  db.prepare("INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at) VALUES (101, 21, 'nl', 'V1', 'approved', 1, datetime('now'))").run();
  db.prepare("INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at) VALUES (102, 22, 'nl', 'V2', 'approved', 2, datetime('now'))").run();
  db.prepare("INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at) VALUES (103, 23, 'nl', 'V3', 'approved', 4, datetime('now'))").run();
  db.prepare("INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at) VALUES (104, 24, 'nl', 'V4', 'approved', 5, datetime('now'))").run();

  // Target translation to review (created by user 1)
  db.prepare(`
    INSERT INTO translations (id, term_field_id, language, value, status, created_by_id, created_at)
    VALUES (30, 20, 'nl', 'Vertaling', 'review', 1, datetime('now'))
  `).run();

  // Verify initial task delivery
  // Reviewer A (user 2) requests next task. Should return translation 30 as a review task.
  let taskA = flowService.getNextTask(2, 'nl');
  assert.ok(taskA, "Task A should not be null");
  assert.strictEqual(taskA.type, 'review');
  assert.strictEqual(taskA.task.translation_id, 30);

  // Reviewer B (user 3) requests next task. Should also return translation 30.
  let taskB = flowService.getNextTask(3, 'nl');
  assert.ok(taskB, "Task B should not be null");
  assert.strictEqual(taskB.type, 'review');
  assert.strictEqual(taskB.task.translation_id, 30);

  // Step A: Reviewer A reviews (approves) translation 30.
  console.log("Submitting review for Reviewer A...");
  flowService.submitReview({
    userId: 2,
    translationId: 30,
    action: 'approve'
  });

  // Check status: status should still be 'review' because net weight is 1 (reputation 10 -> weight 1)
  // and threshold is 2 (due to 4 active translators).
  let trans = db.prepare("SELECT status FROM translations WHERE id = 30").get();
  assert.strictEqual(trans.status, 'review', "Translation should remain in review status since consensus threshold of 2 is not met");

  // Check if Reviewer A gets translation 30 again
  console.log("Checking if Reviewer A gets translation 30 again...");
  let taskA_after = flowService.getNextTask(2, 'nl');
  // We expect it to NOT be 'review' for translation 30 (either 'translate' or 'none' / different translation id)
  if (taskA_after && taskA_after.type === 'review') {
    assert.notStrictEqual(taskA_after.task.translation_id, 30, "Reviewer A should not be assigned the same translation they just reviewed");
  }

  // Step B: Reviewer B (who hasn't reviewed it) requests next task
  // They should get translation 30 to help reach consensus
  console.log("Checking if Reviewer B gets translation 30...");
  let taskB_after = flowService.getNextTask(3, 'nl');
  assert.ok(taskB_after, "Task B after Reviewer A review should not be null");
  assert.strictEqual(taskB_after.type, 'review', "Reviewer B should get the translation needing consensus");
  assert.strictEqual(taskB_after.task.translation_id, 30);

  // Reviewer B reviews (approves) translation 30.
  console.log("Submitting review for Reviewer B...");
  flowService.submitReview({
    userId: 3,
    translationId: 30,
    action: 'approve'
  });

  // Threshold of 2 is now met (Reviewer A weight 1 + Reviewer B weight 1 = 2).
  // Status should transition to 'approved'.
  trans = db.prepare("SELECT status FROM translations WHERE id = 30").get();
  assert.strictEqual(trans.status, 'approved', "Translation should be approved now that consensus is reached");

  // Neither Reviewer A nor Reviewer B should get it now
  let taskA_final = flowService.getNextTask(2, 'nl');
  if (taskA_final && taskA_final.type === 'review') {
    assert.notStrictEqual(taskA_final.task.translation_id, 30);
  }
  let taskB_final = flowService.getNextTask(3, 'nl');
  if (taskB_final && taskB_final.type === 'review') {
    assert.notStrictEqual(taskB_final.task.translation_id, 30);
  }

  console.log("✓ Flow consensus tests passed!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err);
  process.exit(1);
});
