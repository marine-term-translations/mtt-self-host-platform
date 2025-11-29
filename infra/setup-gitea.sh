
#!/bin/bash
# Trigger Gitea setup via backend API

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"

echo "Please create the Gitea admin account manually via the web UI using the credentials in .env."
echo "After creating the account, generate an admin API token in Gitea and fill GITEA_ADMIN_TOKEN in .env."
echo "Then rerun this script to create the organization automatically."
curl -X POST "$BACKEND_URL/api/setup-gitea"
set -e

# Load environment variables from parent .env file
source "$(dirname "$0")/../.env"

# Create translations-data repo in Gitea for SQLite DB
GITEA_URL="http://localhost:3000"
GITEA_ADMIN_TOKEN="${GITEA_ADMIN_TOKEN:-YOUR_ADMIN_TOKEN_HERE}"
GITEA_ORG_NAME="${GITEA_ORG_NAME:-marine-term-translations}"

# Echo all environment variables used in the script
echo "GITEA_ORG_NAME: $GITEA_ORG_NAME"
echo "GITEA_URL: $GITEA_URL"
echo "GITEA_ADMIN_TOKEN: $GITEA_ADMIN_TOKEN"
echo "REPO_CLONE_PATH: $REPO_CLONE_PATH"
echo "REPO_URL: $REPO_URL"


echo "Creating translations-data repository in Gitea organization $GITEA_ORG_NAME..."
curl -sf -X POST "$GITEA_URL/api/v1/orgs/$GITEA_ORG_NAME/repos" \
	-H "Authorization: token ${GITEA_ADMIN_TOKEN}" \
	-H "Content-Type: application/json" \
	-d '{
		"name": "translations-data",
		"description": "Live SQLite database + assets for marine vocabulary translations",
		"private": false,
		"auto_init": true
	}' || echo "Repo may already exist, continuing..."

# Optionally, clone the repo and add schema.sql

# Set a valid clone path (relative to script location)
REPO_CLONE_PATH="$(dirname "$0")/../translation-data-repo"
REPO_URL="http://oauth2:${GITEA_ADMIN_TOKEN}@localhost:3000/${GITEA_ORG_NAME}/translations-data.git"

echo "REPO_CLONE_PATH: $REPO_CLONE_PATH"
echo "REPO_URL: $REPO_URL"

if [ ! -d "$REPO_CLONE_PATH" ]; then
	echo "Cloning translations-data repo locally..."
	git clone "$REPO_URL" "$REPO_CLONE_PATH"
fi

# Add schema.sql if not present
SCHEMA_FILE="$REPO_CLONE_PATH/schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
	echo "Adding schema.sql to repo..."
	cat > "$SCHEMA_FILE" <<'EOF'
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
    status         TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'rejected', 'merged')),
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

-- Generic activity / history table
CREATE TABLE user_activity (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user          TEXT    NOT NULL,
    action        TEXT    NOT NULL,  -- e.g. 'translation_created', 'translation_approved', 'appeal_opened', etc.
    term_id           INTEGER,
    term_field_id     INTEGER,
    translation_id    INTEGER,
    appeal_id         INTEGER,
    appeal_message_id INTEGER,
    extra             TEXT,  -- JSON string recommended
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user)          REFERENCES users(username)         ON DELETE CASCADE,
    FOREIGN KEY(term_id)       REFERENCES terms(id)               ON DELETE SET NULL,
    FOREIGN KEY(term_field_id) REFERENCES term_fields(id)         ON DELETE SET NULL,
    FOREIGN KEY(translation_id)REFERENCES translations(id)        ON DELETE SET NULL,
    FOREIGN KEY(appeal_id)     REFERENCES appeals(id)             ON DELETE SET NULL,
    FOREIGN KEY(appeal_message_id) REFERENCES appeal_messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_activity_user      ON user_activity(user);
CREATE INDEX idx_user_activity_created   ON user_activity(created_at DESC);
CREATE INDEX idx_user_activity_action    ON user_activity(action);
CREATE INDEX idx_user_activity_user_created ON user_activity(user, created_at DESC);

-- Reputation history (optional)
CREATE TABLE reputation_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user        TEXT NOT NULL,
    delta       INTEGER NOT NULL,          -- +5, -2, etc.
    reason      TEXT NOT NULL,             -- 'translation_approved', 'appeal_spam', etc.
    related_activity_id INTEGER,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY(related_activity_id) REFERENCES user_activity(id) ON DELETE SET NULL
);
CREATE INDEX idx_reputation_user ON reputation_events(user, created_at DESC);
EOF
	cd "$REPO_CLONE_PATH"
	git add schema.sql
	git commit -m "chore: add initial SQLite schema"
	git push
	cd -
fi

echo "Gitea translations-data repo setup complete. Backend should use this repo for SQLite translations.db."

