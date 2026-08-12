const assert = require("assert");
const { getDatabase, applySchema, isDatabaseInitialized } = require("../src/db/database");
const rewardService = require("../src/services/rewardService");

try {
  if (!isDatabaseInitialized()) {
    applySchema();
  }
  const db = getDatabase();

  db.prepare("INSERT OR IGNORE INTO users (id, username) VALUES (20, 'champion_user')").run();
  db.prepare(`
    INSERT OR IGNORE INTO events (id, title, start_date, end_date, status)
    VALUES ('evt-rew-1', 'Title Challenge', '2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z', 'ENDED')
  `).run();
  db.prepare(`
    INSERT OR IGNORE INTO event_rewards (id, event_id, reward_type, name)
    VALUES ('rew-1', 'evt-rew-1', 'TITLE', 'Coral Vocab Champion 2026')
  `).run();

  rewardService.awardRewardToUser(20, 'rew-1');
  const titles = rewardService.getUserTitles(20);
  assert.ok(Array.isArray(titles));
  assert.strictEqual(titles.length, 1);
  assert.strictEqual(titles[0].name, 'Coral Vocab Champion 2026');

  const equipped = rewardService.equipUserTitle(20, 'rew-1');
  assert.strictEqual(equipped.is_equipped, 1);

  console.log("PASS: Event rewards service test passed!");
} catch (err) {
  console.error("FAIL: Event rewards service test failed:", err.message);
  process.exit(1);
}
