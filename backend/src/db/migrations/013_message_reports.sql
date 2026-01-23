-- Migration: Add message_reports table for reporting appeal messages
-- Created: 2026-01-23

CREATE TABLE IF NOT EXISTS message_reports (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    appeal_message_id   INTEGER NOT NULL REFERENCES appeal_messages(id) ON DELETE CASCADE,
    reported_by_id      INTEGER NOT NULL,
    reason              TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
    reviewed_by_id      INTEGER,
    admin_notes         TEXT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at         DATETIME,
    FOREIGN KEY(reported_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY(reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);
CREATE INDEX IF NOT EXISTS idx_message_reports_appeal_message ON message_reports(appeal_message_id);
