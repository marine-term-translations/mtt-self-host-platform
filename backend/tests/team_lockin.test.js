const assert = require("assert");
const { getDatabase, applySchema, isDatabaseInitialized } = require("../src/db/database");
const eventService = require("../src/services/eventService");

function testTeamLockin() {
  if (!isDatabaseInitialized()) {
    applySchema();
  }
  const db = getDatabase();

  const evt = eventService.createEvent({
    title: "Lock-in Competition",
    startDate: "2026-01-01",
    endDate: "2026-12-31"
  });
  eventService.updateEventStatus(evt.id, "ACTIVE");

  const team1 = eventService.createTeam(evt.id, "Team Alpha");
  const team2 = eventService.createTeam(evt.id, "Team Beta");
  const userId = 8881;
  db.prepare("INSERT OR IGNORE INTO users (id, username, reputation) VALUES (?, 'user_8881', 10)").run(userId);

  // User joins Team 1 - should succeed
  const res1 = eventService.joinTeam(evt.id, team1.join_code, userId);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.teamId, team1.id);

  // User tries joining Team 1 again - should succeed cleanly
  const resRejoin = eventService.joinTeam(evt.id, team1.join_code, userId);
  assert.strictEqual(resRejoin.success, true);

  // User tries switching to Team 2 - MUST FAIL due to strict lock-in
  assert.throws(() => {
    eventService.joinTeam(evt.id, team2.join_code, userId);
  }, /already locked into a team/i);

  console.log("✅ Team lock-in backend test passed!");
}

try {
  testTeamLockin();
} catch (err) {
  console.error("FAIL:", err.message);
  process.exit(1);
}
