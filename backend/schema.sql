PRAGMA foreign_keys = ON;

CREATE TABLE terms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uri         TEXT    NOT NULL UNIQUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE term_fields (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    term_id       INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    field_uri     TEXT    NOT NULL,
    field_term    TEXT    NOT NULL,
    original_value TEXT   NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(term_id, field_uri, original_value)
);

CREATE TABLE translations (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    term_field_id  INTEGER NOT NULL REFERENCES term_fields(id) ON DELETE CASCADE,
    language       TEXT    NOT NULL CHECK(language IN ('nl','fr','de','es','it','pt')),
    value          TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'rejected')),
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by     TEXT    NOT NULL,
    modified_at    DATETIME,
    modified_by    TEXT,
    reviewed_by    TEXT,
    UNIQUE(term_field_id, language)
);

CREATE TABLE appeals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_id  INTEGER NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    opened_by       TEXT    NOT NULL,
    opened_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at       DATETIME,
    status          TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'resolved')),
    resolution      TEXT,
    UNIQUE(translation_id, status)
);

CREATE TABLE appeal_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    appeal_id   INTEGER NOT NULL REFERENCES appeals(id) ON DELETE CASCADE,
    author      TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    username    TEXT PRIMARY KEY,
    reputation  INTEGER DEFAULT 0,
    joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    extra       TEXT
);

CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_translations_lang   ON translations(language);
CREATE INDEX idx_appeals_status     ON appeals(status);
CREATE INDEX idx_term_fields_term_id ON term_fields(term_id);
