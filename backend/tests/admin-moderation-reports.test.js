const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { getDatabase } = require('../src/db/database');

function run() {
  console.log("Testing Admin Moderation Reports API, Admin Email Notifications & Report Numbers...");

  const adminRoutesPath = path.join(__dirname, '../src/routes/admin.routes.js');
  assert.ok(fs.existsSync(adminRoutesPath), "admin.routes.js file must exist");
  const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');

  // Test 1: Check SQL query in GET /admin/moderation/reports
  // Must select message_id as appeal_message_id, reported_by as reported_by_id, etc.
  assert.ok(
    adminRoutesContent.includes('mr.message_id AS appeal_message_id') ||
    adminRoutesContent.includes('mr.message_id as appeal_message_id'),
    "GET /admin/moderation/reports must query mr.message_id AS appeal_message_id (not non-existent mr.appeal_message_id column)"
  );

  assert.ok(
    adminRoutesContent.includes('mr.reported_by AS reported_by_id') ||
    adminRoutesContent.includes('mr.reported_by as reported_by_id'),
    "GET /admin/moderation/reports must query mr.reported_by AS reported_by_id (not non-existent mr.reported_by_id column)"
  );

  // Test 2: Check report number field included in reports response
  assert.ok(
    adminRoutesContent.includes('report_number') || adminRoutesContent.includes('RPT-'),
    "Moderation reports API response must include report_number or RPT- identifier"
  );

  // Test 3: Check notification helper module exists and notifies admins
  const adminNotificationServicePath = path.join(__dirname, '../src/services/adminNotification.service.js');
  assert.ok(fs.existsSync(adminNotificationServicePath), "adminNotification.service.js must exist");

  const notificationServiceContent = fs.readFileSync(adminNotificationServicePath, 'utf8');
  assert.ok(
    notificationServiceContent.includes('is_admin = 1') || notificationServiceContent.includes('is_admin'),
    "adminNotification.service.js must query admin users"
  );
  assert.ok(
    notificationServiceContent.includes('/admin/moderation'),
    "adminNotification.service.js must generate direct deep link to /admin/moderation"
  );

  // Test 4: Verify appeals.routes.js triggers admin notification on report and appeal creation
  const appealsRoutesPath = path.join(__dirname, '../src/routes/appeals.routes.js');
  const appealsRoutesContent = fs.readFileSync(appealsRoutesPath, 'utf8');
  assert.ok(
    appealsRoutesContent.includes('notifyAdmins'),
    "appeals.routes.js must notify admins when a message report or appeal is created"
  );

  console.log("✓ All Admin Moderation Reports API & Notification tests passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
