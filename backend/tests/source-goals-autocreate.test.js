const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_source_goals_autocreate.db');
process.env.SQLITE_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDatabase } = require('../src/db/database');
const { initializeDatabase } = require('../src/services/dbInit.service');
const { initializeLanguageCommunities } = require('../src/services/community.service');
const {
  ensureCollectionGoalsForSource,
  ensureCollectionGoalsForAllSources
} = require('../src/services/sourceGoalAutoCreation.service');

async function run() {
  console.log("Running Source Goals Auto-Creation TDD Test...");
  initializeDatabase();
  initializeLanguageCommunities();
  const db = getDatabase();

  // 1. Create a dummy system user for goal creation if not existing
  db.prepare("INSERT OR IGNORE INTO users (id, username, email) VALUES (1, 'system_admin', 'admin@example.com')").run();

  // 2. Insert test source 1
  const sourceResult1 = db.prepare(
    "INSERT INTO sources (source_path, source_type, description) VALUES (?, ?, ?)"
  ).run('http://vocab.nerc.ac.uk/collection/P02/current/', 'LDES', 'SeaDataNet Parameter Discovery');
  const sourceId1 = sourceResult1.lastInsertRowid;

  // 3. Call ensureCollectionGoalsForSource
  const result1 = ensureCollectionGoalsForSource(sourceId1);
  assert.ok(result1.success, "ensureCollectionGoalsForSource should return success");
  assert.ok(result1.createdGoalsCount > 0, "Should create goals for target languages");

  // 4. Verify goals in database for source 1
  const goalsForSource1 = db.prepare(
    "SELECT * FROM community_goals WHERE collection_id = ? AND goal_type = 'collection'"
  ).all(sourceId1);
  assert.ok(goalsForSource1.length >= 5, "Collection goals should exist for multiple target languages");

  // Verify target_language set on each goal
  const languages = db.prepare("SELECT code FROM languages WHERE code != 'en'").all().map(l => l.code);
  const goalLanguages = goalsForSource1.map(g => g.target_language);
  for (const lang of languages) {
    assert.ok(goalLanguages.includes(lang), `Goal should be created for language ${lang}`);
  }

  // 5. Verify goal links in community_goal_links
  const firstGoal = goalsForSource1[0];
  const links = db.prepare("SELECT * FROM community_goal_links WHERE goal_id = ?").all(firstGoal.id);
  assert.ok(links.length > 0, "Goal should be linked to language community in community_goal_links");

  // 6. Test Idempotency (running again should not duplicate goals)
  const result1Repeat = ensureCollectionGoalsForSource(sourceId1);
  assert.strictEqual(result1Repeat.createdGoalsCount, 0, "Repeat call should not create duplicate goals");
  const goalsForSource1AfterRepeat = db.prepare(
    "SELECT COUNT(*) as count FROM community_goals WHERE collection_id = ? AND goal_type = 'collection'"
  ).get(sourceId1).count;
  assert.strictEqual(goalsForSource1AfterRepeat, goalsForSource1.length, "Goal count should remain unchanged after repeat call");

  // 7. Insert test source 2 without running auto-creation directly
  const sourceResult2 = db.prepare(
    "INSERT INTO sources (source_path, source_type, description) VALUES (?, ?, ?)"
  ).run('http://vocab.nerc.ac.uk/collection/L22/current/', 'LDES', 'Equipment Vocab');
  const sourceId2 = sourceResult2.lastInsertRowid;

  // 8. Test ensureCollectionGoalsForAllSources
  const resultAll = ensureCollectionGoalsForAllSources();
  assert.ok(resultAll.success, "ensureCollectionGoalsForAllSources should return success");

  const goalsForSource2 = db.prepare(
    "SELECT * FROM community_goals WHERE collection_id = ? AND goal_type = 'collection'"
  ).all(sourceId2);
  assert.ok(goalsForSource2.length >= 5, "ensureCollectionGoalsForAllSources should create goals for existing source 2");

  console.log("Source Goals Auto-Creation TDD Test passed successfully!");
}

run().catch(err => {
  console.error("TDD Test failure (Expected in RED phase):", err.message);
  process.exit(1);
});
