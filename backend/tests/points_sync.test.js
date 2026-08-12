const assert = require("assert");
const { getDatabase, applySchema, isDatabaseInitialized } = require("../src/db/database");
const { applyReputationChange } = require("../src/services/reputation.service");

function testPointsSync() {
  if (!isDatabaseInitialized()) {
    applySchema();
  }
  const db = getDatabase();
  db.prepare("INSERT OR IGNORE INTO users (id, username, reputation) VALUES (1, 'testuser', 0)").run();
  db.prepare("INSERT OR IGNORE INTO user_stats (user_id, points, daily_streak, longest_streak) VALUES (1, 0, 0, 0)").run();
  db.prepare("UPDATE users SET reputation = 0 WHERE id = 1").run();
  db.prepare("UPDATE user_stats SET points = 0 WHERE user_id = 1").run();

  
  // Test reputation and user_stats sync
  applyReputationChange(1, 10, "test_reward");
  const user = db.prepare("SELECT reputation FROM users WHERE id = 1").get();
  const stats = db.prepare("SELECT points FROM user_stats WHERE user_id = 1").get();
  
  assert.strictEqual(user.reputation, 10);
  assert.strictEqual(stats.points, 10);
  console.log("✅ Reputation & user_stats points synchronization test passed");
}

try {
  testPointsSync();
} catch (err) {
  console.error("FAIL:", err);
  process.exit(1);
}
