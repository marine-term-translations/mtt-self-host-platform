const assert = require("assert");
const eventEmailService = require("../src/services/eventEmailService");

try {
  const digest = eventEmailService.buildRankChangeDigest("Team Coral", 1, 2, "Marine Bio Rally");
  assert.ok(digest.subject.includes("Marine Bio Rally"));
  assert.ok(digest.body.includes("Team Coral"));
  assert.ok(digest.body.includes("2"));

  const winnerNotice = eventEmailService.buildEventWinnerNotice("Team Coral", "Marine Bio Rally", "Coral Vocab Champion 2026");
  assert.ok(winnerNotice.subject.includes("Marine Bio Rally"));
  assert.ok(winnerNotice.body.includes("Coral Vocab Champion 2026"));

  console.log("PASS: Event email service test passed!");
} catch (err) {
  console.error("FAIL: Event email service test failed:", err.message);
  process.exit(1);
}
