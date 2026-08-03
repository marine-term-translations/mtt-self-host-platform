const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Set test database path before requiring database module
const testDbDir = path.join(__dirname, '../scratch');
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}
const testDbPath = path.join(testDbDir, 'test_community_reports_mod.db');
process.env.SQLITE_DB_PATH = testDbPath;

const { getDatabase } = require('../src/db/database');

function run() {
  console.log("Testing Community Reports integration in Admin Moderation...");

  const adminRoutesPath = path.join(__dirname, '../src/routes/admin.routes.js');
  assert.ok(fs.existsSync(adminRoutesPath), "admin.routes.js file must exist");
  const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');

  // Test 1: Check GET /admin/community-reports query uses LEFT JOIN for resilience
  assert.ok(
    adminRoutesContent.includes('LEFT JOIN communities c ON cr.community_id = c.id'),
    "GET /admin/community-reports must use LEFT JOIN communities c to prevent hiding reports if joined tables differ"
  );

  // Test 2: Check GET /admin/community-reports returns report_number
  assert.ok(
    adminRoutesContent.includes('report_number') && adminRoutesContent.includes('/admin/community-reports'),
    "GET /admin/community-reports response payload must include report_number property"
  );

  // Test 3: Check AdminModeration.tsx includes Reported Communities tab and community reports fetching
  const adminModerationPath = path.join(__dirname, '../../frontend/pages/admin/AdminModeration.tsx');
  assert.ok(fs.existsSync(adminModerationPath), "AdminModeration.tsx must exist");
  const adminModerationContent = fs.readFileSync(adminModerationPath, 'utf8');

  assert.ok(
    adminModerationContent.includes('community_reports') || adminModerationContent.includes('Reported Communities'),
    "AdminModeration.tsx must include a tab/section for Reported Communities"
  );

  assert.ok(
    adminModerationContent.includes('getCommunityReports') || adminModerationContent.includes('/admin/community-reports'),
    "AdminModeration.tsx must fetch community reports from backend"
  );

  console.log("✓ Community Reports Moderation tests passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
