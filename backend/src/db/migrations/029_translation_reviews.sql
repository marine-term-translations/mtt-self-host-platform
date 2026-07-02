-- Migration: 029_translation_reviews.sql
CREATE TABLE IF NOT EXISTS translation_reviews (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_id INTEGER NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action         TEXT NOT NULL CHECK(action IN ('approve', 'reject')),
    rejection_reason TEXT,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(translation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_translation_reviews_translation_id ON translation_reviews(translation_id);
