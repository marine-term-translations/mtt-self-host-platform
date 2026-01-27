PRAGMA foreign_keys = ON;

CREATE TABLE terms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uri         TEXT    NOT NULL UNIQUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_id   INTEGER REFERENCES sources(source_id) ON DELETE SET NULL
);

-- term_fields: field_role added to mark fields as 'label', 'reference', or 'translatable'
CREATE TABLE term_fields (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    term_id       INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    field_uri     TEXT    NOT NULL,
    field_role    TEXT    CHECK(field_role IN ('label', 'reference', 'translatable')),
    original_value TEXT   NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_id     INTEGER REFERENCES sources(source_id) ON DELETE SET NULL,
    UNIQUE(term_id, field_uri)
);

-- translations: Language-agnostic with 'original' status support
CREATE TABLE translations (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    term_field_id  INTEGER NOT NULL REFERENCES term_fields(id) ON DELETE CASCADE,
    language       TEXT    NOT NULL DEFAULT 'undefined',
    value          TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('original', 'draft', 'review', 'approved', 'rejected', 'merged')),
    source         TEXT,  -- e.g. 'rdf-ingest', 'user:123', 'ai:claude-3.5', 'merged'
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    modified_at    DATETIME,
    modified_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(term_field_id, language, status)
);

CREATE TABLE appeals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_id  INTEGER NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    opened_by_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opened_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at       DATETIME,
    status          TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'resolved')),
    resolution      TEXT,
    UNIQUE(translation_id, status)
);

CREATE TABLE appeal_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    appeal_id   INTEGER NOT NULL REFERENCES appeals(id) ON DELETE CASCADE,
    author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT UNIQUE NOT NULL,
    reputation  INTEGER DEFAULT 0,
    joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    extra       TEXT,
    is_admin    INTEGER DEFAULT 0,
    is_banned   INTEGER DEFAULT 0,
    ban_reason  TEXT
);

-- User language preferences
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_languages TEXT NOT NULL DEFAULT '["en"]',  -- JSON array of language codes
    visible_extra_languages TEXT NOT NULL DEFAULT '[]',  -- JSON array of additional languages to show
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_translations_lang   ON translations(language);
CREATE INDEX idx_translations_concept_status_lang ON translations(term_field_id, status, language);
CREATE INDEX idx_translations_source ON translations(source);
CREATE INDEX idx_appeals_status     ON appeals(status);
CREATE INDEX idx_term_fields_term_id ON term_fields(term_id);
CREATE INDEX idx_terms_source_id ON terms(source_id);
CREATE INDEX idx_term_fields_source_id ON term_fields(source_id);
CREATE INDEX idx_user_preferences_updated ON user_preferences(updated_at);

-- Generic activity / history table
CREATE TABLE user_activity (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    action        TEXT    NOT NULL,  -- e.g. 'translation_created', 'translation_approved', 'appeal_opened', etc.
    term_id           INTEGER,
    term_field_id     INTEGER,
    translation_id    INTEGER,
    appeal_id         INTEGER,
    appeal_message_id INTEGER,
    extra             TEXT,  -- JSON string recommended
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id)       REFERENCES users(id)               ON DELETE CASCADE,
    FOREIGN KEY(term_id)       REFERENCES terms(id)               ON DELETE SET NULL,
    FOREIGN KEY(term_field_id) REFERENCES term_fields(id)         ON DELETE SET NULL,
    FOREIGN KEY(translation_id)REFERENCES translations(id)        ON DELETE SET NULL,
    FOREIGN KEY(appeal_id)     REFERENCES appeals(id)             ON DELETE SET NULL,
    FOREIGN KEY(appeal_message_id) REFERENCES appeal_messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_activity_user      ON user_activity(user_id);
CREATE INDEX idx_user_activity_created   ON user_activity(created_at DESC);
CREATE INDEX idx_user_activity_action    ON user_activity(action);
CREATE INDEX idx_user_activity_user_created ON user_activity(user_id, created_at DESC);

-- Reputation history (optional)
CREATE TABLE reputation_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    delta       INTEGER NOT NULL,          -- +5, -2, etc.
    reason      TEXT NOT NULL,             -- 'translation_approved', 'appeal_spam', etc.
    related_activity_id INTEGER,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(related_activity_id) REFERENCES user_activity(id) ON DELETE SET NULL
);

CREATE INDEX idx_reputation_user ON reputation_events(user_id, created_at DESC);

-- Sources table (maintains backward compatibility with existing code)
CREATE TABLE sources (
    source_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL,
    source_type TEXT CHECK(source_type IN ('LDES', 'Static_file')) DEFAULT 'Static_file',
    graph_name  TEXT,
    translation_config TEXT CHECK(translation_config IS NULL OR json_valid(translation_config)),  -- JSON config for RDF type and predicate paths
    label_field_uri TEXT,  -- URI of the field used as label (e.g., http://schema.org/name)
    reference_field_uris TEXT CHECK(reference_field_uris IS NULL OR json_valid(reference_field_uris)),  -- JSON array of URIs used as reference fields
    translatable_field_uris TEXT CHECK(translatable_field_uris IS NULL OR json_valid(translatable_field_uris)),  -- JSON array of URIs that are translatable
    description TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sources_path ON sources(source_path);
CREATE INDEX idx_sources_graph ON sources(graph_name);
CREATE INDEX idx_sources_type ON sources(source_type);

-- Tasks table
CREATE TABLE tasks (
    task_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type   TEXT NOT NULL CHECK(task_type IN ('file_upload', 'ldes_sync', 'ldes_feed', 'triplestore_sync', 'harvest', 'other')),
    source_id   INTEGER REFERENCES sources(source_id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    metadata    TEXT,  -- JSON metadata
    logs        TEXT,  -- Task execution logs
    error_message TEXT,  -- Error details if task failed
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by  TEXT REFERENCES users(username) ON DELETE SET NULL,
    started_at  DATETIME,
    completed_at DATETIME
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_source ON tasks(source_id);

-- Task schedulers
CREATE TABLE task_schedulers (
    scheduler_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    task_type   TEXT NOT NULL CHECK(task_type IN ('file_upload', 'ldes_sync', 'ldes_feed', 'triplestore_sync', 'harvest', 'other')),
    source_id   INTEGER REFERENCES sources(source_id) ON DELETE CASCADE,
    schedule_config TEXT NOT NULL,  -- JSON: { "type": "cron", "expression": "0 0 * * *" } or { "type": "interval", "seconds": 3600 }
    enabled     INTEGER DEFAULT 1 CHECK(enabled IN (0, 1)),
    last_run    DATETIME,
    next_run    DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by  TEXT REFERENCES users(username) ON DELETE SET NULL
);

CREATE INDEX idx_task_schedulers_enabled ON task_schedulers(enabled);
CREATE INDEX idx_task_schedulers_next_run ON task_schedulers(next_run);

-- Message reports
CREATE TABLE message_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id  INTEGER NOT NULL REFERENCES appeal_messages(id) ON DELETE CASCADE,
    reported_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'dismissed')),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, reported_by)
);

CREATE INDEX idx_message_reports_status ON message_reports(status);

-- Auth providers for multi-provider authentication
CREATE TABLE auth_providers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         TEXT    NOT NULL, -- 'orcid', 'github', 'google', 'email', etc.
    provider_id      TEXT    NOT NULL, -- Provider-specific user ID (e.g., ORCID iD)
    email            TEXT,
    name             TEXT,
    avatar_url       TEXT,
    access_token     TEXT,
    refresh_token    TEXT,
    token_expires_at DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider),
    UNIQUE(provider, provider_id)
);

-- User statistics table for gamification
CREATE TABLE user_stats (
    user_id         INTEGER PRIMARY KEY,
    points          INTEGER DEFAULT 0,
    daily_streak    INTEGER DEFAULT 0,
    longest_streak  INTEGER DEFAULT 0,
    last_active_date DATE,
    translations_count INTEGER DEFAULT 0,
    reviews_count   INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_stats_points ON user_stats(points DESC);
CREATE INDEX idx_user_stats_streak ON user_stats(daily_streak DESC);

-- Daily challenges tracking
CREATE TABLE daily_challenges (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    challenge_date  DATE NOT NULL,
    challenge_type  TEXT NOT NULL CHECK(challenge_type IN ('translate_5', 'review_10', 'daily_login', 'streak_maintain')),
    target_count    INTEGER NOT NULL,
    current_count   INTEGER DEFAULT 0,
    completed       INTEGER DEFAULT 0 CHECK(completed IN (0, 1)),
    points_reward   INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, challenge_date, challenge_type)
);

CREATE INDEX idx_daily_challenges_user ON daily_challenges(user_id, challenge_date);
CREATE INDEX idx_daily_challenges_date ON daily_challenges(challenge_date);

-- Flow session tracking for analytics
CREATE TABLE flow_sessions (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL,
    started_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at                DATETIME,
    translations_completed  INTEGER DEFAULT 0,
    reviews_completed       INTEGER DEFAULT 0,
    points_earned           INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_flow_sessions_user ON flow_sessions(user_id, started_at DESC);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE translations_fts USING fts5(
    value,
    language,
    content='translations',
    content_rowid='id'
);

-- FTS5 triggers
CREATE TRIGGER translations_fts_insert AFTER INSERT ON translations BEGIN
    INSERT INTO translations_fts(rowid, value, language)
    VALUES (new.id, new.value, new.language);
END;

CREATE TRIGGER translations_fts_update AFTER UPDATE ON translations BEGIN
    UPDATE translations_fts
    SET value = new.value, language = new.language
    WHERE rowid = new.id;
END;

CREATE TRIGGER translations_fts_delete AFTER DELETE ON translations BEGIN
    DELETE FROM translations_fts WHERE rowid = old.id;
END;

-- View for term summary
CREATE VIEW term_summary AS
SELECT 
    t.id as term_id,
    t.uri,
    tf.id as term_field_id,
    tf.field_uri,
    tf.original_value,
    tr.id as translation_id,
    tr.language,
    tr.status,
    tr.value as translation_value,
    tr.source
FROM terms t
LEFT JOIN term_fields tf ON t.id = tf.term_id
LEFT JOIN translations tr ON tf.id = tr.term_field_id;
