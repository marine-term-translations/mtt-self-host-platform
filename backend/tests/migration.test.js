// backend/tests/migration.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_migration.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');

async function run() {
  console.log("Running migration test...");
  
  // Initialize database (should run migration)
  initializeDatabase();
  
  const db = getDatabase();
  
  // Test if the table exists
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='translation_reviews'"
  ).get();
  
  assert.ok(tableCheck, "Table 'translation_reviews' should exist");
  
  // Check columns
  const columns = db.prepare("PRAGMA table_info(translation_reviews)").all();
  const columnNames = columns.map(c => c.name);
  assert.deepStrictEqual(
    columnNames,
    ['id', 'translation_id', 'user_id', 'action', 'rejection_reason', 'created_at'],
    "Columns should match schema specification"
  );
  
  console.log("✓ Migration test passed successfully!");
  
  // Clean up
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

run().catch(err => {
  console.error("Test Failed:", err.message);
  process.exit(1);
});
