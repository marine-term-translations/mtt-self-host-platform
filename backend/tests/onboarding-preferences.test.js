const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_onboarding_preferences.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');

async function run() {
  console.log("Testing onboarding preferences persistence...");
  initializeDatabase();
  const db = getDatabase();

  // Test 1: Ensure user_preferences table has has_seen_onboarding column
  const tableInfo = db.prepare("PRAGMA table_info(user_preferences)").all();
  const hasSeenCol = tableInfo.find(c => c.name === 'has_seen_onboarding');
  assert.ok(hasSeenCol, "user_preferences table must have has_seen_onboarding column");

  // Insert user for foreign key constraint
  db.prepare("INSERT INTO users (id, username) VALUES (101, 'touruser')").run();

  // Test 2: Insert preference with has_seen_onboarding = 1 and verify fetch
  db.prepare(`
    INSERT INTO user_preferences (user_id, has_seen_onboarding)
    VALUES (101, 1)
  `).run();

  const pref = db.prepare("SELECT has_seen_onboarding FROM user_preferences WHERE user_id = 101").get();
  assert.strictEqual(pref.has_seen_onboarding, 1);

  console.log("✓ Onboarding preferences DB test passed!");
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err.message);
  process.exit(1);
});
