const assert = require('assert');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, 'test_achievements_api.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');

// We will require the handlers directly from the route file once we implement it
const achievementsRoutes = require('../src/routes/achievements.routes');

async function run() {
  initializeDatabase();
  const db = getDatabase();

  // Insert mock user
  db.prepare("INSERT INTO users (id, username, is_admin) VALUES (1, 'alice', 0)").run();
  db.prepare("INSERT INTO user_stats (user_id, points, daily_streak) VALUES (1, 5, 0)").run();

  // Test getAchievements route handler
  let responseData = null;
  let responseStatus = 200;

  const mockReq = {
    session: {
      user: { id: 1, username: 'alice', is_admin: 0 }
    }
  };

  const mockRes = {
    status: function(code) {
      responseStatus = code;
      return this;
    },
    json: function(data) {
      responseData = data;
      return this;
    }
  };

  // We invoke the handler
  await achievementsRoutes.getAchievementsHandler(mockReq, mockRes);

  assert.strictEqual(responseStatus, 200);
  assert.ok(Array.isArray(responseData));
  assert.strictEqual(responseData.length, 6);

  console.log("✓ Achievements API handlers check passed!");

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
