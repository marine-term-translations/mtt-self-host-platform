const assert = require('assert');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, 'test_achievements_db.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');

async function run() {
  initializeDatabase();
  const db = getDatabase();

  const achCount = db.prepare("SELECT COUNT(*) as count FROM achievements").get().count;
  assert.strictEqual(achCount, 6);

  const tierCount = db.prepare("SELECT COUNT(*) as count FROM achievement_tiers").get().count;
  assert.strictEqual(tierCount, 18);

  console.log("✓ Achievements DB Schema & Seeds check passed!");
  
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}
run().catch(e => {
  console.error("Test Failed:", e.message);
  if (fs.existsSync(testDbPath)) {
    try {
      const db = getDatabase();
      db.close();
    } catch(err) {}
    try {
      fs.unlinkSync(testDbPath);
    } catch(err) {}
  }
  process.exit(1);
});
