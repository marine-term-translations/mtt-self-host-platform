const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Set test database path before requiring database module
const testDbDir = path.join(__dirname, '../scratch');
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}
const testDbPath = path.join(testDbDir, 'test_report_submission.db');
process.env.SQLITE_DB_PATH = testDbPath;

const { getDatabase } = require('../src/db/database');
const { notifyAdminsNewReport, notifyAdminsNewAppeal } = require('../src/services/adminNotification.service');

function run() {
  console.log("Testing Report & Appeal Submission end-to-end...");

  const db = getDatabase();

  // Ensure test table structure exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT,
      is_admin INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS appeal_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appeal_id INTEGER,
      author_id INTEGER,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS message_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES appeal_messages(id) ON DELETE CASCADE,
      reported_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by INTEGER,
      admin_notes TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, reported_by)
    );
    CREATE TABLE IF NOT EXISTS community_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_id INTEGER,
      reported_by_id INTEGER,
      reason TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS appeals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id INTEGER,
      opened_by_id INTEGER,
      status TEXT DEFAULT 'open',
      resolution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mail_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email TEXT,
      subject TEXT,
      body_html TEXT,
      body_text TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert test admin user
  db.prepare("INSERT OR IGNORE INTO users (id, username, email, is_admin) VALUES (999, 'admin_user', 'admin@example.com', 1)").run();
  db.prepare("INSERT OR IGNORE INTO users (id, username, email, is_admin) VALUES (888, 'regular_user', 'user@example.com', 0)").run();
  db.prepare("INSERT OR IGNORE INTO appeal_messages (id, appeal_id, author_id, message) VALUES (555, 1, 888, 'Inappropriate message')").run();

  // Test 1: Notify admins of new message report without error
  assert.doesNotThrow(() => {
    notifyAdminsNewReport({
      reportId: 100,
      type: 'message',
      reason: 'Spam or abuse',
      reporterUsername: 'regular_user'
    });
  }, "notifyAdminsNewReport must not throw any error when queueing mail");

  // Check mail_queue has queued item
  const queuedMail = db.prepare("SELECT * FROM mail_queue WHERE to_email = 'admin@example.com' ORDER BY id DESC LIMIT 1").get();
  assert.ok(queuedMail, "Mail queue must contain notification for admin");
  assert.ok(queuedMail.subject.includes('RPT-00100'), "Subject must contain report number RPT-00100");
  assert.ok(queuedMail.body_html.includes('/admin/moderation?reportId=100'), "Email body must contain direct link with reportId=100");

  // Test 2: Notify admins of new appeal without error
  assert.doesNotThrow(() => {
    notifyAdminsNewAppeal({
      appealId: 200,
      reason: 'Translation inaccuracy',
      authorUsername: 'regular_user'
    });
  }, "notifyAdminsNewAppeal must not throw any error when queueing mail");

  const queuedAppealMail = db.prepare("SELECT * FROM mail_queue WHERE to_email = 'admin@example.com' ORDER BY id DESC LIMIT 1").get();
  assert.ok(queuedAppealMail, "Mail queue must contain appeal notification for admin");
  assert.ok(queuedAppealMail.subject.includes('APL-00200'), "Subject must contain appeal number APL-00200");
  assert.ok(queuedAppealMail.body_html.includes('/admin/moderation?appealId=200'), "Email body must contain direct link with appealId=200");

  console.log("✓ Report & Appeal Submission end-to-end tests passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}
