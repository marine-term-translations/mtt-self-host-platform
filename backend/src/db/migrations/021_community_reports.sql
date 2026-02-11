-- Migration 021: Community Reporting System
-- Adds ability for users to report offensive/inappropriate communities

CREATE TABLE IF NOT EXISTS community_reports (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id        INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    reported_by_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason              TEXT NOT NULL CHECK(reason IN ('offensive', 'spam', 'inappropriate', 'harassment', 'other')),
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    reviewed_by_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at         DATETIME,
    resolution_notes    TEXT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, reported_by_id, status) -- Prevent duplicate pending reports from same user
);

CREATE INDEX idx_community_reports_community ON community_reports(community_id);
CREATE INDEX idx_community_reports_status ON community_reports(status);
CREATE INDEX idx_community_reports_reported_by ON community_reports(reported_by_id);
