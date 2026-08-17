const assert = require("assert");
const { getDatabase, applySchema, isDatabaseInitialized } = require("../src/db/database");
const eventService = require("../src/services/eventService");
const rewardService = require("../src/services/rewardService");

const fs = require("fs");
const path = require("path");

function testRewardSettlementAndTitles() {
  if (!isDatabaseInitialized()) {
    applySchema();
  }
  const db = getDatabase();

  const hasEventsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();
  if (!hasEventsTable) {
    const migrationSql = fs.readFileSync(path.join(__dirname, "../src/db/migrations/035_events.sql"), "utf8");
    db.exec(migrationSql);
  }

  // Seed test users
  db.prepare("INSERT OR IGNORE INTO users (id, username) VALUES (101, 'alpha_leader')").run();
  db.prepare("INSERT OR IGNORE INTO users (id, username) VALUES (102, 'alpha_member')").run();
  db.prepare("INSERT OR IGNORE INTO users (id, username) VALUES (103, 'alpha_slacker')").run();
  db.prepare("INSERT OR IGNORE INTO users (id, username) VALUES (104, 'beta_member')").run();

  // Clean up any test state for test users
  db.prepare("DELETE FROM user_rewards WHERE user_id IN (101, 102, 103, 104)").run();
  db.prepare("DELETE FROM event_contributions WHERE user_id IN (101, 102, 103, 104)").run();
  db.prepare("DELETE FROM event_memberships WHERE user_id IN (101, 102, 103, 104)").run();

  // Create test event with custom reward title
  const evt = eventService.createEvent({
    title: "Championship Hackathon",
    startDate: "2026-08-01T00:00:00Z",
    endDate: "2026-08-10T23:59:59Z",
    rewardTitle: "Championship Master 2026"
  });

  const teamAlpha = eventService.createTeam(evt.id, "Team Alpha", null, 101);
  const teamBeta = eventService.createTeam(evt.id, "Team Beta", null, 104);

  // Join teams
  eventService.joinTeam(evt.id, teamAlpha.join_code, 101);
  eventService.joinTeam(evt.id, teamAlpha.join_code, 102);
  eventService.joinTeam(evt.id, teamAlpha.join_code, 103);
  eventService.joinTeam(evt.id, teamBeta.join_code, 104);

  // Add contributions:
  // User 101: 30 pts (Alpha)
  // User 102: 20 pts (Alpha)
  // User 103: 0 pts (Alpha slacker - should NOT get reward)
  // User 104: 15 pts (Beta - losing team, should NOT get reward)
  const c1 = `c_${Date.now()}_101`;
  const c2 = `c_${Date.now()}_102`;
  const c3 = `c_${Date.now()}_104`;
  db.prepare(`
    INSERT INTO event_contributions (id, event_id, team_id, user_id, action_type, points)
    VALUES 
      (?, ?, ?, 101, 'TRANSLATION_CREATED', 30),
      (?, ?, ?, 102, 'TRANSLATION_CREATED', 20),
      (?, ?, ?, 104, 'TRANSLATION_CREATED', 15)
  `).run(c1, evt.id, teamAlpha.id, c2, evt.id, teamAlpha.id, c3, evt.id, teamBeta.id);

  // Run settlement
  const settleResult = rewardService.settleEventRewards(evt.id);
  assert.strictEqual(settleResult.settled, true);
  assert.strictEqual(settleResult.teamName, "Team Alpha");
  assert.strictEqual(settleResult.awardedCount, 2); // Users 101 and 102
  assert.ok(settleResult.userIds.includes(101));
  assert.ok(settleResult.userIds.includes(102));
  assert.strictEqual(settleResult.userIds.includes(103), false);
  assert.strictEqual(settleResult.userIds.includes(104), false);

  // Verify User 101 titles and auto-equipped state
  const titles101 = rewardService.getUserTitles(101);
  assert.strictEqual(titles101.length, 1);
  assert.strictEqual(titles101[0].title_name, "Championship Master 2026");
  assert.strictEqual(titles101[0].is_equipped, 1);
  assert.strictEqual(titles101[0].event_title, "Championship Hackathon");
  assert.strictEqual(titles101[0].winning_team_name, "Team Alpha");
  assert.strictEqual(titles101[0].user_points, 30);

  // Verify User 103 and 104 have 0 titles
  assert.strictEqual(rewardService.getUserTitles(103).length, 0);
  assert.strictEqual(rewardService.getUserTitles(104).length, 0);

  // Test equipping / unequipping
  rewardService.equipUserTitle(101, null);
  const unequippedTitles = rewardService.getUserTitles(101);
  assert.strictEqual(unequippedTitles[0].is_equipped, 0);

  rewardService.equipUserTitle(101, titles101[0].reward_id);
  const reEquippedTitles = rewardService.getUserTitles(101);
  assert.strictEqual(reEquippedTitles[0].is_equipped, 1);

  console.log("PASS: Event reward settlement & user titles tests passed!");
}

try {
  testRewardSettlementAndTitles();
} catch (err) {
  console.error("FAIL:", err.message);
  process.exit(1);
}
