const assert = require("assert");
const { getDatabase, applySchema, isDatabaseInitialized } = require("../src/db/database");
const eventService = require("../src/services/eventService");

function testEventDeletion() {
  if (!isDatabaseInitialized()) {
    applySchema();
  }
  const db = getDatabase();
  db.prepare("INSERT OR IGNORE INTO users (id, username) VALUES (1, 'testuser')").run();
  
  const evt = eventService.createEvent({
    title: "Test Delete Evt",
    startDate: "2026-01-01",
    endDate: "2026-12-31"
  });
  const team = eventService.createTeam(evt.id, "TestTeam", null, 1);


  // Assert event and team exist
  assert.ok(eventService.getEventById(evt.id));

  // Test team deletion
  const teamDeleted = eventService.deleteTeam(evt.id, team.id);
  assert.strictEqual(teamDeleted.success, true);
  const reloadedEvt = eventService.getEventById(evt.id);
  assert.strictEqual(reloadedEvt.teams.length, 0);

  // Test event deletion
  const evtDeleted = eventService.deleteEvent(evt.id);
  assert.strictEqual(evtDeleted.success, true);
  assert.strictEqual(eventService.getEventById(evt.id), null);
  console.log("✅ Event deletion tests passed");
}

try {
  testEventDeletion();
} catch (err) {
  console.error("FAIL:", err);
  process.exit(1);
}

